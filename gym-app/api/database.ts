import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  WORKOUT_PROGRESS: 'gym-app-workout-progress',
  SHOPPING_LISTS: 'gym-app-shopping-lists',
  THEME: 'gym-app-theme',
  TABLE_COLUMNS: 'gym-app-table-columns',
  CURRENT_WEEK: 'gym-app-current-week',
  CURRENT_DAY: 'gym-app-current-day',
} as const;

let supabaseClient: any = null;

async function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://pyijssavikrgttishppb.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aWpzc2F2aWtyZ3R0aXNocHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTY2OTMsImV4cCI6MjA2OTE3MjY5M30.NT8AvO6DATBhKwg6aa8_Iy2lMAok5KxcK32fcMG6uYU';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase credentials not configured');
    throw new Error('Supabase credentials not configured');
  }

  console.log('🔄 Connecting to Supabase...');
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Connected to Supabase successfully');
  return supabaseClient;
}

async function ensureUser(sessionId: string) {
  const supabase = await getSupabaseClient();
  
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUser) {
    return existingUser.id;
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ session_id: sessionId })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return newUser.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🚀 API called:', req.method, req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  try {
    console.log('📨 Request body:', req.body);
    
    const supabase = await getSupabaseClient();
    const { action, key, value, userId } = req.body;

    if (!userId) {
      console.error('❌ Missing userId in request');
      return res.status(400).json({ error: 'userId is required' });
    }

    const dbUserId = await ensureUser(userId);
    console.log('🔑 Performing action:', action, 'for user:', dbUserId, 'key:', key);

    switch (action) {
      case 'get':
        const { data: setting, error: getError } = await supabase
          .from('user_settings')
          .select('setting_value')
          .eq('user_id', dbUserId)
          .eq('setting_key', key)
          .single();

        if (getError && getError.code !== 'PGRST116') {
          throw getError;
        }

        console.log('📖 Retrieved item:', setting ? 'found' : 'not found');
        return res.status(200).json({ data: setting?.setting_value || null });

      case 'set':
        const { error: setError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: dbUserId,
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,setting_key'
          });

        if (setError) {
          throw setError;
        }

        console.log('💾 Saved item successfully');
        return res.status(200).json({ success: true });

      case 'delete':
        const { error: deleteError } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', dbUserId)
          .eq('setting_key', key);

        if (deleteError) {
          throw deleteError;
        }

        console.log('🗑️ Deleted item successfully');
        return res.status(200).json({ success: true });

      case 'clear':
        const settingKeys = Object.values(STORAGE_KEYS);
        const { error: clearError } = await supabase
          .from('user_settings')
          .delete()
          .eq('user_id', dbUserId)
          .in('setting_key', settingKeys);

        if (clearError) {
          throw clearError;
        }

        console.log('🧹 Cleared all data successfully');
        return res.status(200).json({ success: true });

      default:
        console.error('❌ Invalid action:', action);
        return res.status(400).json({ error: 'Invalid action', received: action });
    }
  } catch (error) {
    console.error('💥 Database API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}