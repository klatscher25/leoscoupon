import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// SINGLETON CLIENT PATTERN - verhindert Multiple GoTrueClient instances
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

// Nur echten Client erstellen wenn Environment Variables verfügbar
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client-side Supabase client (Singleton)
export const createClientComponentClient = () => {
  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return clientInstance
}

// Server-side Supabase client
export const createServerComponentClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}
