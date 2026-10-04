-- PREPARADO, NO APLICADO. Tabla aislada; no modifica progreso legacy.
-- Las funciones aceptan sólo al service_role. La validación completa de la
-- frontera HTTP permanece en api/_health/core.ts.
begin;

create table if not exists public.coach_health_records (
  id bigint generated always as identity primary key,
  schema_version integer not null default 1,
  profile_id text not null,
  device_id text not null,
  record_type text not null,
  source_id text not null,
  source_package text not null,
  last_modified_time timestamptz not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  start_zone_offset_seconds integer,
  end_zone_offset_seconds integer,
  data jsonb not null,
  excluded boolean not null default false,
  exclusion_reason text,
  received_at timestamptz not null default now(),
  unique (profile_id, device_id, record_type, source_id)
);

-- Preserve exact SDK instants separately from PostgreSQL's microsecond projection.
create or replace function public.coach_health_epoch_ns(value text)
returns numeric language sql immutable strict parallel safe as $$
  select extract(epoch from regexp_replace(value, '\.[0-9]+', '')::timestamptz) * 1000000000
    + rpad(coalesce(substring(value from '\.([0-9]+)'), '0'), 9, '0')::numeric
$$;
revoke all on function public.coach_health_epoch_ns(text) from public, anon, authenticated;
grant execute on function public.coach_health_epoch_ns(text) to service_role;

alter table public.coach_health_records add column if not exists start_time_raw text;
alter table public.coach_health_records add column if not exists end_time_raw text;
alter table public.coach_health_records add column if not exists last_modified_time_raw text;

-- La tabla v1 ya puede existir. Estas operaciones son deliberadamente
-- repetibles: completan la columna nueva y sustituyen sus checks antiguos.
alter table public.coach_health_records add column if not exists schema_version integer;
alter table public.coach_health_records alter column schema_version set default 1;
update public.coach_health_records set schema_version = 1 where schema_version is null;
alter table public.coach_health_records alter column schema_version set not null;

alter table public.coach_health_records drop constraint if exists coach_health_records_schema_version_check;
alter table public.coach_health_records add constraint coach_health_records_schema_version_check check (schema_version in (1, 2));
alter table public.coach_health_records drop constraint if exists coach_health_records_schema_catalog_check;
alter table public.coach_health_records add constraint coach_health_records_schema_catalog_check check (
  schema_version = 2 or record_type in ('exercise_session', 'heart_rate')
);

alter table public.coach_health_records drop constraint if exists coach_health_records_record_type_check;
alter table public.coach_health_records drop constraint if exists coach_health_records_record_type_allowed;
alter table public.coach_health_records add constraint coach_health_records_record_type_allowed check (record_type in (
  'active_calories_burned', 'basal_body_temperature', 'basal_metabolic_rate',
  'blood_glucose', 'blood_pressure', 'body_fat', 'body_temperature',
  'body_water_mass', 'bone_mass', 'cervical_mucus',
  'cycling_pedaling_cadence', 'distance', 'elevation_gained',
  'exercise_session', 'floors_climbed', 'heart_rate',
  'heart_rate_variability_rmssd', 'height', 'hydration',
  'intermenstrual_bleeding', 'lean_body_mass', 'menstruation_flow',
  'menstruation_period', 'mindfulness_session', 'nutrition',
  'ovulation_test', 'oxygen_saturation', 'planned_exercise_session',
  'power', 'respiratory_rate', 'resting_heart_rate', 'sexual_activity',
  'skin_temperature', 'sleep_session', 'speed', 'steps', 'steps_cadence',
  'total_calories_burned', 'vo2_max', 'weight', 'wheelchair_pushes'
));

