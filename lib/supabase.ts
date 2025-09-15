import { createClient, SupabaseClient } from '@supabase/supabase-js'
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
let clientInstance: SupabaseClient<Database> | null = null

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
            // Enhanced storage handling for iOS Safari
            getItem: (key: string) => {
              try {
                // Try localStorage first
                const value = localStorage.getItem(key)
                if (value !== null) {
                  return value
                }
                // Fallback to sessionStorage for iOS
                return sessionStorage.getItem(key)
              } catch (error) {
                console.log('📱 iOS storage blocked for key:', key, error)
                return null
              }
            },
            setItem: (key: string, value: string) => {
              try {
                // Try both localStorage and sessionStorage for iOS reliability
                localStorage.setItem(key, value)
                sessionStorage.setItem(key, value)
              } catch (error) {
                try {
                  // Fallback to sessionStorage only
                  sessionStorage.setItem(key, value)
                } catch (error2) {
                  console.log('📱 iOS all storage blocked for key:', key, error2)
                }
              }
            },
            removeItem: (key: string) => {
              try {
                localStorage.removeItem(key)
                sessionStorage.removeItem(key)
              } catch (error) {
                console.log('📱 iOS storage removal blocked for key:', key, error)
              }
            },
          },
          // iOS optimized settings
          detectSessionInUrl: false, // Prevent iOS Safari issues with URL fragments
          persistSession: true,
          autoRefreshToken: true,
          // More secure auth flow for iOS stability
          flowType: 'pkce' as const, // More secure and reliable for iOS
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
