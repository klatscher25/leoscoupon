'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatCurrency, canCombineCoupons } from '@/utils/helpers'
import { COUPON_CATEGORIES } from '@/utils/constants'
import {
  MagnifyingGlassIcon,
  TicketIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Database } from '@/lib/database.types'

type Coupon = Database['public']['Tables']['coupons']['Row'] & {
  store: Database['public']['Tables']['stores']['Row'] | null
  redemptions?: Database['public']['Tables']['coupon_redemptions']['Row'][]
}

export default function CouponsPage() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set())
  const [stores, setStores] = useState<Database['public']['Tables']['stores']['Row'][]>([])
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadCoupons()
    loadStores()
  }, [user])

  const loadStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('name')
    
    if (data) setStores(data)
  }

  const loadCoupons = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          store:stores(*),
          redemptions:coupon_redemptions(*)
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString().split('T')[0])
        .order('priority', { ascending: false })
        .order('valid_until', { ascending: true })

      if (error) throw error
      setCoupons(data || [])
    } catch (error) {
      console.error('Error loading coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCoupons = coupons.filter(coupon => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!coupon.title.toLowerCase().includes(searchLower) &&
          !coupon.description?.toLowerCase().includes(searchLower) &&
          !coupon.store?.name.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    if (selectedStore && coupon.store_id !== selectedStore) {
      return false
    }

    if (selectedCategory && coupon.category !== selectedCategory) {
      return false
    }

    return true
  })

  const isRedeemed = (coupon: Coupon) => {
    return coupon.redemptions?.some(r => r.user_id === user?.id) || false
  }

  const toggleCouponSelection = (couponId: string) => {
    const newSelected = new Set(selectedCoupons)
    if (newSelected.has(couponId)) {
      newSelected.delete(couponId)
    } else {
      newSelected.add(couponId)
    }
    setSelectedCoupons(newSelected)
  }

  const checkCombinations = () => {
    const selectedCouponList = coupons.filter(c => selectedCoupons.has(c.id))
    const conflicts: string[] = []

    const einkaufCoupons = selectedCouponList.filter(c => c.category === 'einkauf')
    if (einkaufCoupons.length > 1) {
      conflicts.push('Nur ein Einkaufs-Coupon kann verwendet werden')
    }

    for (let i = 0; i < selectedCouponList.length; i++) {
      for (let j = i + 1; j < selectedCouponList.length; j++) {
        if (!canCombineCoupons(selectedCouponList[i].category, selectedCouponList[j].category)) {
          conflicts.push(`${COUPON_CATEGORIES[selectedCouponList[i].category].label} kann nicht mit ${COUPON_CATEGORIES[selectedCouponList[j].category].label} kombiniert werden`)
        }
      }
    }

    return conflicts
  }

  const CouponCard = ({ coupon }: { coupon: Coupon }) => {
    const redeemed = isRedeemed(coupon)
    const selected = selectedCoupons.has(coupon.id)
    const category = COUPON_CATEGORIES[coupon.category]

    return (
      <div 
        className={`bg-white rounded-2xl p-6 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] border ${
          selected 
            ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg' 
            : 'hover:shadow-xl border-gray-200 shadow-md'
        } ${redeemed ? 'opacity-60' : ''}`}
        onClick={() => !redeemed && toggleCouponSelection(coupon.id)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-2 rounded-xl text-sm font-bold ${category.color} flex items-center space-x-1 shadow-sm`}>
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </div>
            {coupon.store && (
              <div className="px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm">
                🏪 {coupon.store.name}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {redeemed && (
              <div className="p-2 bg-green-100 rounded-xl">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
            )}
            {selected && !redeemed && (
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <h3 className="font-black text-xl text-gray-900 mb-3 leading-tight">{coupon.title}</h3>
        
        {coupon.description && (
          <p className="text-gray-600 mb-4 leading-relaxed">{coupon.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Bis {formatDate(coupon.valid_until)}</span>
          </div>
          
          {(coupon.discount_amount || coupon.discount_percentage) && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl font-black text-lg shadow-lg">
              {coupon.discount_amount ? 
                formatCurrency(coupon.discount_amount) :
                `${coupon.discount_percentage}%`
              }
            </div>
          )}
        </div>

        {redeemed && (
          <div className="mt-4 flex items-center justify-center bg-green-100 text-green-700 p-3 rounded-xl font-semibold">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Bereits eingelöst
          </div>
        )}
      </div>
    )
  }

  const conflicts = checkCombinations()

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 bg-gradient-to-br from-green-50/30 via-white to-blue-50/30 min-h-screen">
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center text-white text-2xl font-bold shadow-xl">
              🎫
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Deine Coupons</h1>
            <p className="text-gray-600 text-lg mb-6">Entdecke verfügbare Angebote und spare beim Einkaufen</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => window.location.href = '/coupons/redeem'}
              className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative z-10 flex items-center justify-center">
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Coupons einlösen
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/admin?tab=coupons'}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-6 rounded-2xl font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative z-10 flex items-center justify-center">
                <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Coupon hinzufügen
              </div>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-gray-600" />
            Suchen & Filtern
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nach Coupons suchen..."
                className="w-full pl-12 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                className="w-full px-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="">🏪 Alle Läden</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>

              <select
                className="w-full px-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">📂 Alle Kategorien</option>
                {Object.entries(COUPON_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>{category.icon} {category.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Selected Coupons Summary */}
        {selectedCoupons.size > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Ausgewählte Coupons ({selectedCoupons.size})
              </h3>
              <button
                onClick={() => setSelectedCoupons(new Set())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Alle abwählen
              </button>
            </div>

            {conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <h4 className="font-medium text-red-800 mb-1">Kombinationskonflikte:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index}>• {conflict}</li>
                  ))}
                </ul>
              </div>
            )}

            {conflicts.length === 0 && selectedCoupons.size > 1 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  ✓ Alle ausgewählten Coupons können kombiniert werden
                </p>
              </div>
            )}
          </div>
        )}

        {/* Coupons Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Coupons gefunden</h3>
            <p className="text-gray-600">
              Es sind derzeit keine aktiven Coupons verfügbar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCoupons.map(coupon => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
