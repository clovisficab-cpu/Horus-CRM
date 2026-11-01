-- Horus Videomonitoramento — criação completa do banco (Supabase)
-- Cole este arquivo inteiro no Supabase: SQL Editor → New query → Run.
-- Gerado a partir de drizzle/migrations (0000 a 0007).

-- ===== drizzle/migrations/0000_migration.sql =====

create type public.app_role as enum ('admin','atendente','tecnico','cliente');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','atendente','tecnico'))
$$;

create or replace function public.sistema_tem_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.sistema_tem_admin() to anon, authenticated;

create policy "ver proprios papeis" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin gerencia papeis" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- primeiro usuário vira admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- clientes
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'PF' check (tipo in ('PF','PJ')),
  documento text,
  email text, telefone text, whatsapp text,
  endereco text, cidade text, uf text,
  status text not null default 'ativo' check (status in ('ativo','suspenso','inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_clientes before update on public.clientes for each row execute function public.touch_updated_at();

create table public.cliente_usuarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (cliente_id, user_id)
);

create or replace function public.meus_clientes(_user_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select cliente_id from public.cliente_usuarios where user_id = _user_id
$$;

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  mensalidade numeric(10,2) not null default 0,
  limite_cameras int not null default 4,
  dias_gravacao int not null default 7,
  recursos text[] not null default '{}',
  destaque boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  plano_id uuid references public.planos(id) on delete set null,
  valor_mensal numeric(10,2) not null default 0,
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 31),
  status text not null default 'ativo' check (status in ('ativo','suspenso','cancelado')),
  inicio date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  contrato_id uuid references public.contratos(id) on delete set null,
  referencia text not null,
  valor numeric(10,2) not null default 0,
  vencimento date not null,
  pago_em date,
  status text not null default 'em_aberto' check (status in ('em_aberto','pago','vencido','cancelado')),
  created_at timestamptz not null default now()
);

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  local text,
  cliente_id uuid references public.clientes(id) on delete set null,
  tipo_stream text not null default 'hls' check (tipo_stream in ('hls','mjpeg','iframe','imagem')),
  stream_url text,
  imagem_capa text,
  publica boolean not null default false,
  status text not null default 'online' check (status in ('online','offline','manutencao')),
  marca text, ip text,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text, telefone text, email text,
  origem text not null default 'site' check (origem in ('site','whatsapp','indicacao','telefone')),
  etapa text not null default 'novo' check (etapa in ('novo','contato','visita','proposta','negociacao','ganho','perdido')),
  interesse text,
  valor_estimado numeric(10,2),
  responsavel uuid,
  observacoes text,
  cliente_id uuid references public.clientes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  tipo text not null default 'anotacao' check (tipo in ('ligacao','visita','anotacao','email','whatsapp','sistema')),
  descricao text not null,
  autor uuid,
  created_at timestamptz not null default now()
);

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  subtitulo text,
  botao_texto text, botao_link text,
  imagem_url text,
  local text not null default 'site' check (local in ('site','portal')),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- grants
grant select, insert, update, delete on public.clientes, public.cliente_usuarios, public.planos, public.contratos, public.faturas, public.cameras, public.leads, public.atividades, public.banners to authenticated;
grant all on public.clientes, public.cliente_usuarios, public.planos, public.contratos, public.faturas, public.cameras, public.leads, public.atividades, public.banners to service_role;
grant select on public.planos, public.banners, public.cameras to anon;
grant insert on public.leads to anon;

alter table public.clientes enable row level security;
alter table public.cliente_usuarios enable row level security;
alter table public.planos enable row level security;
alter table public.contratos enable row level security;
alter table public.faturas enable row level security;
alter table public.cameras enable row level security;
alter table public.leads enable row level security;
alter table public.atividades enable row level security;
alter table public.banners enable row level security;

-- clientes
create policy "equipe gerencia clientes" on public.clientes for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "cliente ve proprio cadastro" on public.clientes for select to authenticated using (id in (select public.meus_clientes(auth.uid())));
-- vinculos
create policy "equipe gerencia vinculos" on public.cliente_usuarios for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "usuario ve proprio vinculo" on public.cliente_usuarios for select to authenticated using (user_id = auth.uid());
-- planos
create policy "publico ve planos ativos" on public.planos for select to anon, authenticated using (ativo or public.is_staff(auth.uid()));
create policy "admin gerencia planos" on public.planos for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
-- contratos
create policy "equipe gerencia contratos" on public.contratos for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "cliente ve contratos" on public.contratos for select to authenticated using (cliente_id in (select public.meus_clientes(auth.uid())));
-- faturas
create policy "equipe gerencia faturas" on public.faturas for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "cliente ve faturas" on public.faturas for select to authenticated using (cliente_id in (select public.meus_clientes(auth.uid())));
-- cameras
create policy "publico ve cameras publicas" on public.cameras for select to anon, authenticated using (publica);
create policy "equipe gerencia cameras" on public.cameras for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "cliente ve suas cameras" on public.cameras for select to authenticated using (cliente_id in (select public.meus_clientes(auth.uid())));
-- leads
create policy "site cria lead" on public.leads for insert to anon, authenticated with check (origem = 'site' and etapa = 'novo' and cliente_id is null and responsavel is null);
create policy "equipe gerencia leads" on public.leads for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
-- atividades
create policy "equipe gerencia atividades" on public.atividades for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
-- banners
create policy "publico ve banners ativos" on public.banners for select to anon, authenticated using (ativo or public.is_staff(auth.uid()));
create policy "admin gerencia banners" on public.banners for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- seeds
insert into public.planos (nome, descricao, mensalidade, limite_cameras, dias_gravacao, recursos, destaque) values
('Residencial','Proteção completa para sua casa e família.',89.90,4,7,array['Até 4 câmeras','7 dias de gravação em nuvem','Acesso pelo celular','Suporte via WhatsApp'],false),
('Empresarial','Monitoramento profissional para o seu negócio.',249.90,16,30,array['Até 16 câmeras','30 dias de gravação em nuvem','Monitoramento 24h','Atendimento com IA','Relatórios mensais'],true),
('Condomínio','Segurança para áreas comuns, portarias e garagens.',589.00,32,30,array['Até 32 câmeras','30 dias de gravação em nuvem','Monitoramento 24h','Portal para síndico','Manutenção preventiva'],false);

