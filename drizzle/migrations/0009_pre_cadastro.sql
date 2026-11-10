-- Pré-cadastro pelo link enviado pela Íris: dados completos no lead, convite de uso único e consentimentos (LGPD).

ALTER TABLE public.leads
 ADD COLUMN IF NOT EXISTS tipo text CHECK (tipo IN ('PF','PJ')),
 ADD COLUMN IF NOT EXISTS documento text,
 ADD COLUMN IF NOT EXISTS data_nascimento date,
 ADD COLUMN IF NOT EXISTS endereco text,
 ADD COLUMN IF NOT EXISTS cidade text,
 ADD COLUMN IF NOT EXISTS uf text,
 ADD COLUMN IF NOT EXISTS cameras integer CHECK (cameras BETWEEN 1 AND 200),
 ADD COLUMN IF NOT EXISTS periodo_visita text,
 ADD COLUMN IF NOT EXISTS consentimento_privacidade_em timestamptz,
 ADD COLUMN IF NOT EXISTS consentimento_marketing boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS pre_cadastro_em timestamptz,
 ADD COLUMN IF NOT EXISTS whatsapp_conversa_id uuid REFERENCES public.whatsapp_conversas(id);

ALTER TABLE public.clientes
 ADD COLUMN IF NOT EXISTS data_nascimento date,
 ADD COLUMN IF NOT EXISTS consentimento_marketing boolean NOT NULL DEFAULT false;

-- Convite de pré-cadastro: código aleatório, válido por 7 dias, uso único. Sem acesso direto pelo navegador:
-- o formulário público passa pelas funções do servidor.
CREATE TABLE public.lead_convites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Za-z0-9]{10,32}$'),
 lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 conversa_id uuid REFERENCES public.whatsapp_conversas(id),
 telefone text,
 expira_em timestamptz NOT NULL DEFAULT now() + interval '7 days',
 usado_em timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_convites TO authenticated;
