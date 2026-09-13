import { createClient } from '@supabase/supabase-js'

// Retrieve credentials from environment variables or direct defaults
let rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uyvfzyhzfkyvqnwbpxxr.supabase.co'
let rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dmZ6eWh6Zmt5dnFud2JweHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMjg0NTMsImV4cCI6MjEwNDgwNDQ1M30.qRI3KvLWgNd3VxqvTycSi0Texhcr8Xq8TV_jyV3byck'

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
