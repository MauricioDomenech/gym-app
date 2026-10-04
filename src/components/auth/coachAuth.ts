import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_COACH_SUPABASE_URL;
const key = import.meta.env.VITE_COACH_SUPABASE_PUBLIC_KEY;

// Only the publishable/anon key belongs in Vite. No service-role key here.
export const coachAuth = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'coach-auth-v1' },
}) : null;