alter table public.coach_health_records drop constraint if exists coach_health_records_end_time_check;
alter table public.coach_health_records drop constraint if exists coach_health_records_check;
alter table public.coach_health_records drop constraint if exists coach_health_records_temporal_check;
alter table public.coach_health_records add constraint coach_health_records_temporal_check check (
  (schema_version = 2 and record_type in (
    'cycling_pedaling_cadence', 'heart_rate', 'power', 'speed', 'steps_cadence'
  ) and coalesce(public.coach_health_epoch_ns(end_time_raw), extract(epoch from end_time)*1000000000) = coalesce(public.coach_health_epoch_ns(start_time_raw), extract(epoch from start_time)*1000000000))
  or
  (record_type in (
    'basal_body_temperature', 'basal_metabolic_rate', 'blood_glucose',
    'blood_pressure', 'body_fat', 'body_temperature', 'body_water_mass',
    'bone_mass', 'cervical_mucus', 'heart_rate_variability_rmssd', 'height',
    'intermenstrual_bleeding', 'lean_body_mass', 'menstruation_flow',
    'ovulation_test', 'oxygen_saturation', 'respiratory_rate',
    'resting_heart_rate', 'sexual_activity', 'vo2_max', 'weight'
  ) and coalesce(public.coach_health_epoch_ns(end_time_raw), extract(epoch from end_time)*1000000000) = coalesce(public.coach_health_epoch_ns(start_time_raw), extract(epoch from start_time)*1000000000))
  or
  (record_type in (
    'active_calories_burned', 'cycling_pedaling_cadence', 'distance',
    'elevation_gained', 'exercise_session', 'floors_climbed', 'heart_rate',
    'hydration', 'menstruation_period', 'mindfulness_session', 'nutrition',
    'planned_exercise_session', 'power', 'skin_temperature', 'sleep_session',
    'speed', 'steps', 'steps_cadence', 'total_calories_burned',
    'wheelchair_pushes'
  ) and coalesce(public.coach_health_epoch_ns(end_time_raw), extract(epoch from end_time)*1000000000) > coalesce(public.coach_health_epoch_ns(start_time_raw), extract(epoch from start_time)*1000000000))
);

alter table public.coach_health_records drop constraint if exists coach_health_records_source_id_check;
alter table public.coach_health_records add constraint coach_health_records_source_id_check check (schema_version = 1 or length(source_id) between 1 and 1024);
alter table public.coach_health_records drop constraint if exists coach_health_records_source_package_check;
alter table public.coach_health_records add constraint coach_health_records_source_package_check check (schema_version = 1 or length(source_package) between 1 and 255);
alter table public.coach_health_records drop constraint if exists coach_health_records_offset_check;
alter table public.coach_health_records add constraint coach_health_records_offset_check check (schema_version = 1 or (
  (start_zone_offset_seconds is null or start_zone_offset_seconds between -64800 and 64800)
  and (end_zone_offset_seconds is null or end_zone_offset_seconds between -64800 and 64800)
));
alter table public.coach_health_records drop constraint if exists coach_health_records_data_object_check;
alter table public.coach_health_records add constraint coach_health_records_data_object_check check (schema_version = 1 or jsonb_typeof(data) = 'object');

alter table public.coach_health_records enable row level security;
revoke all on public.coach_health_records from public, anon, authenticated;
revoke all on sequence public.coach_health_records_id_seq from public, anon, authenticated;
grant select, insert, update, delete on public.coach_health_records to service_role;
grant usage, select on sequence public.coach_health_records_id_seq to service_role;
create index if not exists coach_health_profile_time on public.coach_health_records(profile_id, device_id, start_time);
create index if not exists coach_health_profile_type on public.coach_health_records(profile_id, device_id, record_type, schema_version);
create index if not exists coach_health_profile_source_package on public.coach_health_records(profile_id, device_id, source_package);

create table if not exists public.coach_health_fragments (
  profile_id text not null,
  device_id text not null,
  record_type text not null,
  source_id text not null,
  last_modified_time text not null,
  sha256 text not null,
  fragment_index integer not null,
  fragment_count integer not null,
  payload_base64 text not null,
  payload_bytes integer not null,
  received_at timestamptz not null default now(),
  primary key (profile_id, device_id, record_type, source_id, last_modified_time, sha256, fragment_index),
  check (length(profile_id) between 1 and 128),
  check (length(device_id) between 1 and 128),
  check (length(source_id) between 1 and 1024),
  check (record_type in (
    'active_calories_burned', 'basal_body_temperature', 'basal_metabolic_rate',
    'blood_glucose', 'blood_pressure', 'body_fat', 'body_temperature',
    'body_water_mass', 'bone_mass', 'cervical_mucus', 'cycling_pedaling_cadence',
    'distance', 'elevation_gained', 'exercise_session', 'floors_climbed',
    'heart_rate', 'heart_rate_variability_rmssd', 'height', 'hydration',
    'intermenstrual_bleeding', 'lean_body_mass', 'menstruation_flow',
    'menstruation_period', 'mindfulness_session', 'nutrition', 'ovulation_test',
    'oxygen_saturation', 'planned_exercise_session', 'power', 'respiratory_rate',
    'resting_heart_rate', 'sexual_activity', 'skin_temperature', 'sleep_session',
    'speed', 'steps', 'steps_cadence', 'total_calories_burned', 'vo2_max',
    'weight', 'wheelchair_pushes'
  )),
  check (length(sha256) = 64 and sha256 ~ '^[0-9a-f]{64}$'),
  check (fragment_count between 1 and 137 and fragment_index between 0 and fragment_count - 1),
  check (payload_bytes between 1 and 245760)
);
alter table public.coach_health_fragments enable row level security;
revoke all on public.coach_health_fragments from public, anon, authenticated;
grant select, insert, update, delete on public.coach_health_fragments to service_role;
create index if not exists coach_health_fragments_group on public.coach_health_fragments(
  profile_id, device_id, record_type, source_id, last_modified_time, sha256, fragment_index
);

