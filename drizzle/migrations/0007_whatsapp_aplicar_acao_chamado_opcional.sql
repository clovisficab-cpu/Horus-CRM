CREATE OR REPLACE FUNCTION public.whatsapp_aplicar_acao(_job uuid, _acao text, _texto text, _assunto text, _categoria text, _prioridade text, _chamado uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.whatsapp_bot_jobs; c public.whatsapp_conversas; mid uuid; ticket uuid; protocolo_n bigint; transcricao text; saida text := _texto;
BEGIN
 SELECT * INTO j FROM public.whatsapp_bot_jobs WHERE id=_job FOR UPDATE;
 IF j.resposta_id IS NOT NULL THEN RETURN j.resposta_id; END IF;
 SELECT wc.* INTO c FROM public.whatsapp_conversas wc JOIN public.whatsapp_mensagens wm ON wm.conversa_id=wc.id WHERE wm.id=j.mensagem_id FOR UPDATE OF wc;
 IF c.modo<>'bot' THEN UPDATE public.whatsapp_bot_jobs SET status='concluido' WHERE id=_job; RETURN NULL; END IF;
 IF _acao='transferir' OR (_acao IN ('abrir_chamado','adicionar') AND c.cliente_id IS NULL) THEN
 UPDATE public.whatsapp_conversas SET modo='humano' WHERE id=c.id;
 saida := 'Vou encaminhar sua conversa para a equipe Horus. Seu pedido ficou registrado.';
 ELSIF _acao='abrir_chamado' THEN
 INSERT INTO public.chamados(cliente_id,assunto,categoria,prioridade,canal,whatsapp_conversa_id) VALUES(c.cliente_id,left(coalesce(nullif(_assunto,''),'Atendimento WhatsApp'),200),_categoria,_prioridade,'whatsapp',c.id) RETURNING id,protocolo INTO ticket,protocolo_n;
 SELECT string_agg(remetente||': '||texto,E'\n' ORDER BY created_at) INTO transcricao FROM (SELECT remetente,texto,created_at FROM public.whatsapp_mensagens WHERE conversa_id=c.id ORDER BY created_at DESC LIMIT 30) t;
 INSERT INTO public.chamado_mensagens(chamado_id,autor,texto,nota_interna) VALUES(ticket,'sistema',left(coalesce(transcricao,''),4000),true);
 saida := 'Seu chamado foi aberto com o protocolo #'||protocolo_n||'. A equipe acompanhará sua solicitação.';
 ELSIF _acao='adicionar' THEN
 SELECT id,protocolo INTO ticket,protocolo_n FROM public.chamados WHERE id=_chamado AND cliente_id=c.cliente_id AND status NOT IN ('resolvido','fechado');
 IF ticket IS NULL THEN RAISE EXCEPTION 'Chamado aberto não encontrado para este cliente'; END IF;
 INSERT INTO public.chamado_mensagens(chamado_id,autor,texto,nota_interna) SELECT ticket,'cliente',texto,false FROM public.whatsapp_mensagens WHERE id=j.mensagem_id;
 saida := 'Informação adicionada ao chamado #'||protocolo_n||'.';
 END IF;
 INSERT INTO public.whatsapp_mensagens(conversa_id,direcao,remetente,texto,status) VALUES(c.id,'saida','ia',left(saida,4000),'pendente') RETURNING id INTO mid;
 UPDATE public.whatsapp_bot_jobs SET resposta_id=mid,status='respondido' WHERE id=_job;
 UPDATE public.whatsapp_conversas SET ultima_mensagem=left(saida,4000),ultima_mensagem_em=now() WHERE id=c.id;
 RETURN mid;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_aplicar_acao(uuid,text,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_aplicar_acao(uuid,text,text,text,text,text,uuid) TO service_role;