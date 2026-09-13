import { createClient } from '@supabase/supabase-js'

// Retrieve credentials from environment variables or direct defaults
let rawUrl = import.meta.env.VITE_SUPABASE_URL || 'your_supabase_project_url_here'
let rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ||'your_supabase_anon_key_here'

// Sanitize URL: Remove trailing slashes and /rest/v1 if included
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')

export const supabase = createClient(cleanUrl, rawKey)

export const isSupabaseConfigured = () => {
  return (
    cleanUrl !== 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co' &&
    rawKey !== 'YOUR_SUPABASE_ANON_KEY' &&
    Boolean(cleanUrl && rawKey)
  )
}
