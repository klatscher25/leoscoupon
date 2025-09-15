'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { isValidEmail } from '@/utils/helpers'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'E-Mail-Adresse ist erforderlich'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse'
    }

    if (!formData.username) {
      newErrors.username = 'Benutzername ist erforderlich'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Benutzername muss mindestens 3 Zeichen lang sein'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Benutzername darf nur Buchstaben, Zahlen und _ enthalten'
    }

    if (!formData.password) {
      newErrors.password = 'Passwort ist erforderlich'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      await signUp(formData.email, formData.password, formData.username)
      router.push('/dashboard')
    } catch (err: any) {
      setErrors({ submit: err.message || 'Registrierung fehlgeschlagen' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
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
            Konto erstellen
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Registriere dich für Leo&apos;s Coupon App
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
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="name@beispiel.de"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="label">
                Benutzername
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={`input ${errors.username ? 'input-error' : ''}`}
                placeholder="benutzername"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Nur Buchstaben, Zahlen und Unterstriche erlaubt
              </p>
            </div>
            
            <div>
              <label htmlFor="password" className="label">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`input ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Passwort bestätigen
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{errors.submit}</div>
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
                  Registrieren...
                </div>
              ) : (
                'Konto erstellen'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Bereits ein Konto?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Jetzt anmelden
              </Link>
            </p>
          </div>
        </form>

        {/* Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="text-center text-xs text-gray-500">
            Diese App ist nur für Familienmitglieder bestimmt.
            <br />
            Nach der Registrierung kannst du alle Features nutzen.
          </div>
        </div>
      </div>
    </div>
  )
}
