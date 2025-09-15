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

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true
  })
  
  useEffect(() => {
    console.log('🔍 useAuth useEffect started')
    
    // Check for cache issues first (like corrupted sessions)
    if (detectCacheIssue()) {
      console.log('🗑️ Cache issues detected, clearing...')
      clearSupabaseCache()
    }
    
    // Create supabase client inside useEffect to prevent re-creation
    const supabase = createClientComponentClient()
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        
        // Add timeout to prevent infinite hanging
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 10000)
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
        if (error && typeof error === 'object' && 'message' in error && error.message === 'Session timeout') {
          console.log('🗑️ Session timeout - clearing cache and setting to logged out')
          clearSupabaseCache()
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
      try {
        if (session?.user) {
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
            setAuthState({
              user: session.user,
              profile,
              loading: false
            })
          }
        } else {
          setAuthState({
            user: null,
            profile: null,
            loading: false
          })
        }
      } catch (error) {
        console.error('Auth change error:', error)
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
