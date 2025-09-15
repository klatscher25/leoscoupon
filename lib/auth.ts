import { createClientComponentClient } from './supabase'
import { User } from '@supabase/supabase-js'
import { Database } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export async function signUp(email: string, password: string, username: string) {
  const supabase = createClientComponentClient()
  
  // First, check if username is already taken
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single()
    
  if (existingProfile) {
    throw new Error('Username bereits vergeben')
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      }
    }
  })
  
  if (error) throw error
  
  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        username,
        role: 'user'
      })
      
    if (profileError) throw profileError
  }
  
  return data
}

// Detect Safari iOS
function isSafariIOS(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
}

export async function signIn(email: string, password: string) {
  const supabase = createClientComponentClient()
  
  try {
    console.log('🔐 Attempting login with mobile optimization...')
    
    // Safari iOS needs different handling
    if (isSafariIOS()) {
      console.log('📱 Safari iOS detected - using optimized flow')
      
      // Clear any existing sessions first on iOS
      try {
        await supabase.auth.signOut()
        console.log('🧹 iOS: Previous session cleared')
      } catch (e) {
        console.log('🧹 iOS: No previous session to clear')
      }
      
      // Shorter timeout for iOS (Safari timeouts faster)
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('iOS Login timeout - Safari begrenzt Verbindungszeit')), 10000)
      )
      
      const { data, error } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any
      
      if (error) {
        console.error('🚫 iOS Login error:', error)
        throw error
      }
      
      console.log('✅ iOS Login successful')
      return data
      
    } else {
      // Desktop/Android - original flow with longer timeout
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - Bitte versuche es erneut')), 20000)
      )
      
      const { data, error } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any
      
      if (error) {
        console.error('🚫 Login error:', error)
        throw error
      }
      
      console.log('✅ Login successful')
      return data
    }
    
  } catch (error: any) {
    // iOS-specific error handling
    if (isSafariIOS()) {
      console.log('📱 iOS Error handling - clearing all storage')
      if (typeof window !== 'undefined') {
        // More aggressive cache clearing for iOS
        localStorage.clear()
        sessionStorage.clear()
        const { clearSupabaseCache } = await import('@/utils/clearBrowserCache')
        clearSupabaseCache()
      }
    } else {
      // Clear cache on login failure to prevent stuck state
      if (typeof window !== 'undefined') {
        const { clearSupabaseCache } = await import('@/utils/clearBrowserCache')
        clearSupabaseCache()
      }
    }
    throw error
  }
}

export async function signOut() {
  const supabase = createClientComponentClient()
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
    
  return profile
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = createClientComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
