-- R1.2 preparation only. No se ejecuta durante el trabajo local ni reemplaza
-- tablas legacy. La activación requiere revisión R1.3 y una migración aprobada.
--
-- El gateway autentica al propietario y entrega un UUID firmado a la API. La
-- API usa el rol server-only para invocar estas funciones; el UUID no viene
-- del body del cliente ni se deriva de un identificador opaco.
-- Aplicar completo en el SQL Editor de Supabase sólo al autorizar activación.
-- No incluye datos personales, fixtures ni modificaciones de tablas antiguas.
-- sessions: ejecución + snapshot del plan; exerciseNotes: notas por ejercicio.

begin;

create table if not exists public.coach_training_plan_versions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (char_length(plan_id) between 1 and 160),
  version integer not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  effective_from date not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, plan_id, version)
);

create table if not exists public.coach_training_records (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_training_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 160),
  base_revision bigint not null check (base_revision >= 0),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{32}$'),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  primary key (owner_id, request_id)
);

alter table public.coach_training_plan_versions enable row level security;
alter table public.coach_training_records enable row level security;
alter table public.coach_training_mutations enable row level security;
alter table public.coach_training_plan_versions force row level security;
alter table public.coach_training_records force row level security;
alter table public.coach_training_mutations force row level security;

drop policy if exists coach_training_plans_owner on public.coach_training_plan_versions;
drop policy if exists coach_training_records_owner on public.coach_training_records;
drop policy if exists coach_training_mutations_owner on public.coach_training_mutations;

-- Direct table writes are not part of the API contract. These owner-scoped
-- read policies remain a defence-in-depth boundary if a future read grant is
-- added; current client roles get no table privileges, and the server RPC
-- below is the sole write path with an explicit owner UUID filter.
create policy coach_training_plans_owner on public.coach_training_plan_versions
  for select using (owner_id = auth.uid());

create policy coach_training_records_owner on public.coach_training_records
  for select using (owner_id = auth.uid());

create policy coach_training_mutations_owner on public.coach_training_mutations
  for select using (owner_id = auth.uid());

revoke all on table public.coach_training_plan_versions from public, anon, authenticated;
revoke all on table public.coach_training_records from public, anon, authenticated;
revoke all on table public.coach_training_mutations from public, anon, authenticated;
revoke all on table public.coach_training_plan_versions, public.coach_training_records,
  public.coach_training_mutations from service_role;

-- Una versión publicada no se sobrescribe. Repetir exactamente el mismo plan
-- es inocuo; cualquier cambio requiere otra versión. El propietario pertenece
-- a auth.users, como en el contrato ya preparado de registros.
create or replace function public.coach_training_plan_write(
  p_owner_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  plan_key text;
  plan_version integer;
  starts_on date;
  previous_payload jsonb;
begin
  if p_owner_id is null or p_payload is null or
     jsonb_typeof(p_payload) is distinct from 'object' or
     jsonb_typeof(p_payload->'id') is distinct from 'string' or
     char_length(btrim(p_payload->>'id')) not between 1 and 160 or
     jsonb_typeof(p_payload->'version') is distinct from 'number' or
     (p_payload->>'version') !~ '^[1-9][0-9]{0,9}$' or
     jsonb_typeof(p_payload->'effectiveFrom') is distinct from 'string' or
     (p_payload->>'effectiveFrom') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or
     jsonb_typeof(p_payload->'name') is distinct from 'string' or
     char_length(btrim(p_payload->>'name')) not between 1 and 160 or
     jsonb_typeof(p_payload->'source') is distinct from 'string' or
     char_length(btrim(p_payload->>'source')) not between 1 and 500 or
     jsonb_typeof(p_payload->'days') is distinct from 'array' or
     octet_length(p_payload::text) > 1000000 then
    raise exception using errcode = '22023', message = 'invalid training plan';
  end if;
  if jsonb_array_length(p_payload->'days') <> 7 then
    raise exception using errcode = '22023', message = 'training plan requires seven days';
  end if;
  plan_key := p_payload->>'id';
  plan_version := (p_payload->>'version')::integer;
  starts_on := (p_payload->>'effectiveFrom')::date;

  -- El backend debe validar también ejercicios/cardio con isTrainingRoutine.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));
  select payload into previous_payload from public.coach_training_plan_versions
    where owner_id = p_owner_id and plan_id = plan_key and version = plan_version;
  if found then
    if previous_payload is distinct from p_payload then
      raise exception using errcode = '22023', message = 'plan version is immutable; create a new version';
    end if;
    return previous_payload;
  end if;
  insert into public.coach_training_plan_versions(owner_id, plan_id, version, payload, effective_from)
    values (p_owner_id, plan_key, plan_version, p_payload, starts_on);
  return p_payload;
end;
$$;

