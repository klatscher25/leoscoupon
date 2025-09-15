'use client'

import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile } from '@/lib/auth'
import { UserIcon, KeyIcon, CreditCardIcon } from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    payback_account_id: profile?.payback_account_id || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await updateProfile({
        username: formData.username,
        payback_account_id: formData.payback_account_id || null
      })
      setMessage('Profil erfolgreich aktualisiert')
    } catch (error: any) {
      setMessage('Fehler beim Aktualisieren: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
          <p className="text-gray-600">Verwalte deine Kontoinformationen</p>
        </div>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Grundinformationen</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-Mail-Adresse</label>
                <input
                  type="email"
                  className="input bg-gray-50"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  E-Mail-Adresse kann nicht geändert werden
                </p>
              </div>

              <div>
                <label className="label">Benutzername</label>
                <input
                  type="text"
                  className="input"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="label">Payback-Nummer (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.payback_account_id}
                  onChange={(e) => setFormData({...formData, payback_account_id: e.target.value})}
                  placeholder="z.B. 1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Wird für Coupon-Einlösungs-Limits verwendet
                </p>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.includes('erfolgreich') 
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Speichern...' : 'Profil aktualisieren'}
              </button>
            </form>
          </div>

          {/* Account Info */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <KeyIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Konto-Details</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rolle:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  profile?.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile?.role === 'admin' ? 'Administrator' : 'Benutzer'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mitglied seit:</span>
                <span className="text-sm text-gray-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('de-DE') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Banking Info Placeholder */}
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Auszahlungskonten</h2>
            </div>
            
            <div className="text-center py-8 text-gray-500">
              <CreditCardIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Auszahlungskonten-Verwaltung</p>
              <p className="text-xs">Wird in einer zukünftigen Version verfügbar sein</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
