CREATE TABLE public.whatsapp_conversas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), telefone text NOT NULL UNIQUE, nome text NOT NULL DEFAULT '', cliente_id uuid REFERENCES public.clientes(id), modo text NOT NULL DEFAULT 'bot' CHECK (modo IN ('bot','humano')), nao_lidas integer NOT NULL DEFAULT 0 CHECK (nao_lidas >= 0), ultima_mensagem text, ultima_mensagem_em timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_conversas TO authenticated;
GRANT ALL ON public.whatsapp_conversas TO service_role;
REVOKE ALL ON public.whatsapp_conversas FROM anon;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_conversas_equipe ON public.whatsapp_conversas FOR ALL TO authenticated USING(public.is_staff(auth.uid())) WITH CHECK(public.is_staff(auth.uid()));
CREATE TABLE public.whatsapp_mensagens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversa_id uuid NOT NULL REFERENCES public.whatsapp_conversas(id), direcao text NOT NULL CHECK(direcao IN ('entrada','saida')), remetente text NOT NULL CHECK(remetente IN ('cliente','ia','atendente','sistema')), texto text NOT NULL, id_externo text UNIQUE, status text NOT NULL DEFAULT 'recebida', erro text, chamado_mensagem_id uuid UNIQUE REFERENCES public.chamado_mensagens(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_mensagens TO authenticated;
GRANT ALL ON public.whatsapp_mensagens TO service_role;
REVOKE ALL ON public.whatsapp_mensagens FROM anon;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_mensagens_equipe ON public.whatsapp_mensagens FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE INDEX whatsapp_mensagens_conversa ON public.whatsapp_mensagens(conversa_id,created_at);
CREATE TABLE public.whatsapp_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), delivery_id text NOT NULL UNIQUE, event text NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, processing_error text
);
GRANT SELECT ON public.whatsapp_webhook_events TO authenticated;
GRANT ALL ON public.whatsapp_webhook_events TO service_role;
REVOKE ALL ON public.whatsapp_webhook_events FROM anon;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_inbox_equipe ON public.whatsapp_webhook_events FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE TABLE public.whatsapp_bot_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mensagem_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_mensagens(id), status text NOT NULL DEFAULT 'pendente', erro text, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.whatsapp_bot_jobs TO authenticated;
GRANT ALL ON public.whatsapp_bot_jobs TO service_role;
REVOKE ALL ON public.whatsapp_bot_jobs FROM anon;
ALTER TABLE public.whatsapp_bot_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_jobs_equipe ON public.whatsapp_bot_jobs FOR SELECT TO authenticated USING(public.is_staff(auth.uid()));
CREATE TABLE public.whatsapp_ia_estado (id boolean PRIMARY KEY DEFAULT true CHECK(id), motivo text NOT NULL, tipo text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.whatsapp_ia_estado TO service_role;
REVOKE ALL ON public.whatsapp_ia_estado FROM anon, authenticated;
ALTER TABLE public.whatsapp_ia_estado ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.whatsapp_receber(_telefone text, _nome text, _texto text, _externo text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; mid uuid; vinculo uuid;
BEGIN
 SELECT id INTO mid FROM public.whatsapp_mensagens WHERE id_externo=_externo;
 IF mid IS NOT NULL THEN RETURN mid; END IF;
 SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] ELSE NULL END INTO vinculo FROM public.clientes WHERE regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')=_telefone OR regexp_replace(coalesce(telefone,''),'[^0-9]','','g')=_telefone OR ('55'||regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g'))=_telefone OR ('55'||regexp_replace(coalesce(telefone,''),'[^0-9]','','g'))=_telefone;
 INSERT INTO public.whatsapp_conversas(telefone,nome,cliente_id) VALUES (_telefone,_nome,vinculo) ON CONFLICT(telefone) DO UPDATE SET telefone=EXCLUDED.telefone RETURNING id INTO cid;
 INSERT INTO public.whatsapp_mensagens(conversa_id,direcao,remetente,texto,id_externo,status) VALUES(cid,'entrada','cliente',_texto,_externo,'recebida') ON CONFLICT(id_externo) DO NOTHING RETURNING id INTO mid;
 IF mid IS NULL THEN SELECT id INTO mid FROM public.whatsapp_mensagens WHERE id_externo=_externo; RETURN mid; END IF;
 UPDATE public.whatsapp_conversas SET nao_lidas=nao_lidas+1,ultima_mensagem=_texto,ultima_mensagem_em=now(),cliente_id=coalesce(cliente_id,vinculo),nome=CASE WHEN nome='' THEN _nome ELSE nome END WHERE id=cid;
 INSERT INTO public.whatsapp_bot_jobs(mensagem_id) SELECT mid FROM public.whatsapp_conversas WHERE id=cid AND modo='bot' ON CONFLICT DO NOTHING;
 RETURN mid;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_receber(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_receber(text,text,text,text) TO service_role;