create or replace function public.coach_stage_health_fragment(
  p_profile text, p_device text, p_record_type text, p_source_id text,
  p_last_modified_time text, p_sha256 text, p_fragment_index integer,
  p_fragment_count integer, p_payload_base64 text
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_bytes bytea;
  v_existing text;
  v_count integer;
  v_total integer;
  v_index integer;
  v_part bytea;
  v_payload bytea := decode('', 'base64');
  v_timestamp timestamptz;
begin
  if p_profile is null or length(p_profile) not between 1 and 128 or
     p_device is null or length(p_device) not between 1 and 128 or
     p_record_type is null or p_source_id is null or length(p_source_id) not between 1 and 1024 or
     p_last_modified_time is null or length(p_last_modified_time) > 64 or
     p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' or
     p_fragment_count not between 1 and 137 or p_fragment_index < 0 or p_fragment_index >= p_fragment_count or
     p_payload_base64 is null then
    raise exception 'invalid_fragment';
  end if;
  begin
    v_timestamp := p_last_modified_time::timestamptz;
  exception when others then
    raise exception 'invalid_fragment';
  end;
  v_bytes := decode(p_payload_base64, 'base64');
  if octet_length(v_bytes) not between 1 and 245760 then
    raise exception 'invalid_fragment';
  end if;
  if p_record_type not in (
    'active_calories_burned', 'basal_body_temperature', 'basal_metabolic_rate',
    'blood_glucose', 'blood_pressure', 'body_fat', 'body_temperature',
    'body_water_mass', 'bone_mass', 'cervical_mucus', 'cycling_pedaling_cadence',
    'distance', 'elevation_gained', 'exercise_session', 'floors_climbed',
    'heart_rate', 'heart_rate_variability_rmssd', 'height', 'hydration',
    'intermenstrual_bleeding', 'lean_body_mass', 'menstruation_flow',
    'menstruation_period', 'mindfulness_session', 'nutrition', 'ovulation_test',
    'oxygen_saturation', 'planned_exercise_session', 'power', 'respiratory_rate',
    'resting_heart_rate', 'sexual_activity', 'skin_temperature', 'sleep_session',
    'speed', 'steps', 'steps_cadence', 'total_calories_burned', 'vo2_max',
    'weight', 'wheelchair_pushes'
  ) then
    raise exception 'invalid_type';
  end if;
  if exists (
    select 1 from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type
      and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256
      and fragment_count <> p_fragment_count
  ) then
    raise exception 'fragment_count_conflict';
  end if;
  select payload_base64 into v_existing from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type
      and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256
      and fragment_index = p_fragment_index;
  if v_existing is not null then
    if v_existing <> p_payload_base64 then raise exception 'fragment_conflict'; end if;
  else
    insert into public.coach_health_fragments (
      profile_id, device_id, record_type, source_id, last_modified_time, sha256,
      fragment_index, fragment_count, payload_base64, payload_bytes
    ) values (
      p_profile, p_device, p_record_type, p_source_id, p_last_modified_time, p_sha256,
      p_fragment_index, p_fragment_count, p_payload_base64, octet_length(v_bytes)
    );
  end if;
  select count(*)::integer, coalesce(sum(payload_bytes), 0)::integer
    into v_count, v_total
    from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type
      and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256;
  if v_total > 33554432 then raise exception 'fragmented_record_too_large'; end if;
  if v_count < p_fragment_count then
    return jsonb_build_object('accepted', 1, 'complete', false, 'fragmentCount', p_fragment_count);
  end if;
  for v_index in 0..p_fragment_count - 1 loop
    select decode(payload_base64, 'base64') into v_part from public.coach_health_fragments
      where profile_id = p_profile and device_id = p_device and record_type = p_record_type
        and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256
        and fragment_index = v_index;
    if not found then raise exception 'fragment_incomplete'; end if;
    v_payload := v_payload || v_part;
  end loop;
  return jsonb_build_object('accepted', 1, 'complete', true, 'fragmentCount', p_fragment_count);
end;
$$;

create or replace function public.coach_read_health_fragment(
  p_profile text, p_device text, p_record_type text, p_source_id text,
  p_last_modified_time text, p_sha256 text, p_after_index integer default 0,
  p_limit integer default 8
)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'index', fragment_index, 'payloadBase64', payload_base64
  ) order by fragment_index), '[]'::jsonb)
  from public.coach_health_fragments
  where profile_id = p_profile and device_id = p_device and record_type = p_record_type
    and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256
    and fragment_index >= greatest(coalesce(p_after_index, 0), 0)
    and fragment_index < greatest(coalesce(p_after_index, 0), 0) + least(greatest(coalesce(p_limit, 8), 1), 8)
