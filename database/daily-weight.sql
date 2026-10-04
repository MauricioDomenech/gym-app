-- Preparación local: aplicar sólo con autorización de despliegue.
-- Registro manual independiente de Health Connect y de las tablas legacy.
begin;
create table if not exists public.coach_daily_weights (
  owner_id uuid not null references auth.users(id) on delete cascade,
  date date not null check (date >= '1900-01-01'),
  kg numeric(5,2) not null check (kg between 1 and 500),
  primary key (owner_id, date)
);
alter table public.coach_daily_weights enable row level security;
alter table public.coach_daily_weights force row level security;
revoke all on public.coach_daily_weights from public, anon, authenticated;
grant select, insert, update on public.coach_daily_weights to service_role;
commit;
