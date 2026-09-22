-- PREPARADO, NO APLICADO. Tablas aisladas; no modifica progreso legacy.
begin;
create table if not exists public.coach_health_records (
  id bigint generated always as identity primary key,
  profile_id text not null,
  device_id text not null,
  record_type text not null check (record_type in ('exercise_session','heart_rate')),
  source_id text not null,
  source_package text not null,
  last_modified_time timestamptz not null,
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  start_zone_offset_seconds integer,
  end_zone_offset_seconds integer,
  data jsonb not null,
  excluded boolean not null default false,
  exclusion_reason text,
  received_at timestamptz not null default now(),
  unique (profile_id, device_id, record_type, source_id)
);
alter table public.coach_health_records enable row level security;
revoke all on public.coach_health_records from public, anon, authenticated;
revoke all on sequence public.coach_health_records_id_seq from public, anon, authenticated;
grant select, insert, update, delete on public.coach_health_records to service_role;
grant usage, select on sequence public.coach_health_records_id_seq to service_role;
create index if not exists coach_health_profile_time on public.coach_health_records(profile_id, device_id, start_time);

create or replace function public.coach_ingest_health(p_profile text, p_device text, p_records jsonb)
returns integer language plpgsql security invoker set search_path = public, pg_temp as $$
declare r jsonb;
begin
  if p_profile is null or p_profile = '' or p_device is null or p_device = '' or
     jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) not between 1 and 200 then
    raise exception 'invalid_batch';
  end if;
  for r in select value from jsonb_array_elements(p_records) loop
    insert into public.coach_health_records as current_record (
      profile_id,device_id,record_type,source_id,source_package,last_modified_time,start_time,end_time,
      start_zone_offset_seconds,end_zone_offset_seconds,data
    ) values (
      p_profile,p_device,r->>'recordType',r->>'sourceId',r->>'sourcePackage',
      (r->>'lastModifiedTime')::timestamptz,(r->>'startTime')::timestamptz,(r->>'endTime')::timestamptz,
      (r->>'startZoneOffsetSeconds')::integer,(r->>'endZoneOffsetSeconds')::integer,r->'data'
    ) on conflict (profile_id,device_id,record_type,source_id) do update set
      source_package = excluded.source_package, last_modified_time = excluded.last_modified_time,
      start_time = excluded.start_time, end_time = excluded.end_time,
      start_zone_offset_seconds = excluded.start_zone_offset_seconds,
      end_zone_offset_seconds = excluded.end_zone_offset_seconds,
      data = excluded.data, received_at = now()
    where excluded.last_modified_time > current_record.last_modified_time;
    -- excluded/exclusion_reason no se sobrescriben con reimportaciones.
  end loop;
  return jsonb_array_length(p_records);
end;
$$;
revoke all on function public.coach_ingest_health(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.coach_ingest_health(text,text,jsonb) to service_role;
commit;

-- Exclusión manual posterior, sólo tras revisar el sourceId real. NO ejecutar con un ID supuesto:
-- update public.coach_health_records set excluded = true, exclusion_reason = 'Prueba técnica Samsung, no actividad real'
-- where profile_id = :profile and device_id = :device and record_type = 'exercise_session' and source_id = :verified_source_id;
