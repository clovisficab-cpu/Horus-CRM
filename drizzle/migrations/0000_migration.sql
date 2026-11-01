
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