$$;

create or replace function public.coach_finalize_health_fragment(
  p_profile text, p_device text, p_record_type text, p_source_id text,
  p_last_modified_time text, p_sha256 text, p_record jsonb
)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_count integer;
  v_expected integer;
  v_index integer;
  v_part bytea;
  v_payload bytea := decode('', 'base64');
  v_envelope jsonb;
  v_hash text;
begin
  select count(*)::integer, max(fragment_count)::integer into v_count, v_expected
    from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type
      and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256;
  if v_expected is null or v_count <> v_expected then raise exception 'fragment_incomplete'; end if;
  for v_index in 0..v_expected - 1 loop
    select decode(payload_base64, 'base64') into v_part from public.coach_health_fragments
      where profile_id = p_profile and device_id = p_device and record_type = p_record_type
        and source_id = p_source_id and last_modified_time = p_last_modified_time and sha256 = p_sha256
        and fragment_index = v_index;
    if not found then raise exception 'fragment_incomplete'; end if;
    v_payload := v_payload || v_part;
  end loop;
  -- Supabase normally has pgcrypto; PGlite's contract tests do not. The API
  -- always verifies SHA-256 before calling finalize, while this adds a second
  -- check automatically wherever digest(bytea,text) is available.
  if to_regprocedure('digest(bytea,text)') is not null then
    execute 'select encode(digest($1, ''sha256''), ''hex'')' into v_hash using v_payload;
    if v_hash <> p_sha256 then raise exception 'fragment_hash_mismatch'; end if;
  end if;
  begin
    v_envelope := convert_from(v_payload, 'UTF8')::jsonb;
  exception when others then
    raise exception 'invalid_fragment_payload';
  end;
  if jsonb_typeof(v_envelope) <> 'object' or
     (select count(*) from jsonb_object_keys(v_envelope) as keys(key)) <> 2 or
     exists (select 1 from jsonb_object_keys(v_envelope) as keys(key) where key not in ('schemaVersion', 'records')) or
     v_envelope->>'schemaVersion' <> '2' or jsonb_typeof(v_envelope->'records') <> 'array' or
     jsonb_array_length(v_envelope->'records') <> 1 or v_envelope->'records'->0 <> p_record then
    raise exception 'invalid_fragment_payload';
  end if;
  if p_record->>'recordType' <> p_record_type or p_record->>'sourceId' <> p_source_id or p_record->>'lastModifiedTime' <> p_last_modified_time then
    raise exception 'fragment_identity_mismatch';
  end if;
  perform public.coach_ingest_health_internal(p_profile, p_device, 2, jsonb_build_array(p_record));
  delete from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type and source_id = p_source_id
      and last_modified_time = p_last_modified_time;
  -- A successful newer revision makes older staged revisions unreachable. Keep
  -- this after the principal upsert so a validation/transaction failure leaves
  -- both the previous principal and its retryable staging intact.
  delete from public.coach_health_fragments
    where profile_id = p_profile and device_id = p_device and record_type = p_record_type and source_id = p_source_id
      and public.coach_health_epoch_ns(last_modified_time) < public.coach_health_epoch_ns(p_last_modified_time);
  return 1;
