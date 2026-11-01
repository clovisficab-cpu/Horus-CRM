CREATE TABLE public.base_conhecimento (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pergunta text NOT NULL, resposta text NOT NULL, categoria text NOT NULL DEFAULT 'outros', publicada boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.base_conhecimento TO authenticated;
GRANT ALL ON public.base_conhecimento TO service_role;
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipe_conhecimento ON public.base_conhecimento FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TABLE public.chamados_resumos_ia (
 chamado_id uuid PRIMARY KEY REFERENCES public.chamados(id) ON DELETE CASCADE, resumo_ia text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chamados_resumos_ia TO authenticated;
GRANT ALL ON public.chamados_resumos_ia TO service_role;
ALTER TABLE public.chamados_resumos_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipe_resumo ON public.chamados_resumos_ia FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TABLE public.chamados_ia_estado (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), motivo text NOT NULL, tipo text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.chamados_ia_estado TO service_role;
ALTER TABLE public.chamados_ia_estado ENABLE ROW LEVEL SECURITY;