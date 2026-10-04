-- SDK 1.1.0 single-instant series: preserve exact timestamps and all existing rows.
begin;
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

commit;