insert into public.banners (titulo, subtitulo, botao_texto, botao_link, local, ordem) values
('O olho que protege o que importa para você','Videomonitoramento inteligente 24 horas para residências, condomínios e empresas.','Solicitar orçamento','/contato','site',1),
('Instalação grátis no plano Empresarial','Contrate até o fim do mês e ganhe a instalação de até 8 câmeras.','Ver planos','/planos','site',2),
('Condomínio protegido, moradores tranquilos','Portaria, garagem e áreas comuns monitoradas por especialistas.','Falar com consultor','/contato','site',3);

insert into public.cameras (nome, local, tipo_stream, stream_url, publica, status, marca) values
('Demonstração — Portaria','Vitrine Horus','hls','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',true,'online','Horus Demo'),
('Demonstração — Estacionamento','Vitrine Horus','hls','https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',true,'online','Horus Demo');


-- ===== drizzle/migrations/0001_chamados.sql =====
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

-- ===== drizzle/migrations/0002_chamados_ia_conhecimento.sql =====
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

-- ===== drizzle/migrations/0003_ordens_servico.sql =====
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

-- ===== drizzle/migrations/0004_ordens_servico_restringir_grants.sql =====
REVOKE ALL ON public.ordens_servico FROM anon;
REVOKE ALL ON FUNCTION public.ordens_servico_antes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ordens_servico_depois() FROM PUBLIC, anon, authenticated;

-- ===== drizzle/migrations/0005_whatsapp_simulacao.sql =====
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

-- ===== drizzle/migrations/0006_whatsapp_acoes_bot.sql =====
ALTER TABLE public.whatsapp_conversas ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id);
ALTER TABLE public.chamados ADD COLUMN IF NOT EXISTS whatsapp_conversa_id uuid REFERENCES public.whatsapp_conversas(id);
ALTER TABLE public.whatsapp_bot_jobs ADD COLUMN IF NOT EXISTS resposta_id uuid REFERENCES public.whatsapp_mensagens(id);
CREATE OR REPLACE FUNCTION public.whatsapp_aplicar_acao(_job uuid, _acao text, _texto text, _assunto text, _categoria text, _prioridade text, _chamado uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
CREATE OR REPLACE FUNCTION public.whatsapp_resposta_chamado() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
 IF NEW.autor<>'equipe' OR NEW.nota_interna THEN RETURN NEW; END IF;
 SELECT whatsapp_conversa_id INTO cid FROM public.chamados WHERE id=NEW.chamado_id AND canal='whatsapp';
 IF cid IS NULL THEN
 SELECT wc.id INTO cid FROM public.whatsapp_conversas wc JOIN public.chamados ch ON ch.cliente_id=wc.cliente_id WHERE ch.id=NEW.chamado_id AND ch.canal='whatsapp' ORDER BY wc.ultima_mensagem_em DESC NULLS LAST LIMIT 1;
 END IF;
 IF cid IS NOT NULL THEN
 INSERT INTO public.whatsapp_mensagens(conversa_id,direcao,remetente,texto,status,chamado_mensagem_id) VALUES(cid,'saida','atendente',NEW.texto,'pendente',NEW.id) ON CONFLICT(chamado_mensagem_id) DO NOTHING;
 UPDATE public.whatsapp_conversas SET modo='humano',ultima_mensagem=NEW.texto,ultima_mensagem_em=now() WHERE id=cid;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER whatsapp_resposta_chamado AFTER INSERT ON public.chamado_mensagens FOR EACH ROW EXECUTE FUNCTION public.whatsapp_resposta_chamado();
REVOKE ALL ON FUNCTION public.whatsapp_resposta_chamado() FROM PUBLIC,anon,authenticated;

-- ===== drizzle/migrations/0007_whatsapp_aplicar_acao_chamado_opcional.sql =====
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
