CREATE SEQUENCE public.chamados_protocolo_seq START 1000;

CREATE TABLE public.chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo bigint NOT NULL UNIQUE DEFAULT nextval('public.chamados_protocolo_seq'),
  assunto text NOT NULL,
  descricao text,
  categoria text NOT NULL DEFAULT 'outros' CHECK (categoria IN ('camera_offline','qualidade_imagem','solicitacao_gravacao','acesso','financeiro','instalacao','manutencao','outros')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_atendimento','aguardando_cliente','resolvido','fechado')),
  canal text NOT NULL DEFAULT 'interno' CHECK (canal IN ('portal','telefone','whatsapp','interno')),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  camera_id uuid REFERENCES public.cameras(id) ON DELETE SET NULL,
  responsavel uuid,
  avaliacao integer CHECK (avaliacao BETWEEN 1 AND 5),
  prazo_sla timestamptz,
  aberto_por uuid,
  resolvido_em timestamptz,
  fechado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER SEQUENCE public.chamados_protocolo_seq OWNED BY public.chamados.protocolo;

CREATE TABLE public.chamado_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id uuid NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
  autor text NOT NULL DEFAULT 'equipe' CHECK (autor IN ('cliente','equipe','sistema')),
  user_id uuid,
  texto text NOT NULL,
  nota_interna boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.chamado_mensagens(chamado_id, created_at);
CREATE INDEX ON public.chamados(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamado_mensagens TO authenticated;
GRANT ALL ON public.chamados TO service_role;
GRANT ALL ON public.chamado_mensagens TO service_role;
GRANT USAGE ON SEQUENCE public.chamados_protocolo_seq TO authenticated, service_role;

ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamado_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipe gerencia chamados" ON public.chamados FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cliente ve chamados" ON public.chamados FOR SELECT TO authenticated
  USING (cliente_id IN (SELECT public.meus_clientes(auth.uid())));
CREATE POLICY "cliente abre chamado" ON public.chamados FOR INSERT TO authenticated
  WITH CHECK (cliente_id IN (SELECT public.meus_clientes(auth.uid())) AND canal = 'portal' AND responsavel IS NULL AND status = 'aberto' AND avaliacao IS NULL);
CREATE POLICY "cliente avalia chamado" ON public.chamados FOR UPDATE TO authenticated
  USING (cliente_id IN (SELECT public.meus_clientes(auth.uid())))
  WITH CHECK (cliente_id IN (SELECT public.meus_clientes(auth.uid())));

CREATE POLICY "equipe gerencia mensagens" ON public.chamado_mensagens FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cliente ve mensagens" ON public.chamado_mensagens FOR SELECT TO authenticated
  USING (NOT nota_interna AND chamado_id IN (SELECT id FROM public.chamados WHERE cliente_id IN (SELECT public.meus_clientes(auth.uid()))));
CREATE POLICY "cliente responde" ON public.chamado_mensagens FOR INSERT TO authenticated
  WITH CHECK (NOT nota_interna AND autor = 'cliente' AND user_id = auth.uid()
    AND chamado_id IN (SELECT id FROM public.chamados WHERE cliente_id IN (SELECT public.meus_clientes(auth.uid())) AND status <> 'fechado'));

CREATE OR REPLACE FUNCTION public.chamado_sla_horas(_p text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _p WHEN 'urgente' THEN 4 WHEN 'alta' THEN 8 WHEN 'media' THEN 24 ELSE 72 END
$$;

CREATE OR REPLACE FUNCTION public.chamados_antes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.prazo_sla := NEW.created_at + make_interval(hours => public.chamado_sla_horas(NEW.prioridade));
    NEW.aberto_por := COALESCE(NEW.aberto_por, auth.uid());
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
    -- cliente só pode avaliar um chamado resolvido, o que o fecha
    IF OLD.status <> 'resolvido' OR NEW.avaliacao IS NULL OR NEW.status <> 'fechado'
       OR NEW.assunto IS DISTINCT FROM OLD.assunto OR NEW.descricao IS DISTINCT FROM OLD.descricao
       OR NEW.categoria IS DISTINCT FROM OLD.categoria OR NEW.prioridade IS DISTINCT FROM OLD.prioridade
       OR NEW.canal IS DISTINCT FROM OLD.canal OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
       OR NEW.camera_id IS DISTINCT FROM OLD.camera_id OR NEW.responsavel IS DISTINCT FROM OLD.responsavel
       OR NEW.prazo_sla IS DISTINCT FROM OLD.prazo_sla OR NEW.protocolo IS DISTINCT FROM OLD.protocolo THEN
      RAISE EXCEPTION 'Você só pode avaliar chamados resolvidos.';
    END IF;
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    NEW.prazo_sla := OLD.created_at + make_interval(hours => public.chamado_sla_horas(NEW.prioridade));
  END IF;
  IF NEW.status = 'resolvido' AND OLD.status <> 'resolvido' THEN NEW.resolvido_em := now(); END IF;
  IF NEW.status = 'fechado' AND OLD.status <> 'fechado' THEN NEW.fechado_em := now(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER chamados_antes BEFORE INSERT OR UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.chamados_antes();

CREATE OR REPLACE FUNCTION public.chamados_depois() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rot jsonb := '{"aberto":"Aberto","em_atendimento":"Em atendimento","aguardando_cliente":"Aguardando cliente","resolvido":"Resolvido","fechado":"Fechado","baixa":"Baixa","media":"Média","alta":"Alta","urgente":"Urgente"}';
  nome text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO chamado_mensagens(chamado_id, autor, user_id, texto)
    VALUES (NEW.id, 'sistema', auth.uid(), 'Status alterado de ' || (rot->>OLD.status) || ' para ' || (rot->>NEW.status) || '.');
  END IF;
  IF NEW.avaliacao IS NOT NULL AND OLD.avaliacao IS NULL THEN
    INSERT INTO chamado_mensagens(chamado_id, autor, user_id, texto)
    VALUES (NEW.id, 'sistema', auth.uid(), 'Cliente avaliou o atendimento com nota ' || NEW.avaliacao || '.');
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    INSERT INTO chamado_mensagens(chamado_id, autor, user_id, texto)
    VALUES (NEW.id, 'sistema', auth.uid(), 'Prioridade alterada de ' || (rot->>OLD.prioridade) || ' para ' || (rot->>NEW.prioridade) || '. Prazo recalculado.');
  END IF;
  IF NEW.responsavel IS DISTINCT FROM OLD.responsavel THEN
    SELECT COALESCE(NULLIF(raw_user_meta_data->>'nome',''), email) INTO nome FROM auth.users WHERE id = NEW.responsavel;
    INSERT INTO chamado_mensagens(chamado_id, autor, user_id, texto)
    VALUES (NEW.id, 'sistema', auth.uid(), CASE WHEN NEW.responsavel IS NULL THEN 'Chamado sem responsável.' ELSE 'Responsável definido: ' || COALESCE(nome, 'equipe') || '.' END);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER chamados_depois AFTER UPDATE ON public.chamados FOR EACH ROW EXECUTE FUNCTION public.chamados_depois();
REVOKE EXECUTE ON FUNCTION public.chamados_antes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.chamados_depois() FROM PUBLIC, anon, authenticated;