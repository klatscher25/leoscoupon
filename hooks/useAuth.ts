import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClientComponentClient } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { clearSupabaseCache, detectCacheIssue } from '@/utils/clearBrowserCache'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

// Detect Safari iOS for special handling
function isSafariIOS(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true
  })
  
  useEffect(() => {
    console.log('🔍 useAuth useEffect started')
    
    // Safari iOS specific handling
    if (isSafariIOS()) {
      console.log('📱 Safari iOS detected in useAuth')
      // More aggressive cache clearing for iOS
      if (detectCacheIssue()) {
        console.log('🗑️ iOS Cache issues detected, clearing all storage...')
        localStorage.clear()
        sessionStorage.clear()
        clearSupabaseCache()
      }
    } else {
      // Check for cache issues first (like corrupted sessions)
      if (detectCacheIssue()) {
        console.log('🗑️ Cache issues detected, clearing...')
        clearSupabaseCache()
      }
    }
    
    // Create supabase client inside useEffect to prevent re-creation
    const supabase = createClientComponentClient()
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // iOS Safari needs shorter timeouts
        const sessionTimeoutMs = isSafariIOS() ? 8000 : 15000
        console.log(`⏱️ Using ${sessionTimeoutMs}ms timeout for ${isSafariIOS() ? 'iOS Safari' : 'Desktop/Android'}`)
        
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Session timeout (${sessionTimeoutMs}ms)`)), sessionTimeoutMs)
        )
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setAuthState({
            user: null,
            profile: null,
            loading: false
          })
          return
        }
        
        console.log('🔍 Session result:', { hasSession: !!session, hasUser: !!session?.user })
        
        if (session?.user) {
          console.log('🔍 User found, getting profile...')
          // Get profile with error handling
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileError) {
            console.error('Profile error:', profileError)
            console.log('🔍 Setting auth state (user without profile)')
            // Still set user but without profile
            setAuthState({
              user: session.user,
              profile: null,
              loading: false
            })
          } else {
            console.log('🔍 Setting auth state (user with profile)', profile?.username)
            setAuthState({
              user: session.user,
              profile,
              loading: false
            })
          }
        } else {
          console.log('🔍 No user found, setting auth state to empty')
          setAuthState({
            user: null,
            profile: null,
            loading: false
          })
        }
      } catch (error) {
        console.error('Auth error:', error)
        
        // If session times out or fails, clear cache and retry once
        if (error && typeof error === 'object' && 'message' in error && (error.message as string).includes('Session timeout')) {
          console.log('🗑️ Session timeout - clearing cache and setting to logged out')
          
          if (isSafariIOS()) {
            console.log('📱 iOS Session timeout - aggressive cleanup')
            localStorage.clear()
            sessionStorage.clear()
            clearSupabaseCache()
            // iOS needs immediate reload
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = window.location.href // Force hard reload on iOS
              }
            }, 500)
          } else {
            clearSupabaseCache()
            // Force page reload to reset all state after cache clear
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
            }, 1000)
          }
        }
        
        setAuthState({
          user: null,
          profile: null,
          loading: false
        })
      }
    }
    
    console.log('🔍 Calling getInitialSession')
    getInitialSession()
    
    // Listen for auth changes
    console.log('🔍 Setting up auth state change listener')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 Auth state changed:', event)
      
      // iOS Safari: Add delay for auth state changes to prevent race conditions
      if (isSafariIOS() && event === 'SIGNED_IN') {
        console.log('📱 iOS Safari SIGNED_IN - adding stability delay...')
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      try {
        if (session?.user) {
          console.log('🔍 Processing session with user:', session.user.id)
          
          // iOS Safari: Ensure session persistence
          if (isSafariIOS()) {
            // Force session storage refresh for iOS
            try {
              await supabase.auth.getSession()
              console.log('📱 iOS: Session refreshed successfully')
            } catch (error) {
              console.warn('📱 iOS: Session refresh warning:', error)
            }
          }
          
          // Get profile with error handling
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (profileError) {
            console.error('Profile error in auth change:', profileError)
            // Still set user but without profile
            setAuthState({
              user: session.user,
              profile: null,
              loading: false
            })
          } else {
            console.log('🔍 Setting auth state with profile:', profile?.username)
            setAuthState({
              user: session.user,
              profile,
              loading: false
            })
          }
        } else {
          console.log('🔍 No session user - clearing auth state')
          setAuthState({
            user: null,
            profile: null,
            loading: false
          })
        }
      } catch (error) {
        console.error('Auth change error:', error)
        
        // iOS Safari specific error handling
        if (isSafariIOS()) {
          console.log('📱 iOS Auth change error - applying fixes...')
          localStorage.clear()
          sessionStorage.clear()
          clearSupabaseCache()
        }
        
        setAuthState({
          user: null,
          profile: null,
          loading: false
        })
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  const isAdmin = authState.profile?.role === 'admin'
  
  return {
    ...authState,
    isAdmin
  }
}