GRANT ALL ON public.lead_convites TO service_role;
REVOKE ALL ON public.lead_convites FROM anon;
ALTER TABLE public.lead_convites ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_convites_equipe ON public.lead_convites FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- A Íris cria (ou reaproveita) o lead da conversa e um convite válido. O código vem do servidor (aleatório).
CREATE OR REPLACE FUNCTION public.whatsapp_convite_cadastro(_conversa uuid, _atendimento uuid, _codigo text, _nome text, _interesse text, _resumo text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.whatsapp_conversas; lid uuid; existente text;
BEGIN
 SELECT * INTO c FROM public.whatsapp_conversas WHERE id = _conversa FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Conversa não encontrada.'; END IF;
 lid := c.lead_id;
 IF lid IS NULL THEN
  INSERT INTO public.leads(nome, telefone, origem, etapa, interesse, observacoes, whatsapp_conversa_id)
  VALUES (left(coalesce(nullif(btrim(_nome), ''), nullif(c.nome, ''), c.telefone), 120), c.telefone, 'whatsapp', 'novo', left(nullif(btrim(_interesse), ''), 200), left(nullif(btrim(_resumo), ''), 2000), _conversa)
  RETURNING id INTO lid;
  UPDATE public.whatsapp_conversas SET lead_id = lid WHERE id = _conversa;
  INSERT INTO public.whatsapp_acoes(conversa_id, atendimento_id, acao, descricao, depois)
  VALUES (_conversa, _atendimento, 'criar_lead', 'Lead criado no Funil de vendas', jsonb_build_object('lead', lid, 'interesse', _interesse));
 ELSE
  UPDATE public.leads SET interesse = coalesce(left(nullif(btrim(_interesse), ''), 200), interesse) WHERE id = lid;
 END IF;
 SELECT codigo INTO existente FROM public.lead_convites WHERE lead_id = lid AND usado_em IS NULL AND expira_em > now() + interval '1 day' ORDER BY created_at DESC LIMIT 1;
 IF existente IS NOT NULL THEN RETURN existente; END IF;
 INSERT INTO public.lead_convites(codigo, lead_id, conversa_id, telefone) VALUES (_codigo, lid, _conversa, c.telefone);
 INSERT INTO public.whatsapp_acoes(conversa_id, atendimento_id, acao, descricao) VALUES (_conversa, _atendimento, 'enviar_link_cadastro', 'Link de pré-cadastro enviado');
 RETURN _codigo;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_convite_cadastro(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_convite_cadastro(uuid, uuid, text, text, text, text) TO service_role;

-- Dados públicos mínimos do convite para abrir o formulário (sem expor o lead).
CREATE OR REPLACE FUNCTION public.pre_cadastro_convite(_codigo text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('nome', l.nome, 'telefone', v.telefone, 'interesse', l.interesse,
   'situacao', CASE WHEN v.usado_em IS NOT NULL THEN 'usado' WHEN v.expira_em < now() THEN 'expirado' ELSE 'valido' END)
 FROM public.lead_convites v JOIN public.leads l ON l.id = v.lead_id WHERE v.codigo = _codigo
$$;
REVOKE ALL ON FUNCTION public.pre_cadastro_convite(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pre_cadastro_convite(text) TO service_role;

-- Grava o pré-cadastro numa transação: valida o convite e a maioridade, atualiza o lead, usa o convite,
-- registra a atividade e deixa a confirmação da Íris pronta para envio (retorna o id da mensagem, se houver).
CREATE OR REPLACE FUNCTION public.pre_cadastro_enviar(_codigo text, _dados jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.lead_convites; nasc date; mid uuid; v_nome text;
BEGIN
 SELECT * INTO v FROM public.lead_convites WHERE codigo = _codigo FOR UPDATE;
 IF v.id IS NULL THEN RAISE EXCEPTION 'Link de cadastro inválido.'; END IF;
 IF v.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Este link já foi usado.'; END IF;
 IF v.expira_em < now() THEN RAISE EXCEPTION 'Este link expirou. Peça um novo pelo WhatsApp.'; END IF;
 nasc := (_dados->>'data_nascimento')::date;
 IF nasc IS NULL OR nasc > (now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '18 years' THEN RAISE EXCEPTION 'O cadastro precisa ser feito por maior de 18 anos.'; END IF;
 IF NOT coalesce((_dados->>'aceite_privacidade')::boolean, false) THEN RAISE EXCEPTION 'É preciso aceitar a Política de Privacidade.'; END IF;
 v_nome := left(btrim(_dados->>'nome'), 120);
 UPDATE public.leads SET
  nome = v_nome, tipo = _dados->>'tipo', empresa = CASE WHEN _dados->>'tipo' = 'PJ' THEN left(btrim(_dados->>'nome'), 120) ELSE empresa END,
  documento = left(_dados->>'documento', 20), data_nascimento = nasc, email = left(_dados->>'email', 160),
  endereco = left(_dados->>'endereco', 300), cidade = left(_dados->>'cidade', 120), uf = left(_dados->>'uf', 2),
  interesse = left(coalesce(nullif(_dados->>'plano', ''), interesse), 200), cameras = nullif(_dados->>'cameras', '')::int,
  periodo_visita = left(_dados->>'periodo_visita', 40), consentimento_privacidade_em = now(),
  consentimento_marketing = coalesce((_dados->>'aceite_marketing')::boolean, false), pre_cadastro_em = now(),
  etapa = CASE WHEN etapa = 'novo' THEN 'contato' ELSE etapa END
 WHERE id = v.lead_id;
 UPDATE public.lead_convites SET usado_em = now() WHERE id = v.id;
 INSERT INTO public.atividades(lead_id, tipo, descricao) VALUES (v.lead_id, 'sistema', 'Pré-cadastro preenchido pelo link da Íris (WhatsApp)');
 IF v.conversa_id IS NOT NULL THEN
  INSERT INTO public.whatsapp_acoes(conversa_id, acao, descricao) VALUES (v.conversa_id, 'pre_cadastro', 'Pré-cadastro recebido pelo formulário');
  INSERT INTO public.whatsapp_mensagens(conversa_id, direcao, remetente, texto, status)
  VALUES (v.conversa_id, 'saida', 'ia', 'Recebi seu cadastro, ' || split_part(v_nome, ' ', 1) || '! 🎉 A equipe Horus vai analisar seus dados e entrar em contato para combinar a visita de avaliação. Se tiver alguma dúvida, é só me chamar por aqui.', 'pendente')
  RETURNING id INTO mid;
  UPDATE public.whatsapp_conversas SET ultima_mensagem = 'Pré-cadastro recebido', ultima_mensagem_em = now(), nao_lidas = nao_lidas + 1 WHERE id = v.conversa_id;
 END IF;
 RETURN mid;
END $$;
REVOKE ALL ON FUNCTION public.pre_cadastro_enviar(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pre_cadastro_enviar(text, jsonb) TO service_role;
