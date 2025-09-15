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
        className={`card p-4 cursor-pointer transition-all ${
          selected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
        } ${redeemed ? 'opacity-60' : ''}`}
        onClick={() => !redeemed && toggleCouponSelection(coupon.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
              {category.icon} {category.label}
            </div>
            {coupon.store && (
              <div className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                {coupon.store.name}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {redeemed && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
            {selected && <div className="w-4 h-4 bg-primary-500 rounded-full"></div>}
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2">{coupon.title}</h3>
        
        {coupon.description && (
          <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <ClockIcon className="h-4 w-4 mr-1" />
            Gültig bis {formatDate(coupon.valid_until)}
          </div>
          
          {(coupon.discount_amount || coupon.discount_percentage) && (
            <div className="font-semibold text-green-600">
              {coupon.discount_amount ? 
                formatCurrency(coupon.discount_amount) :
                `${coupon.discount_percentage}%`
              }
            </div>
          )}
        </div>

        {redeemed && (
          <div className="mt-2 text-xs text-green-600 font-medium">
            ✓ Bereits eingelöst
          </div>
        )}
      </div>
    )
  }

  const conflicts = checkCombinations()

  return (
    <AppLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Coupons</h1>
          <p className="text-gray-600">Finde und kombiniere deine Coupons für den optimalen Einkauf</p>
        </div>

        {/* Search and Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Coupons suchen..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="input"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="">Alle Läden</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>

            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Alle Kategorien</option>
              {Object.entries(COUPON_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>{category.label}</option>
              ))}
            </select>
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
