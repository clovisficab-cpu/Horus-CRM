REVOKE ALL ON public.ordens_servico FROM anon;
REVOKE ALL ON FUNCTION public.ordens_servico_antes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ordens_servico_depois() FROM PUBLIC, anon, authenticated;