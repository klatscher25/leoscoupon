import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Detect Safari iOS for special client handling
function isSafariIOS(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
}

// SINGLETON CLIENT PATTERN - verhindert Multiple GoTrueClient instances
let clientInstance: ReturnType<typeof createClient<Database>> | null = null

// Nur echten Client erstellen wenn Environment Variables verfügbar
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client-side Supabase client (Singleton with iOS optimization)
export const createClientComponentClient = () => {
  if (!clientInstance) {
    const clientConfig = {
      auth: {
        // iOS Safari specific settings
        ...(isSafariIOS() && {
          storage: {
            // Use memory storage as fallback for iOS Safari
            getItem: (key: string) => {
              try {
                return localStorage.getItem(key)
              } catch {
                console.log('📱 iOS localStorage blocked, using memory fallback')
                return null
              }
            },
            setItem: (key: string, value: string) => {
              try {
                localStorage.setItem(key, value)
              } catch {
                console.log('📱 iOS localStorage blocked for key:', key)
              }
            },
            removeItem: (key: string) => {
              try {
                localStorage.removeItem(key)
              } catch {
                console.log('📱 iOS localStorage blocked for removal:', key)
              }
            },
          },
          // Shorter timeouts for iOS
          detectSessionInUrl: false, // Prevent iOS Safari issues with URL fragments
          persistSession: true,
          autoRefreshToken: true,
        }),
        // Default settings for other browsers
        ...(!isSafariIOS() && {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        })
      }
    }
    
    clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, clientConfig)
    
    if (isSafariIOS()) {
      console.log('📱 Supabase client created with iOS Safari optimizations')
    }
  }
  return clientInstance
}

// Server-side Supabase client
export const createServerComponentClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}
