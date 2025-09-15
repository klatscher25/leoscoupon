'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'

export default function AdminAnalytics() {
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Nutzungsstatistiken und App-Performance
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Statistiken werden in Kürze verfügbar sein
          </h2>
          <p className="text-gray-600">
            Hier werden Charts für Coupon-Einlösungen, Cashback-Trends und Nutzer-Aktivität angezeigt.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
