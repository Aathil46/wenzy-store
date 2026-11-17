import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmmdcbpgyxgtrvhdildo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbWRjYnBneXhndHJ2aGRpbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NTY3MjUsImV4cCI6MjExMDQzMjcyNX0.rIvOzAjDo0pP-zdYvQQIscU82EAWA9YF9ytXxlFWrS4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