-- Consulta explícita por plan/fecha: nunca devuelve una versión futura.
create or replace function public.coach_training_plan_read(
  p_owner_id uuid,
  p_plan_id text,
  p_on date default ((now() at time zone 'Europe/Madrid')::date)
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if p_owner_id is null or p_plan_id is null or
     char_length(btrim(p_plan_id)) not between 1 and 160 or p_on is null then
    raise exception using errcode = '22023', message = 'invalid training plan query';
  end if;
  select payload into result from public.coach_training_plan_versions
    where owner_id = p_owner_id and plan_id = p_plan_id and effective_from <= p_on
    order by effective_from desc, version desc limit 1;
  return result;
end;
$$;

create or replace function public.coach_training_write(
  p_owner_id uuid,
  p_base_revision bigint,
  p_request_id text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_revision bigint;
  current_payload jsonb;
  next_revision bigint;
  previous_response jsonb;
  previous_hash text;
  previous_base_revision bigint;
  response jsonb;
begin
  if p_owner_id is null or p_base_revision is null or p_base_revision < 0 or
     p_base_revision > 9223372036854775806 or p_request_id is null or
     char_length(p_request_id) = 0 or char_length(p_request_id) > 160 or
     p_request_id !~ '^[A-Za-z0-9._:-]+$' then
    raise exception using errcode = '22023', message = 'invalid training write';
  end if;

  -- IS DISTINCT FROM is deliberate: jsonb_typeof(NULL) is NULL and a plain
  -- <> comparison would otherwise let a null payload pass this guard.
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or
     p_payload->>'version' is distinct from '1' or
     jsonb_typeof(p_payload->'sessions') is distinct from 'array' or
     jsonb_typeof(p_payload->'exerciseNotes') is distinct from 'array' or
     octet_length(p_payload::text) > 1000000 then
    raise exception using errcode = '22023', message = 'invalid training write';
  end if;

  -- ponytail: one 64-bit owner lock serializes a first write too; a per-row
  -- lock alone cannot lock a row that does not exist yet.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text, 0));

  select m.base_revision, m.payload_hash, m.response
    into previous_base_revision, previous_hash, previous_response
    from public.coach_training_mutations m
    where m.owner_id = p_owner_id and m.request_id = p_request_id
    for update;

  if found then
    if previous_base_revision is distinct from p_base_revision or
       previous_hash is distinct from md5(p_payload::text) or
       previous_response->'data' is distinct from p_payload then
      return jsonb_build_object('kind', 'request_id_reused');
    end if;
    return jsonb_build_object('kind', 'replay', 'response', previous_response);
  end if;

  select r.revision, r.payload
    into current_revision, current_payload
    from public.coach_training_records r
    where r.owner_id = p_owner_id
    for update;
  if not found then
    current_revision := 0;
    current_payload := null;
  end if;

  if p_base_revision <> current_revision then
    if current_payload is null then
      return jsonb_build_object('kind', 'conflict', 'records', null::jsonb);
    end if;
    return jsonb_build_object(
      'kind', 'conflict',
      'records', jsonb_build_object('schemaVersion', 1, 'revision', current_revision, 'data', current_payload)
    );
  end if;

  next_revision := current_revision + 1;
  insert into public.coach_training_records(owner_id, revision, payload, updated_at)
    values (p_owner_id, next_revision, p_payload, now())
    on conflict (owner_id) do update
      set revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at;

  response := jsonb_build_object(
    'schemaVersion', 1,
    'revision', next_revision,
    'data', p_payload
  );
  insert into public.coach_training_mutations(owner_id, request_id, base_revision, payload_hash, response)
    values (p_owner_id, p_request_id, p_base_revision, md5(p_payload::text), response);
  return jsonb_build_object('kind', 'ok', 'response', response);
end;
$$;

create or replace function public.coach_training_read(
  p_owner_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'invalid training owner';
  end if;
  select jsonb_build_object('schemaVersion', 1, 'revision', r.revision, 'data', r.payload)
    into result
    from public.coach_training_records r
    where r.owner_id = p_owner_id;
  return result;
end;
$$;

-- The API's signed gateway boundary is the only caller. No client role gets
-- table DML or RPC execute, so an authenticated client cannot bypass CAS.
revoke all on function public.coach_training_write(uuid, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.coach_training_read(uuid) from public, anon, authenticated;
grant execute on function public.coach_training_write(uuid, bigint, text, jsonb) to service_role;
grant execute on function public.coach_training_read(uuid) to service_role;
revoke all on function public.coach_training_plan_write(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.coach_training_plan_read(uuid, text, date) from public, anon, authenticated;
grant execute on function public.coach_training_plan_write(uuid, jsonb) to service_role;
grant execute on function public.coach_training_plan_read(uuid, text, date) to service_role;

commit;
