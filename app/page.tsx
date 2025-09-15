'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('HomePage useEffect:', { user: !!user, loading })
    if (!loading) {
      if (user) {
        console.log('Redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('Redirecting to login')
        router.push('/auth/login')
      }
    }
  }, [user, loading, router])

  console.log('HomePage render:', { user: !!user, loading })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              L
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Leo's Coupon & Cashback App
          </h1>
          <p className="text-gray-600 mb-4">
            Coupon Management und Cashback Tracking
          </p>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return null
}
