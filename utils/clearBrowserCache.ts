/**
 * Utility functions to clear browser cache and reset Supabase sessions
 * Löst Cache-Probleme die nur im Inkognito-Modus funktionieren
 */

export function clearSupabaseCache() {
  if (typeof window === 'undefined') return // Server-side protection
  
  try {
    // Clear all Supabase-related localStorage entries
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('supabase.auth.token') ||
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('session')
      )) {
        keysToRemove.push(key)
      }
    }
    
    // Remove all found keys
    keysToRemove.forEach(key => {
      console.log('🗑️ Clearing cache key:', key)
      localStorage.removeItem(key)
    })
    
    // Clear sessionStorage too
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (
        key.startsWith('supabase') ||
        key.startsWith('sb-') ||
        key.includes('auth')
      )) {
        sessionKeysToRemove.push(key)
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      console.log('🗑️ Clearing session key:', key)
      sessionStorage.removeItem(key)
    })
    
    console.log('✅ Browser cache cleared successfully')
    return true
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
    return false
  }
}

export function forceLogout() {
  clearSupabaseCache()
  // Redirect to login after clearing cache
  window.location.href = '/auth/login'
}

export function detectCacheIssue(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Check for potential problematic cache entries
    const problematicKeys = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('supabase.auth.token')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            // Check if token is expired or malformed
            if (!parsed.access_token || !parsed.expires_at) {
              problematicKeys.push(key)
            }
          } catch {
            problematicKeys.push(key)
          }
        }
      }
    }
    
    return problematicKeys.length > 0
  } catch {
    return false
  }
}
