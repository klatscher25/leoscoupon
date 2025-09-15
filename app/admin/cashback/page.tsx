'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'

export default function AdminCashback() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return null
  }

  if (!isAdmin) {
    return null
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cashback Campaign Management</h1>
          <p className="mt-2 text-gray-600">
            Verwalte Cashback-Aktionen für alle Partner-Geschäfte
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Neue Cashback-Aktion erstellen
          </h2>
          <p className="text-gray-600">
            Diese Seite wird in Kürze verfügbar sein...
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
