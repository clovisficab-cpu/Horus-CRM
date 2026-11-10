-- Íris: atendente com IA no WhatsApp (etapa 1).
-- Configuração, atendimentos (sessões com identificação), auditoria de ações, lote de mensagens e agenda técnica.

-- Configuração única, editável pela equipe no painel.
CREATE TABLE public.whatsapp_config (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 iris_ativa boolean NOT NULL DEFAULT true,
 -- Horário de atendimento humano por dia da semana (0 = domingo); dia sem entrada = fechado.
 horario jsonb NOT NULL DEFAULT '{"1":["08:00","18:00"],"2":["08:00","18:00"],"3":["08:00","18:00"],"4":["08:00","18:00"],"5":["08:00","18:00"],"6":["08:00","12:00"]}',
 plantao_telefone text,
 endereco_aprovacao_humana boolean NOT NULL DEFAULT true,
 limite_mensagens_minuto integer NOT NULL DEFAULT 8 CHECK (limite_mensagens_minuto BETWEEN 1 AND 60),
 -- Horários de início das visitas técnicas (hora local) e duração de cada visita.
 visita_horarios text[] NOT NULL DEFAULT '{08:00,10:00,14:00,16:00}',
 visita_duracao_min integer NOT NULL DEFAULT 120 CHECK (visita_duracao_min BETWEEN 30 AND 480),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.whatsapp_config DEFAULT VALUES;
GRANT SELECT, UPDATE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;
REVOKE ALL ON public.whatsapp_config FROM anon;
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_config_ler ON public.whatsapp_config FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY whatsapp_config_editar ON public.whatsapp_config FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

ALTER TABLE public.whatsapp_conversas
 ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS resumo_transferencia text,
 ADD COLUMN IF NOT EXISTS transferida_em timestamptz,
 ADD COLUMN IF NOT EXISTS opt_out_avisos boolean NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_mensagens
 ADD COLUMN IF NOT EXISTS tempo_resposta_ms integer,
 ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'texto';

ALTER TABLE public.whatsapp_bot_jobs ADD COLUMN IF NOT EXISTS iniciado_em timestamptz;

-- Atendimento: uma "sessão" da conversa. A identificação do cliente vale só para o atendimento aberto.
CREATE TABLE public.whatsapp_atendimentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id),
 cliente_id uuid REFERENCES public.clientes(id),
 identificado_em timestamptz,
 falhas_identificacao integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','encerrado','encerrado_inatividade','transferido')),
 estado text CHECK (estado IN ('aguardando_cliente','resolvida')),
 assunto text,
 resumo text,
 atendido_por text NOT NULL DEFAULT 'iris' CHECK (atendido_por IN ('iris','humano')),
 tentativas_problema integer NOT NULL DEFAULT 0,
 acao_pendente jsonb,
 acao_pendente_em timestamptz,
 iniciado_em timestamptz NOT NULL DEFAULT now(),
 ultima_interacao_em timestamptz NOT NULL DEFAULT now(),
 encerrado_em timestamptz
);
CREATE UNIQUE INDEX whatsapp_atendimento_aberto ON public.whatsapp_atendimentos(conversa_id) WHERE status = 'aberto';
GRANT SELECT ON public.whatsapp_atendimentos TO authenticated;
GRANT ALL ON public.whatsapp_atendimentos TO service_role;
REVOKE ALL ON public.whatsapp_atendimentos FROM anon;
ALTER TABLE public.whatsapp_atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_atendimentos_equipe ON public.whatsapp_atendimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Auditoria: toda ação executada pela Íris (o quê, quando, antes/depois, conversa).
CREATE TABLE public.whatsapp_acoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id),
 atendimento_id uuid REFERENCES public.whatsapp_atendimentos(id),
 cliente_id uuid REFERENCES public.clientes(id),
 acao text NOT NULL,
 descricao text NOT NULL,
 antes jsonb,
 depois jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_acoes_conversa ON public.whatsapp_acoes(conversa_id, created_at);
