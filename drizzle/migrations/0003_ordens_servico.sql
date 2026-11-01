CREATE TABLE public.ordens_servico (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tipo text NOT NULL DEFAULT 'manutencao' CHECK (tipo IN ('instalacao','manutencao','retirada','vistoria')),
 status text NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada','em_execucao','concluida','cancelada')),
 cliente_id uuid NOT NULL REFERENCES public.clientes(id),
 chamado_id uuid REFERENCES public.chamados(id),
 tecnico_id uuid NOT NULL,
 agendada_em timestamptz NOT NULL,
 endereco text NOT NULL DEFAULT '',
 instrucoes text,
 relatorio_tecnico text,
 concluida_em timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipe_ordens ON public.ordens_servico FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX ordens_servico_agenda ON public.ordens_servico(agendada_em);
CREATE INDEX ordens_servico_tecnico ON public.ordens_servico(tecnico_id);
CREATE FUNCTION public.ordens_servico_antes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_staff(NEW.tecnico_id) THEN RAISE EXCEPTION 'Selecione um usuário da equipe como técnico.'; END IF;
 IF NEW.chamado_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.chamados WHERE id = NEW.chamado_id AND cliente_id = NEW.cliente_id) THEN RAISE EXCEPTION 'O chamado deve pertencer ao cliente da ordem.'; END IF;
 IF TG_OP = 'INSERT' AND btrim(NEW.endereco) = '' THEN
 SELECT coalesce(endereco, '') INTO NEW.endereco FROM public.clientes WHERE id = NEW.cliente_id;
 END IF;
 IF NEW.status = 'concluida' THEN
 IF btrim(coalesce(NEW.relatorio_tecnico,'')) = '' THEN RAISE EXCEPTION 'Informe o relatório do técnico para concluir.'; END IF;
 IF TG_OP = 'INSERT' THEN NEW.concluida_em := now();
 ELSIF OLD.status <> 'concluida' THEN NEW.concluida_em := now();
 ELSE NEW.concluida_em := OLD.concluida_em;
 END IF;
 ELSE NEW.concluida_em := NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ordens_servico_validar BEFORE INSERT OR UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.ordens_servico_antes();
CREATE FUNCTION public.ordens_servico_depois() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mensagem text;
BEGIN
 IF NEW.status <> 'concluida' THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN IF OLD.status = 'concluida' THEN RETURN NEW; END IF; END IF;
 mensagem := 'Ordem de serviço concluída (' || CASE NEW.tipo WHEN 'instalacao' THEN 'instalação' WHEN 'manutencao' THEN 'manutenção' ELSE NEW.tipo END || '). Relatório do técnico: ' || NEW.relatorio_tecnico;
 INSERT INTO public.atividades(cliente_id,tipo,descricao,autor) VALUES (NEW.cliente_id,'visita',mensagem,auth.uid());
 IF NEW.chamado_id IS NOT NULL THEN
 INSERT INTO public.chamado_mensagens(chamado_id,autor,user_id,texto,nota_interna) VALUES (NEW.chamado_id,'sistema',auth.uid(),mensagem,false);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ordens_servico_registrar AFTER INSERT OR UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.ordens_servico_depois();