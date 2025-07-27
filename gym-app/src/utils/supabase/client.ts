import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pyijssavikrgttishppb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aWpzc2F2aWtyZ3R0aXNocHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTY2OTMsImV4cCI6MjA2OTE3MjY5M30.NT8AvO6DATBhKwg6aa8_Iy2lMAok5KxcK32fcMG6uYU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)