'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import { createClientComponentClient } from '@/lib/supabase'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/utils/helpers'
import {
  TicketIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalCoupons: number
  activeCoupons: number
  usedCoupons: number
  expiringCoupons: number
  totalCashbackSubmissions: number
  pendingCashback: number
  approvedCashback: number
  totalCashbackAmount: number
}

export default function DashboardPage() {
  const { user, profile, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDashboardStats()
  }, [user])

  const loadDashboardStats = async () => {
    if (!user) return

    try {
      // Get coupon stats
      const { data: allCoupons } = await supabase
        .from('coupons')
        .select('id, valid_until')
        .eq('is_active', true)

      const { data: usedCoupons } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('user_id', user.id)

      // Get cashback stats
      const { data: cashbackSubmissions } = await supabase
        .from('cashback_submissions')
        .select('id, status, amount')
        .eq('user_id', user.id)

      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const activeCoupons = allCoupons?.filter(c => new Date(c.valid_until) >= now) || []
      const expiringCoupons = activeCoupons.filter(c => new Date(c.valid_until) <= nextWeek)

      const pendingSubmissions = cashbackSubmissions?.filter(s => 
        s.status === 'entwurf' || s.status === 'eingereicht'
      ) || []
      
      const approvedSubmissions = cashbackSubmissions?.filter(s => 
        s.status === 'genehmigt' || s.status === 'ausgezahlt'
      ) || []

      const totalAmount = cashbackSubmissions?.reduce((sum, s) => 
        s.status === 'ausgezahlt' ? sum + s.amount : sum, 0
      ) || 0

      setStats({
        totalCoupons: allCoupons?.length || 0,
        activeCoupons: activeCoupons.length,
        usedCoupons: usedCoupons?.length || 0,
        expiringCoupons: expiringCoupons.length,
        totalCashbackSubmissions: cashbackSubmissions?.length || 0,
        pendingCashback: pendingSubmissions.length,
        approvedCashback: approvedSubmissions.length,
        totalCashbackAmount: totalAmount
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'primary',
    subtitle,
    href 
  }: {
    title: string
    value: string | number
    icon: any
    color?: 'primary' | 'success' | 'warning' | 'danger'
    subtitle?: string
    href?: string
  }) => {
    const colorClasses = {
      primary: 'bg-primary-50 text-primary-600',
      success: 'bg-success-50 text-success-600',
      warning: 'bg-warning-50 text-warning-600',
      danger: 'bg-danger-50 text-danger-600'
    }

    const card = (
      <div className="card card-hover p-6 cursor-pointer">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    )

    return href ? <Link href={href}>{card}</Link> : card
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Willkommen zurück, {profile?.username}! 👋
          </h1>
          <p className="text-gray-600">
            Nutze deine Coupons optimal beim Einkaufen
          </p>
        </div>

        {/* Hauptfunktionen - Prominente CTA Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* COUPON EINLÖSEN - Hauptfunktion */}
          <Link 
            href="/coupons/redeem"
            className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl p-8 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats?.activeCoupons || 0}</div>
                  <div className="text-green-100 text-sm">verfügbar</div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Coupons einlösen</h2>
              <p className="text-green-100 mb-4">
                Wähle deinen Laden und maximiere deine Ersparnisse
              </p>
              <div className="flex items-center text-sm font-medium">
                <span>Jetzt einlösen</span>
                <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          </Link>

          {/* CASHBACK TRACKING - Zweite Hauptfunktion */}
          <Link 
            href="/cashback"
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl p-8 text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <CurrencyDollarIcon className="h-8 w-8" />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{formatCurrency(stats?.totalCashbackAmount || 0)}</div>
                  <div className="text-blue-100 text-sm">erhalten</div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Cashback tracken</h2>
              <p className="text-blue-100 mb-4">
                Verfolge deine Cashback-Aktionen und Auszahlungen
              </p>
              <div className="flex items-center text-sm font-medium">
                <span>Status anzeigen</span>
                <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="ml-4 flex-1">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Verfügbare Coupons"
                value={stats?.activeCoupons || 0}
                icon={TicketIcon}
                color="primary"
                href="/coupons"
              />
              
              <StatCard
                title="Eingelöste Coupons"
                value={stats?.usedCoupons || 0}
                icon={CheckCircleIcon}
                color="success"
                href="/coupons?tab=used"
              />
              
              <StatCard
                title="Laufen bald ab"
                value={stats?.expiringCoupons || 0}
                icon={ExclamationTriangleIcon}
                color="warning"
                subtitle="Nächste 7 Tage"
                href="/coupons?filter=expiring"
              />
              
              <StatCard
                title="Cashback erhalten"
                value={formatCurrency(stats?.totalCashbackAmount || 0)}
                icon={CurrencyDollarIcon}
                color="success"
                href="/cashback"
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Coupon Actions */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Coupon Aktionen
                </h2>
                <div className="space-y-3">
                  <Link 
                    href="/coupons" 
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <TicketIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Coupons durchsuchen</div>
                      <div className="text-sm text-gray-600">Verfügbare Angebote finden</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/coupons/scanner" 
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h5m3 0h6M4 4h5m3 0h6" />
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">Barcode scannen</div>
                      <div className="text-sm text-gray-600">Coupon direkt einlösen</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Cashback Actions */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Cashback Aktionen
                </h2>
                <div className="space-y-3">
                  <Link 
                    href="/cashback/campaigns" 
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Aktuelle Aktionen</div>
                      <div className="text-sm text-gray-600">Neue Cashback-Möglichkeiten</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/cashback/submit" 
                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div>
                      <div className="font-medium text-gray-900">Cashback einreichen</div>
                      <div className="text-sm text-gray-600">Neuen Antrag erstellen</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Admin Panel */}
            {isAdmin && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Admin Funktionen
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link 
                    href="/admin/coupons" 
                    className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <TicketIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <div>
                      <div className="font-medium text-primary-900">Coupons verwalten</div>
                      <div className="text-sm text-primary-600">Neue Coupons hinzufügen</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/admin/cashback" 
                    className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <CurrencyDollarIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <div>
                      <div className="font-medium text-primary-900">Cashback-Aktionen</div>
                      <div className="text-sm text-primary-600">Kampagnen verwalten</div>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/admin/submissions" 
                    className="flex items-center p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <ClockIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <div>
                      <div className="font-medium text-primary-900">Anträge prüfen</div>
                      <div className="text-sm text-primary-600">{stats?.pendingCashback || 0} ausstehend</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
