import { createClient } from '@supabase/supabase-js'

export async function createServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://pyijssavikrgttishppb.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aWpzc2F2aWtyZ3R0aXNocHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTY2OTMsImV4cCI6MjA2OTE3MjY5M30.NT8AvO6DATBhKwg6aa8_Iy2lMAok5KxcK32fcMG6uYU'
  
  return createClient(supabaseUrl, supabaseServiceKey)
}