end;
$$;

revoke all on function public.coach_stage_health_fragment(text, text, text, text, text, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.coach_read_health_fragment(text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.coach_finalize_health_fragment(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.coach_stage_health_fragment(text, text, text, text, text, text, integer, integer, text) to service_role;
grant execute on function public.coach_read_health_fragment(text, text, text, text, text, text, integer, integer) to service_role;
grant execute on function public.coach_finalize_health_fragment(text, text, text, text, text, text, jsonb) to service_role;

drop function if exists public.coach_read_health_detail(text,text,bigint,integer,integer,boolean);
create or replace function public.coach_read_health_detail(
  p_profile text, p_device text, p_id bigint, p_after integer default 0,
  p_limit integer default 240000, p_include_excluded boolean default false, p_expected_revision text default null
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_schema integer;
  v_data jsonb;
  v_bytes bytea;
  v_chunk bytea;
  v_total integer;
  v_revision text;
  v_offset integer := greatest(coalesce(p_after, 0), 0);
  v_size integer := least(greatest(coalesce(p_limit, 240000), 1), 240000);
begin
  select schema_version, data into v_schema, v_data
    from public.coach_health_records
    where profile_id = p_profile and device_id = p_device and id = p_id
      and (p_include_excluded or excluded = false);
  if not found then return null; end if;
  v_revision := md5(v_data::text);
  if p_expected_revision is not null and p_expected_revision <> v_revision then
    return jsonb_build_object('changed', true);
  end if;
  v_bytes := convert_to(v_data::text, 'UTF8');
  v_total := octet_length(v_bytes);
  if v_offset > v_total then raise exception 'invalid_detail_cursor'; end if;
  v_chunk := substring(v_bytes from v_offset + 1 for v_size);
  return jsonb_build_object(
    'id', p_id, 'schemaVersion', v_schema, 'revision', v_revision, 'offset', v_offset, 'totalBytes', v_total,
    'dataBase64', replace(encode(v_chunk, 'base64'), chr(10), ''),
    'nextOffset', case when v_offset + octet_length(v_chunk) < v_total then v_offset + octet_length(v_chunk) else null end
  );
end;
$$;

revoke all on function public.coach_read_health_detail(text, text, bigint, integer, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.coach_read_health_detail(text, text, bigint, integer, integer, boolean, text) to service_role;

create or replace function public.coach_ingest_health_internal(p_profile text, p_device text, p_schema_version integer, p_records jsonb)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  r jsonb;
begin
  if p_profile is null or length(p_profile) not between 1 and 128 or
     p_device is null or length(p_device) not between 1 and 128 or
     p_schema_version not in (1, 2) or p_records is null or jsonb_typeof(p_records) <> 'array' or
     jsonb_array_length(p_records) not between 1 and 200 then
    raise exception 'invalid_batch';
  end if;
  for r in select value from jsonb_array_elements(p_records) loop
    if jsonb_typeof(r) <> 'object' or
       (select count(*) from jsonb_object_keys(r) as keys(key)) <> 9 or
       exists (
         select 1 from jsonb_object_keys(r) as keys(key)
         where key not in ('recordType', 'sourceId', 'sourcePackage', 'lastModifiedTime',
                           'startTime', 'endTime', 'startZoneOffsetSeconds',
                           'endZoneOffsetSeconds', 'data')
       ) or p_schema_version = 1 and r->>'recordType' not in ('exercise_session', 'heart_rate') then
      raise exception 'invalid_record';
    end if;
    insert into public.coach_health_records as current_record (
      schema_version, profile_id, device_id, record_type, source_id, source_package,
      last_modified_time, start_time, end_time, start_zone_offset_seconds,
      end_zone_offset_seconds, data, start_time_raw, end_time_raw, last_modified_time_raw
    ) values (
      p_schema_version, p_profile, p_device, r->>'recordType', r->>'sourceId', r->>'sourcePackage',
      (r->>'lastModifiedTime')::timestamptz, (r->>'startTime')::timestamptz,
      (r->>'endTime')::timestamptz, (r->>'startZoneOffsetSeconds')::integer,
      (r->>'endZoneOffsetSeconds')::integer, r->'data', r->>'startTime', r->>'endTime', r->>'lastModifiedTime'
    ) on conflict (profile_id, device_id, record_type, source_id) do update set
      schema_version = excluded.schema_version,
      source_package = excluded.source_package,
      last_modified_time = excluded.last_modified_time,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      start_zone_offset_seconds = excluded.start_zone_offset_seconds,
      end_zone_offset_seconds = excluded.end_zone_offset_seconds,
      data = excluded.data,
      start_time_raw = excluded.start_time_raw,
      end_time_raw = excluded.end_time_raw,
      last_modified_time_raw = excluded.last_modified_time_raw,
      received_at = now()
    where public.coach_health_epoch_ns(excluded.last_modified_time_raw) > coalesce(public.coach_health_epoch_ns(current_record.last_modified_time_raw), extract(epoch from current_record.last_modified_time)*1000000000)
       or (public.coach_health_epoch_ns(excluded.last_modified_time_raw) = coalesce(public.coach_health_epoch_ns(current_record.last_modified_time_raw), extract(epoch from current_record.last_modified_time)*1000000000) and excluded.schema_version > current_record.schema_version);
    -- excluded/exclusion_reason no se sobrescriben con reimportaciones.
  end loop;
  return jsonb_array_length(p_records);
end;
$$;

create or replace function public.coach_ingest_health(p_profile text, p_device text, p_records jsonb)
returns integer language sql security invoker set search_path = public, pg_temp as $$
  select public.coach_ingest_health_internal($1, $2, 1, $3)
$$;

create or replace function public.coach_ingest_health_v2(p_profile text, p_device text, p_records jsonb)
returns integer language sql security invoker set search_path = public, pg_temp as $$
  select public.coach_ingest_health_internal($1, $2, 2, $3)
$$;

revoke all on function public.coach_ingest_health_internal(text, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.coach_ingest_health(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.coach_ingest_health_v2(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.coach_ingest_health_internal(text, text, integer, jsonb) to service_role;
grant execute on function public.coach_ingest_health(text, text, jsonb) to service_role;
grant execute on function public.coach_ingest_health_v2(text, text, jsonb) to service_role;

-- Header-only relation: never transfer up to 201 large data bodies to the API.
create or replace view public.coach_health_record_headers with (security_invoker = true) as
select id, schema_version, profile_id, device_id, record_type, source_id, source_package,
  coalesce(start_time_raw, to_char(start_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) as start_time,
  coalesce(end_time_raw, to_char(end_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) as end_time,
  coalesce(last_modified_time_raw, to_char(last_modified_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')) as last_modified_time,
  coalesce(public.coach_health_epoch_ns(start_time_raw), extract(epoch from start_time)*1000000000) as start_ns,
  coalesce(public.coach_health_epoch_ns(end_time_raw), extract(epoch from end_time)*1000000000) as end_ns,
  start_zone_offset_seconds, end_zone_offset_seconds, excluded, exclusion_reason, received_at,
  octet_length(convert_to(data::text, 'UTF8')) as data_bytes
from public.coach_health_records;
revoke all on public.coach_health_record_headers from public, anon, authenticated;
grant select on public.coach_health_record_headers to service_role;

-- Limit before materializing/returning a data body across the database boundary.
create or replace function public.coach_read_health_inline(
  p_profile text, p_device text, p_id bigint, p_max_bytes integer,
  p_include_excluded boolean default false
) returns jsonb language sql security invoker set search_path = public, pg_temp as $$
  select case when octet_length(convert_to(data::text, 'UTF8')) <= least(greatest(p_max_bytes, 0), 3900000)
    then jsonb_build_object('data', data) else jsonb_build_object('tooLarge', true) end
  from public.coach_health_records
  where profile_id = p_profile and device_id = p_device and id = p_id
    and (p_include_excluded or not excluded)
$$;
revoke all on function public.coach_read_health_inline(text,text,bigint,integer,boolean) from public, anon, authenticated;
grant execute on function public.coach_read_health_inline(text,text,bigint,integer,boolean) to service_role;

commit;

-- Exclusión manual posterior, sólo tras revisar el sourceId real. NO ejecutar con un ID supuesto:
-- update public.coach_health_records set excluded = true, exclusion_reason = 'Prueba técnica Samsung, no actividad real'
-- where profile_id = :profile and device_id = :device and record_type = 'exercise_session' and source_id = :verified_source_id;
