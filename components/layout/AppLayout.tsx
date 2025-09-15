'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navigation from './Navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              L
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Leo's Coupon App
          </h1>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
