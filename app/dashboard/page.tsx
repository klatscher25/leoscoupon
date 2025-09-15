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
      primary: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-blue-200',
      success: 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-green-200',
      warning: 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-600 border-yellow-200',
      danger: 'bg-gradient-to-br from-red-50 to-red-100 text-red-600 border-red-200'
    }

    const card = (
      <div className="bg-white rounded-2xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl border border-gray-100">
        <div className="flex items-center">
          <div className={`p-4 rounded-2xl ${colorClasses[color]} border`}>
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
            <p className="text-sm font-semibold text-gray-600">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    )

    return href ? <Link href={href}>{card}</Link> : card
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-2xl font-bold shadow-xl">
              L
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              Hallo, {profile?.username}! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              Bereit für deine nächsten Ersparnisse?
            </p>
          </div>
        </div>

        {/* Hauptfunktionen - Prominente CTA Buttons */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* COUPON EINLÖSEN - Hauptfunktion */}
          <Link 
            href="/coupons/redeem"
            className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 rounded-3xl p-8 text-white transition-all duration-300 transform hover:scale-[1.02] shadow-2xl hover:shadow-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black">{stats?.activeCoupons || 0}</div>
                  <div className="text-green-100 text-sm font-medium">verfügbare Coupons</div>
                </div>
              </div>
              <h2 className="text-3xl font-black mb-3 tracking-tight">Coupons einlösen</h2>
              <p className="text-green-100 mb-6 text-lg leading-relaxed">
                🛒 Wähle deinen Laden und maximiere deine Ersparnisse beim nächsten Einkauf
              </p>
              <div className="flex items-center text-lg font-bold bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 w-fit">
                <span>Jetzt sparen</span>
                <svg className="ml-3 h-5 w-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* CASHBACK TRACKING - Zweite Hauptfunktion */}
          <Link 
            href="/cashback"
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 rounded-3xl p-8 text-white transition-all duration-300 transform hover:scale-[1.02] shadow-2xl hover:shadow-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <CurrencyDollarIcon className="h-10 w-10" strokeWidth={2} />
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black">{formatCurrency(stats?.totalCashbackAmount || 0)}</div>
                  <div className="text-blue-100 text-sm font-medium">bereits erhalten</div>
                </div>
              </div>
              <h2 className="text-3xl font-black mb-3 tracking-tight">Cashback tracken</h2>
              <p className="text-blue-100 mb-6 text-lg leading-relaxed">
                💰 Verfolge deine Cashback-Aktionen und verwalte deine Auszahlungen
              </p>
              <div className="flex items-center text-lg font-bold bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 w-fit">
                <span>Status prüfen</span>
                <svg className="ml-3 h-5 w-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
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
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <TicketIcon className="h-6 w-6 text-green-600" strokeWidth={2} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 ml-3">
                    Coupon Aktionen
                  </h2>
                </div>
                <div className="space-y-3">
                  <Link 
                    href="/coupons" 
                    className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-green-100 transition-all duration-200 group border border-gray-200 hover:border-green-200"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                      <TicketIcon className="h-5 w-5 text-gray-600 group-hover:text-green-600" strokeWidth={2} />
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 group-hover:text-green-700">Coupons durchsuchen</div>
                      <div className="text-sm text-gray-600">Verfügbare Angebote finden</div>
                    </div>
                    <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-green-600 transform group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  
                  <Link 
                    href="/coupons/redeem" 
                    className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-green-50 hover:to-green-100 transition-all duration-200 group border border-gray-200 hover:border-green-200"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                      <svg className="h-5 w-5 text-gray-600 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 group-hover:text-green-700">Coupon Scanner</div>
                      <div className="text-sm text-gray-600">Barcode direkt scannen</div>
                    </div>
                    <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-green-600 transform group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Cashback Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <CurrencyDollarIcon className="h-6 w-6 text-blue-600" strokeWidth={2} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 ml-3">
                    Cashback Aktionen
                  </h2>
                </div>
                <div className="space-y-3">
                  <Link 
                    href="/cashback" 
                    className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all duration-200 group border border-gray-200 hover:border-blue-200"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" strokeWidth={2} />
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700">Aktuelle Aktionen</div>
                      <div className="text-sm text-gray-600">Neue Cashback-Möglichkeiten</div>
                    </div>
                    <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  
                  <Link 
                    href="/cashback/submit" 
                    className="flex items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all duration-200 group border border-gray-200 hover:border-blue-200"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                      <svg className="h-5 w-5 text-gray-600 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700">Cashback einreichen</div>
                      <div className="text-sm text-gray-600">Neuen Antrag erstellen</div>
                    </div>
                    <svg className="ml-auto h-5 w-5 text-gray-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
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
