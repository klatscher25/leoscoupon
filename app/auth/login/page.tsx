'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { clearSupabaseCache } from '@/utils/clearBrowserCache'
import LoginDebugger from '@/components/auth/LoginDebugger'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  
  const { user } = useAuth()
  const router = useRouter()

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
        errorMessage = 'Verbindung zeitüberschritten. Cache wird geleert...';
        clearSupabaseCache()
        setTimeout(() => {
          setError('Bitte versuche es erneut nach dem Cache-Clearing.')
        }, 1000)
      } else if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Ungültige Anmeldedaten. Bitte überprüfe E-Mail und Passwort.'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4">
            <div className="w-full h-full bg-primary-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              L
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Willkommen zurück
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Melde dich in deinem Konto an
          </p>
        </div>

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
              {retryCount >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    clearSupabaseCache()
                    setError('Cache geleert! Versuche es jetzt erneut.')
                    setRetryCount(0)
                  }}
                  className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-800"
                >
                  🗑️ Cache manuell leeren
                </button>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-sm text-gray-600">
              Noch kein Konto?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Jetzt registrieren
              </Link>
            </p>
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
