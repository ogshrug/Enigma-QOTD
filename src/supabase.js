import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'Fill in .env and RESTART the dev server.'
  )
}

// Even if config is missing, never crash the app at import time — requests will
// simply fail and surface in the UI instead of a white page.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)