GRANT SELECT ON public.whatsapp_acoes TO authenticated;
GRANT ALL ON public.whatsapp_acoes TO service_role;
REVOKE ALL ON public.whatsapp_acoes FROM anon;
ALTER TABLE public.whatsapp_acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_acoes_equipe ON public.whatsapp_acoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Reivindica de uma vez todas as mensagens pendentes da conversa (agrupamento de mensagens seguidas).
-- Não reivindica se a última mensagem do cliente chegou há menos de _espera_ms (o cliente ainda está digitando)
-- ou se já há um lote em processamento recente. O bloqueio da conversa impede dois lotes ao mesmo tempo.
CREATE OR REPLACE FUNCTION public.whatsapp_reivindicar_lote(_conversa uuid, _espera_ms integer) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ultima timestamptz;
BEGIN
 PERFORM 1 FROM public.whatsapp_conversas WHERE id = _conversa FOR UPDATE;
 SELECT max(created_at) INTO ultima FROM public.whatsapp_mensagens WHERE conversa_id = _conversa AND direcao = 'entrada';
 IF ultima IS NOT NULL AND ultima > now() - make_interval(secs => _espera_ms / 1000.0) THEN RETURN; END IF;
 IF EXISTS (SELECT 1 FROM public.whatsapp_bot_jobs j JOIN public.whatsapp_mensagens m ON m.id = j.mensagem_id
            WHERE m.conversa_id = _conversa AND j.status = 'processando' AND j.iniciado_em > now() - interval '60 seconds') THEN RETURN; END IF;
 RETURN QUERY
 UPDATE public.whatsapp_bot_jobs j SET status = 'processando', iniciado_em = now()
 FROM public.whatsapp_mensagens m
 WHERE m.id = j.mensagem_id AND m.conversa_id = _conversa AND j.status = 'pendente'
 RETURNING j.id;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_reivindicar_lote(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_reivindicar_lote(uuid, integer) TO service_role;

-- Registra as respostas da Íris para um lote, numa transação. Se um humano assumiu nesse meio-tempo, não responde.
CREATE OR REPLACE FUNCTION public.whatsapp_registrar_resposta(_conversa uuid, _jobs uuid[], _textos text[], _tempo_ms integer, _transferir boolean, _resumo text, _aviso text)
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_conversas; ids uuid[] := '{}'; mid uuid; t text; primeira boolean := true;
BEGIN
 SELECT * INTO c FROM public.whatsapp_conversas WHERE id = _conversa FOR UPDATE;
 IF c.modo <> 'bot' THEN
  UPDATE public.whatsapp_bot_jobs SET status = 'concluido', erro = coalesce(_aviso, 'Conversa com atendente humano; Íris em silêncio.') WHERE id = ANY(_jobs);
  RETURN ids;
 END IF;
 FOREACH t IN ARRAY coalesce(_textos, '{}') LOOP
  CONTINUE WHEN btrim(t) = '';
  INSERT INTO public.whatsapp_mensagens(conversa_id, direcao, remetente, texto, status, tempo_resposta_ms)
  VALUES (_conversa, 'saida', 'ia', left(t, 4000), 'pendente', CASE WHEN primeira THEN _tempo_ms END) RETURNING id INTO mid;
  ids := ids || mid; primeira := false;
 END LOOP;
 UPDATE public.whatsapp_bot_jobs SET status = 'concluido', resposta_id = ids[1], erro = _aviso WHERE id = ANY(_jobs);
 IF _transferir THEN
  UPDATE public.whatsapp_conversas SET modo = 'humano', resumo_transferencia = left(_resumo, 2000), transferida_em = now() WHERE id = _conversa;
  UPDATE public.whatsapp_atendimentos SET status = 'transferido', atendido_por = 'humano', resumo = left(_resumo, 2000) WHERE conversa_id = _conversa AND status = 'aberto';
 END IF;
 IF array_length(ids, 1) > 0 THEN
  UPDATE public.whatsapp_conversas SET ultima_mensagem = left(_textos[array_length(_textos, 1)], 4000), ultima_mensagem_em = now() WHERE id = _conversa;
 END IF;
 RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_registrar_resposta(uuid, uuid[], text[], integer, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_registrar_resposta(uuid, uuid[], text[], integer, boolean, text, text) TO service_role;

-- Agenda técnica: técnicos livres num intervalo (sem ordem agendada/em execução que se sobreponha).
CREATE OR REPLACE FUNCTION public.whatsapp_tecnico_livre(_inicio timestamptz, _fim timestamptz, _preferido uuid DEFAULT NULL, _ignorar uuid DEFAULT NULL) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT r.user_id FROM public.user_roles r
 WHERE r.role = 'tecnico'
   AND NOT EXISTS (
     SELECT 1 FROM public.ordens_servico o, public.whatsapp_config cfg
     WHERE o.tecnico_id = r.user_id AND o.status IN ('agendada','em_execucao') AND o.id IS DISTINCT FROM _ignorar
       AND o.agendada_em < _fim AND o.agendada_em + make_interval(mins => cfg.visita_duracao_min) > _inicio)
 ORDER BY (r.user_id = _preferido) DESC NULLS LAST, r.user_id
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.whatsapp_tecnico_livre(timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_tecnico_livre(timestamptz, timestamptz, uuid, uuid) TO service_role;

-- Um início de visita é válido se cai num dos horários configurados, num dia com atendimento, dentro do expediente,
-- a partir de amanhã e em até 30 dias (fuso de São Paulo).
CREATE OR REPLACE FUNCTION public.whatsapp_horario_valido(_inicio timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT coalesce((
  SELECT to_char(l, 'HH24:MI') = ANY(cfg.visita_horarios)
     AND l::date BETWEEN (now() AT TIME ZONE 'America/Sao_Paulo')::date + 1 AND (now() AT TIME ZONE 'America/Sao_Paulo')::date + 30
     AND cfg.horario ? extract(dow FROM l)::int::text
     AND l::time >= (cfg.horario -> extract(dow FROM l)::int::text ->> 0)::time
     AND l::time + make_interval(mins => cfg.visita_duracao_min) <= (cfg.horario -> extract(dow FROM l)::int::text ->> 1)::time
  FROM public.whatsapp_config cfg, LATERAL (SELECT _inicio AT TIME ZONE 'America/Sao_Paulo' AS l) x WHERE cfg.id), false)
$$;
REVOKE ALL ON FUNCTION public.whatsapp_horario_valido(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_horario_valido(timestamptz) TO service_role;

-- Horários livres para visita nos próximos dias (a partir de amanhã).
CREATE OR REPLACE FUNCTION public.whatsapp_horarios_visita(_dias integer DEFAULT 7, _limite integer DEFAULT 6) RETURNS SETOF timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT ini FROM public.whatsapp_config cfg,
  LATERAL generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1, (now() AT TIME ZONE 'America/Sao_Paulo')::date + least(greatest(_dias, 1), 30), interval '1 day') d,
  LATERAL unnest(cfg.visita_horarios) h,
  LATERAL (SELECT ((d::date + h::time) AT TIME ZONE 'America/Sao_Paulo') AS ini) x
 WHERE cfg.id AND public.whatsapp_horario_valido(ini)
   AND public.whatsapp_tecnico_livre(ini, ini + make_interval(mins => cfg.visita_duracao_min)) IS NOT NULL
 ORDER BY ini LIMIT least(greatest(_limite, 1), 20)
$$;
REVOKE ALL ON FUNCTION public.whatsapp_horarios_visita(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_horarios_visita(integer, integer) TO service_role;

-- Agenda, reagenda ou cancela uma visita do cliente identificado, com auditoria, numa transação.
-- _ordem NULL = nova visita. _inicio NULL = cancelar. O cliente vem sempre da sessão identificada no servidor.
CREATE OR REPLACE FUNCTION public.whatsapp_visita(_cliente uuid, _conversa uuid, _atendimento uuid, _ordem uuid, _inicio timestamptz, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg public.whatsapp_config; o public.ordens_servico; tec uuid; novo uuid; antes jsonb; depois jsonb; tecnico_nome text;
BEGIN
 IF _cliente IS NULL THEN RAISE EXCEPTION 'Cliente não identificado.'; END IF;
 SELECT * INTO cfg FROM public.whatsapp_config WHERE id;
 PERFORM pg_advisory_xact_lock(hashtext('agenda_tecnica'));
 IF _ordem IS NOT NULL THEN
  SELECT * INTO o FROM public.ordens_servico WHERE id = _ordem AND cliente_id = _cliente AND status = 'agendada' FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Visita agendada não encontrada para este cliente.'; END IF;
  antes := jsonb_build_object('agendada_em', o.agendada_em, 'status', o.status);
 END IF;
 IF _inicio IS NULL THEN
  IF _ordem IS NULL THEN RAISE EXCEPTION 'Informe a visita a cancelar.'; END IF;
  UPDATE public.ordens_servico SET status = 'cancelada' WHERE id = _ordem;
  depois := jsonb_build_object('status', 'cancelada');
  INSERT INTO public.whatsapp_acoes(conversa_id, atendimento_id, cliente_id, acao, descricao, antes, depois)
  VALUES (_conversa, _atendimento, _cliente, 'cancelar_visita', 'Visita técnica cancelada a pedido do cliente', antes, depois);
  RETURN jsonb_build_object('ordem', _ordem, 'status', 'cancelada');
 END IF;
 IF NOT public.whatsapp_horario_valido(_inicio) THEN RAISE EXCEPTION 'Horário indisponível.'; END IF;
 tec := public.whatsapp_tecnico_livre(_inicio, _inicio + make_interval(mins => cfg.visita_duracao_min), o.tecnico_id, _ordem);
 IF tec IS NULL THEN RAISE EXCEPTION 'Horário indisponível.'; END IF;
 IF _ordem IS NULL THEN
  INSERT INTO public.ordens_servico(tipo, cliente_id, tecnico_id, agendada_em, instrucoes)
  VALUES ('manutencao', _cliente, tec, _inicio, left('Agendada pela Íris (WhatsApp): ' || coalesce(_motivo, ''), 1000)) RETURNING id INTO novo;
 ELSE
  UPDATE public.ordens_servico SET agendada_em = _inicio, tecnico_id = tec WHERE id = _ordem;
  novo := _ordem;
 END IF;
 SELECT split_part(coalesce(nullif(raw_user_meta_data->>'nome', ''), 'Técnico'), ' ', 1) INTO tecnico_nome FROM auth.users WHERE id = tec;
 depois := jsonb_build_object('agendada_em', _inicio, 'status', 'agendada');
 INSERT INTO public.whatsapp_acoes(conversa_id, atendimento_id, cliente_id, acao, descricao, antes, depois)
 VALUES (_conversa, _atendimento, _cliente, CASE WHEN _ordem IS NULL THEN 'agendar_visita' ELSE 'reagendar_visita' END,
         CASE WHEN _ordem IS NULL THEN 'Visita técnica agendada' ELSE 'Visita técnica reagendada' END, antes, depois);
 RETURN jsonb_build_object('ordem', novo, 'agendada_em', _inicio, 'tecnico', coalesce(tecnico_nome, 'Técnico'));
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_visita(uuid, uuid, uuid, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_visita(uuid, uuid, uuid, uuid, timestamptz, text) TO service_role;

-- Abre chamado para o cliente identificado, com transcrição interna e auditoria, numa transação.
CREATE OR REPLACE FUNCTION public.whatsapp_abrir_chamado(_cliente uuid, _conversa uuid, _atendimento uuid, _assunto text, _descricao text, _categoria text, _prioridade text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ticket uuid; protocolo_n bigint; transcricao text;
BEGIN
 IF _cliente IS NULL THEN RAISE EXCEPTION 'Cliente não identificado.'; END IF;
 INSERT INTO public.chamados(cliente_id, assunto, descricao, categoria, prioridade, canal, whatsapp_conversa_id)
 VALUES (_cliente, left(coalesce(nullif(btrim(_assunto), ''), 'Atendimento WhatsApp'), 200), left(_descricao, 4000), _categoria, _prioridade, 'whatsapp', _conversa)
 RETURNING id, protocolo INTO ticket, protocolo_n;
 SELECT string_agg(remetente || ': ' || texto, E'\n' ORDER BY created_at) INTO transcricao
 FROM (SELECT remetente, texto, created_at FROM public.whatsapp_mensagens WHERE conversa_id = _conversa ORDER BY created_at DESC LIMIT 30) t;
 INSERT INTO public.chamado_mensagens(chamado_id, autor, texto, nota_interna) VALUES (ticket, 'sistema', left('Conversa no WhatsApp (Íris):' || E'\n' || coalesce(transcricao, ''), 4000), true);
 INSERT INTO public.whatsapp_acoes(conversa_id, atendimento_id, cliente_id, acao, descricao, depois)
 VALUES (_conversa, _atendimento, _cliente, 'abrir_chamado', 'Chamado #' || protocolo_n || ' aberto', jsonb_build_object('chamado', ticket, 'protocolo', protocolo_n, 'categoria', _categoria, 'prioridade', _prioridade));
 RETURN jsonb_build_object('chamado', ticket, 'protocolo', protocolo_n);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_abrir_chamado(uuid, uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_abrir_chamado(uuid, uuid, uuid, text, text, text, text) TO service_role;

-- Chamados abertos do cliente, com o primeiro nome do responsável e as visitas agendadas.
CREATE OR REPLACE FUNCTION public.whatsapp_resumo_cliente(_cliente uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object(
  'chamados', coalesce((SELECT jsonb_agg(jsonb_build_object('protocolo', c.protocolo, 'assunto', c.assunto, 'status', c.status, 'aberto_em', c.created_at, 'previsao', c.prazo_sla,
      'responsavel', (SELECT split_part(coalesce(nullif(u.raw_user_meta_data->>'nome', ''), 'Equipe'), ' ', 1) FROM auth.users u WHERE u.id = c.responsavel)) ORDER BY c.created_at DESC)
    FROM public.chamados c WHERE c.cliente_id = _cliente AND c.status NOT IN ('resolvido','fechado')), '[]'),
  'visitas', coalesce((SELECT jsonb_agg(jsonb_build_object('agendada_em', o.agendada_em, 'tipo', o.tipo,
      'tecnico', (SELECT split_part(coalesce(nullif(u.raw_user_meta_data->>'nome', ''), 'Técnico'), ' ', 1) FROM auth.users u WHERE u.id = o.tecnico_id)) ORDER BY o.agendada_em, o.id)
    FROM public.ordens_servico o WHERE o.cliente_id = _cliente AND o.status = 'agendada'), '[]'))
$$;
REVOKE ALL ON FUNCTION public.whatsapp_resumo_cliente(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_resumo_cliente(uuid) TO service_role;
