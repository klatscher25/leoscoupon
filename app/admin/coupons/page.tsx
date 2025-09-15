'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/utils/helpers'
import { COUPON_CATEGORIES, BARCODE_TYPES } from '@/utils/constants'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TicketIcon,
  PhotoIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'
import CouponPhotoUpload from '@/components/admin/CouponPhotoUpload'
import BarcodeScanner from '@/components/admin/BarcodeScanner'
import CameraDiagnostics from '@/components/admin/CameraDiagnostics'
import { Database } from '@/lib/database.types'

type Coupon = Database['public']['Tables']['coupons']['Row'] & {
  store: Database['public']['Tables']['stores']['Row'] | null
}

interface CouponForm {
  title: string
  description: string
  category: Database['public']['Enums']['coupon_category']
  store_id: string
  barcode_type: Database['public']['Enums']['barcode_type']
  barcode_value: string
  valid_from: string
  valid_until: string
  discount_amount: string
  discount_percentage: string
  minimum_purchase_amount: string
  per_user_limit: number
  per_payback_limit: number
  conditions: string
  is_combinable: boolean
  combinable_with_categories: Database['public']['Enums']['coupon_category'][]
}

export default function AdminCouponsPage() {
  const { user, isAdmin } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [stores, setStores] = useState<Database['public']['Tables']['stores']['Row'][]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CouponForm>({
    title: '',
    description: '',
    category: 'artikel',
    store_id: '',
    barcode_type: 'ean13',
    barcode_value: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    discount_amount: '',
    discount_percentage: '',
    minimum_purchase_amount: '',
    per_user_limit: 1,
    per_payback_limit: 1,
    conditions: '',
    is_combinable: true,
    combinable_with_categories: ['warengruppe', 'artikel']
  })
  
  // New states for multi-input
  const [inputMethod, setInputMethod] = useState<'manual' | 'photo' | 'scanner'>('manual')
  const [couponPhotoUrl, setCouponPhotoUrl] = useState<string>('')

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (isAdmin) {
      loadCoupons()
      loadStores()
    }
  }, [isAdmin])

  const loadStores = async () => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .order('name')
    
    if (data) setStores(data)
  }

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          store:stores(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCoupons(data || [])
    } catch (error) {
      console.error('Error loading coupons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const couponData = {
        ...formData,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        minimum_purchase_amount: formData.minimum_purchase_amount ? parseFloat(formData.minimum_purchase_amount) : null,
        image_url: couponPhotoUrl || null,
        created_by: user.id
      }

      if (editingId) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingId)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData])
        
        if (error) throw error
      }

      resetForm()
      loadCoupons()
    } catch (error) {
      console.error('Error saving coupon:', error)
      alert('Fehler beim Speichern des Coupons')
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      title: coupon.title,
      description: coupon.description || '',
      category: coupon.category,
      store_id: coupon.store_id || '',
      barcode_type: coupon.barcode_type,
      barcode_value: coupon.barcode_value,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
      discount_amount: coupon.discount_amount?.toString() || '',
      discount_percentage: coupon.discount_percentage?.toString() || '',
      minimum_purchase_amount: coupon.minimum_purchase_amount?.toString() || '',
      per_user_limit: coupon.per_user_limit || 1,
      per_payback_limit: coupon.per_payback_limit || 1,
      conditions: coupon.conditions || '',
      is_combinable: coupon.is_combinable || false,
      combinable_with_categories: coupon.combinable_with_categories || []
    })
    setEditingId(coupon.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Coupon wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadCoupons()
    } catch (error) {
      console.error('Error deleting coupon:', error)
      alert('Fehler beim Löschen des Coupons')
    }
  }

  // Handler functions for multi-input
  const handlePhotoUploaded = (url: string) => {
    setCouponPhotoUrl(url)
    console.log('📷 Photo uploaded:', url)
  }

  const handleBarcodeDetected = (barcode: string, type: string) => {
    console.log('📷 Barcode detected:', { barcode, type })
    
    // Auto-fill barcode fields
    setFormData(prev => ({
      ...prev,
      barcode_value: barcode,
      barcode_type: type as any
    }))
    
    // Try to auto-detect store from barcode patterns
    const detectedStore = detectStoreFromBarcode(barcode)
    if (detectedStore) {
      setFormData(prev => ({
        ...prev,
        store_id: detectedStore.id
      }))
    }
  }

  const handleTextExtracted = (text: string) => {
    console.log('📝 Text extracted:', text)
    
    // Parse common coupon patterns
    const parsed = parseCouponText(text)
    
    setFormData(prev => ({
      ...prev,
      title: parsed.title || prev.title,
      description: parsed.description || prev.description,
      discount_amount: parsed.discount_amount || prev.discount_amount,
      minimum_purchase_amount: parsed.minimum_purchase_amount || prev.minimum_purchase_amount,
      valid_until: parsed.valid_until || prev.valid_until,
      conditions: parsed.conditions || prev.conditions
    }))
  }

  const detectStoreFromBarcode = (barcode: string) => {
    // Simple store detection based on barcode patterns
    const patterns = {
      'rewe': /^400638/, // REWE EAN prefix
      'edeka': /^401234/, // Example EDEKA pattern
      'dm': /^405678/     // Example dm pattern
    }
    
    for (const [storeName, pattern] of Object.entries(patterns)) {
      if (pattern.test(barcode)) {
        return stores.find(store => 
          store.name.toLowerCase().includes(storeName) ||
          store.chain_code?.toLowerCase() === storeName
        )
      }
    }
    return null
  }

  const parseCouponText = (text: string) => {
    const result: Partial<CouponForm> = {}
    
    // Parse discount amount (5€, 10€, etc.)
    const discountMatch = text.match(/(\d+)[€€]/g)
    if (discountMatch) {
      result.discount_amount = discountMatch[0].replace(/[€€]/, '')
    }
    
    // Parse minimum amount (ab 50€, etc.)
    const minAmountMatch = text.match(/ab (\d+)[€€]/i)
    if (minAmountMatch) {
      result.minimum_purchase_amount = minAmountMatch[1]
    }
    
    // Parse valid until date
    const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)
    if (dateMatch) {
      const [day, month, year] = dateMatch[0].split('.')
      result.valid_until = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    // Extract title (first line that looks like a title)
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      result.title = lines[0].trim()
    }
    
    // Extract description (combine other meaningful lines)
    if (lines.length > 1) {
      result.description = lines.slice(1).join(' ').trim()
    }
    
    return result
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'artikel',
      store_id: '',
      barcode_type: 'ean13',
      barcode_value: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      discount_amount: '',
      discount_percentage: '',
      minimum_purchase_amount: '',
      per_user_limit: 1,
      per_payback_limit: 1,
      conditions: '',
      is_combinable: true,
      combinable_with_categories: ['warengruppe', 'artikel']
    })
    setEditingId(null)
    setShowForm(false)
    setInputMethod('manual')
    setCouponPhotoUrl('')
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Zugriff verweigert</h1>
          <p className="text-gray-600">Du hast keine Admin-Berechtigung für diese Seite.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupon-Verwaltung</h1>
            <p className="text-gray-600">Verwalte alle Coupons für die App</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Neuer Coupon
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingId ? 'Coupon bearbeiten' : 'Neuer Coupon'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Input Method Selection */}
                <div className="border-b border-gray-200 pb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📱 Eingabe-Methode wählen
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setInputMethod('photo')}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        inputMethod === 'photo'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <PhotoIcon className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-xs font-medium">Foto Upload</div>
                      <div className="text-xs text-gray-500">iPhone Screenshot</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setInputMethod('scanner')}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        inputMethod === 'scanner'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <QrCodeIcon className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-xs font-medium">Barcode Scanner</div>
                      <div className="text-xs text-gray-500">Live Kamera</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setInputMethod('manual')}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        inputMethod === 'manual'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <PencilIcon className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-xs font-medium">Manuell</div>
                      <div className="text-xs text-gray-500">Alle Felder</div>
                    </button>
                  </div>
                </div>

                {/* Photo Upload Section */}
                {inputMethod === 'photo' && (
                  <CouponPhotoUpload
                    onPhotoUploaded={handlePhotoUploaded}
                    onBarcodeDetected={handleBarcodeDetected}
                    onTextExtracted={handleTextExtracted}
                    existingPhotoUrl={couponPhotoUrl}
                  />
                )}

                {/* Barcode Scanner Section */}
                {inputMethod === 'scanner' && (
                  <div className="space-y-4">
                    <CameraDiagnostics />
                    <BarcodeScanner
                      onBarcodeDetected={handleBarcodeDetected}
                      onError={(error) => alert('Scanner-Fehler: ' + error)}
                    />
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Titel *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Laden</label>
                    <select
                      className="input"
                      value={formData.store_id}
                      onChange={(e) => setFormData({...formData, store_id: e.target.value})}
                    >
                      <option value="">Laden auswählen</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Kategorie *</label>
                    <select
                      required
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                    >
                      {Object.entries(COUPON_CATEGORIES).map(([key, category]) => (
                        <option key={key} value={key}>{category.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Barcode-Typ *</label>
                    <select
                      required
                      className="input"
                      value={formData.barcode_type}
                      onChange={(e) => setFormData({...formData, barcode_type: e.target.value as any})}
                    >
                      {Object.entries(BARCODE_TYPES).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Barcode-Wert *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={formData.barcode_value}
                      onChange={(e) => setFormData({...formData, barcode_value: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Gültig ab *</label>
                    <input
                      type="date"
                      required
                      className="input"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Gültig bis *</label>
                    <input
                      type="date"
                      required
                      className="input"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Rabattbetrag (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({...formData, discount_amount: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Rabatt (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({...formData, discount_percentage: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="label">Pro User Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.per_user_limit}
                      onChange={(e) => setFormData({...formData, per_user_limit: parseInt(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="label">Pro Payback Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={formData.per_payback_limit}
                      onChange={(e) => setFormData({...formData, per_payback_limit: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Beschreibung</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="label">Bedingungen</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={formData.conditions}
                    onChange={(e) => setFormData({...formData, conditions: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={formData.is_combinable}
                      onChange={(e) => setFormData({...formData, is_combinable: e.target.checked})}
                    />
                    <span className="ml-2 text-sm text-gray-700">Kombinierbar</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-outline"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingId ? 'Speichern' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Coupons List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Coupons vorhanden</h3>
            <p className="text-gray-600">Erstelle deinen ersten Coupon</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map(coupon => (
              <div key={coupon.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{coupon.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${COUPON_CATEGORIES[coupon.category].color}`}>
                        {COUPON_CATEGORIES[coupon.category].label}
                      </span>
                      {coupon.store && (
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                          {coupon.store.name}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${
                        coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {coupon.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Gültig: {formatDate(coupon.valid_from)} - {formatDate(coupon.valid_until)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Barcode: {BARCODE_TYPES[coupon.barcode_type]} - {coupon.barcode_value}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(coupon)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
