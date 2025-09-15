'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { clearSupabaseCache } from '@/utils/clearBrowserCache'
import LoginDebugger from '@/components/auth/LoginDebugger'

// Detect Safari iOS
function isSafariIOS(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [isMobileSafari, setIsMobileSafari] = useState(false)
  
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    setIsMobileSafari(isSafariIOS())
    if (isSafariIOS()) {
      console.log('📱 Safari iOS detected on login page')
    }
  }, [])

  useEffect(() => {
    if (user) {
      console.log('🔄 User authenticated, redirecting to dashboard...')
      setLoading(false) // Ensure loading stops
      router.push('/dashboard')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🔐 Starting login process...')
      const result = await signIn(email, password)
      console.log('✅ Login successful:', !!result.user)
      
      // Don't redirect here - let useAuth hook handle it to prevent race condition
      // router.push('/dashboard') - REMOVED to prevent double redirect
      
    } catch (err: any) {
      console.error('❌ Login error:', err)
      setRetryCount(prev => prev + 1)
      
      let errorMessage = err.message || 'Anmeldung fehlgeschlagen'
      
      // Provide helpful error messages and retry logic
      if (err.message?.includes('timeout')) {
        if (isMobileSafari) {
          errorMessage = 'Safari iOS Timeout. Lade Seite neu...';
          // iOS specific handling
          localStorage.clear()
          sessionStorage.clear()
          clearSupabaseCache()
          setTimeout(() => {
            window.location.href = window.location.href // Hard reload for iOS
          }, 1000)
        } else {
          errorMessage = 'Verbindung zeitüberschritten. Cache wird geleert...';
          clearSupabaseCache()
          setTimeout(() => {
            setError('Bitte versuche es erneut nach dem Cache-Clearing.')
          }, 1000)
        }
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.'
      } else if (retryCount >= 1 && isMobileSafari) {
        // iOS Safari fails faster, so retry earlier
        errorMessage = 'Safari iOS Problem. Seite wird neu geladen...';
        localStorage.clear()
        sessionStorage.clear()
        clearSupabaseCache()
        setTimeout(() => {
          window.location.href = window.location.href
        }, 1000)
      } else if (retryCount >= 2) {
        errorMessage = 'Mehrere Versuche fehlgeschlagen. Cache wird geleert...';
        clearSupabaseCache()
        setTimeout(() => {
          setError('Seite wird neu geladen...')
          window.location.reload()
        }, 2000)
      }
      
      setError(errorMessage)
      setLoading(false) // Only set loading to false on error
    }
    // Don't set loading to false on success - let redirect handle it
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-sm w-full space-y-8">
          {/* Verbessertes Logo */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
                L
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Willkommen zurück!
            </h2>
            <p className="text-gray-600 text-lg">
              Melde dich an, um fortzufahren
            </p>
          </div>

        {/* Safari iOS Warnung */}
        {isMobileSafari && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="text-blue-600 text-sm">
                📱 <strong>Safari iOS erkannt:</strong> Falls Login nicht funktioniert:
                <ul className="mt-2 ml-4 list-disc text-xs">
                  <li>Stelle sicher, dass Safari Cookies erlaubt sind</li>
                  <li>Deaktiviere "Cross-Site Tracking verhindern" temporär</li>
                  <li>Versuche es im "Privaten Modus" von Safari</li>
                  <li>Alternative: Verwende Chrome/Firefox auf iOS</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="label">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700 mb-2">{error}</div>
              {retryCount >= (isMobileSafari ? 1 : 2) && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isMobileSafari) {
                        localStorage.clear()
                        sessionStorage.clear()
                        clearSupabaseCache()
                        setError('iOS Cache komplett geleert! Versuche es jetzt erneut.')
                      } else {
                        clearSupabaseCache()
                        setError('Cache geleert! Versuche es jetzt erneut.')
                      }
                      setRetryCount(0)
                    }}
                    className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-800 mr-2"
                  >
                    🗑️ {isMobileSafari ? 'iOS Cache leeren' : 'Cache leeren'}
                  </button>
                  
                  {isMobileSafari && (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = window.location.href // Hard reload
                      }}
                      className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-blue-800"
                    >
                      🔄 Seite neu laden
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  {retryCount > 0 ? `Anmelden... (Versuch ${retryCount + 1})` : 'Anmelden...'}
                </div>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>

          <div className="text-center">
            {isMobileSafari && (
              <p className="text-xs text-blue-600 mt-2">
                Login-Probleme?{' '}
                <Link
                  href="/auth/safari-help"
                  className="font-medium underline"
                >
                  Safari iOS Hilfe →
                </Link>
              </p>
            )}
          </div>
        </form>

        {/* Debug Tool - nur in Development */}
        {process.env.NODE_ENV === 'development' && <LoginDebugger />}

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500 mb-4">
            Mit der App kannst du:
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="text-lg mr-2">🎫</span>
              Coupons verwalten und einlösen
            </div>
            <div className="flex items-center text-gray-600">
              <span className="text-lg mr-2">💰</span>
              Cashback-Aktionen tracken
            </div>
            <div className="flex items-center text-gray-600">
              <span className="text-lg mr-2">📱</span>
              Einkäufe optimal planen
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
