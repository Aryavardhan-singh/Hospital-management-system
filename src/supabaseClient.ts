import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Sanitize URL: Remove trailing slashes and /rest/v1 if included
const cleanUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') : ''

export const isSupabaseConfigured = () => {
  return (
    Boolean(cleanUrl && rawKey) &&
    cleanUrl !== 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co' &&
    cleanUrl !== 'your_supabase_project_url_here' &&
    cleanUrl.startsWith('http') &&
    rawKey !== 'YOUR_SUPABASE_ANON_KEY' &&
    rawKey !== 'your_supabase_anon_key_here'
  )
}

// Ensure createClient is initialized with a valid URL structure so it never crashes module initialization
const validUrl = isSupabaseConfigured() ? cleanUrl : 'https://placeholder.supabase.co'
const validKey = isSupabaseConfigured() ? rawKey : 'dummy-anon-key'

export const supabase = createClient(validUrl, validKey)
