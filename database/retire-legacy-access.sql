-- Retire the old app, preserving every historical row and all Coach RPCs.
-- The postgres owner retains access; application roles cannot read or mutate
-- archived tables, including old deployments using the service_role key.
begin;
revoke all privileges on table
  public.workout_progress,
  public.shopping_lists,
  public.user_settings,
  public.definicion_workout_progress,
  public.definicion_shopping_lists,
  public.definicion_body_composition,
  public.definicion_cardio_logs,
  public.definicion_daily_weights,
  public.definicion_settings,
  public.volume_workout_progress,
  public.volume_shopping_lists,
  public.volume_settings
from public, anon, authenticated, service_role;
commit;
