'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import {
  TicketIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

const adminModules = [
  {
    name: 'Coupon Management',
    description: 'Payback Coupons verwalten und neue hinzufügen',
    href: '/admin/coupons',
    icon: TicketIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Cashback Campaigns',
    description: 'Cashback-Aktionen erstellen und verwalten',
    href: '/admin/cashback',
    icon: CurrencyDollarIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Analytics',
    description: 'Nutzungsstatistiken und Reports',
    href: '/admin/analytics',
    icon: ChartBarIcon,
    color: 'bg-purple-500'
  },
  {
    name: 'User Management',
    description: 'Benutzer und Rollen verwalten',
    href: '/admin/users',
    icon: UsersIcon,
    color: 'bg-orange-500'
  }
]

export default function AdminDashboard() {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Verwalte Coupons, Cashback-Aktionen und überwache die App-Nutzung
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TicketIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aktive Coupons
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Cashback Aktionen
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aktive Nutzer
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      1
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Einlösungen heute
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      0
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Modules */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Admin Module</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {adminModules.map((module) => (
              <Link
                key={module.name}
                href={module.href}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 ${module.color} p-3 rounded-md`}>
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {module.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
