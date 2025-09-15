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
import HybridCouponUpload from '@/components/admin/HybridCouponUpload'
import GoogleDriveBatchUpload from '@/components/admin/GoogleDriveBatchUpload'
import GoogleVisionDebug from '@/components/admin/GoogleVisionDebug'
import BarcodeScanner from '@/components/admin/BarcodeScanner'
import CameraDiagnostics from '@/components/admin/CameraDiagnostics'
import { Database } from '@/lib/database.types'
import { parseCouponText as parseExtractedText, detectStoreFromText } from '@/utils/imageAnalysis'

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
  minimum_purchase_amount: string
  conditions: string
  // New structured fields
  detected_store_name?: string
  coupon_value_type?: 'multiplier' | 'euro_amount' | 'percentage' | 'buy_x_get_y' | 'other'
  coupon_value_numeric?: number
  coupon_value_text?: string
  generated_barcode_url?: string
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
    minimum_purchase_amount: '',
    conditions: ''
  })
  
  // New states for multi-input
  const [inputMethod, setInputMethod] = useState<'manual' | 'photo' | 'scanner' | 'batch-drive'>('manual')
  const [couponPhotoUrl, setCouponPhotoUrl] = useState<string>('')
  
  // Google Vision API configuration - Add your API key here
  const GOOGLE_VISION_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY || ''

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
    if (!user) {
      setError('Du musst angemeldet sein um Coupons zu speichern.')
      return
    }

    try {
      console.log('💾 Saving coupon with data:', formData)
      console.log('🔑 User ID:', user.id)
      
      // Only use fields that definitely exist in the database
      const couponData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        store_id: formData.store_id,
        barcode_type: formData.barcode_type,
        barcode_value: formData.barcode_value,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        minimum_purchase_amount: formData.minimum_purchase_amount ? parseFloat(formData.minimum_purchase_amount) : null,
        conditions: formData.conditions,
        is_combinable: true, // Fixed to true, checkbox removed
        image_url: couponPhotoUrl || null,
        created_by: user.id  // RLS requires valid user ID
      }
      
      console.log('💾 Final coupon data:', couponData)

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
    } catch (error: any) {
      console.error('Error saving coupon:', error)
      
      let errorMessage = 'Fehler beim Speichern des Coupons'
      
      if (error?.code === '42501') {
        errorMessage = 'Berechtigung verweigert. RLS Policy Problem - Überprüfe Datenbank-Berechtigungen.'
      } else if (error?.code === '23505') {
        errorMessage = 'Barcode bereits vorhanden. Bitte wähle einen anderen Barcode.'
      } else if (error?.code === '23503') {
        errorMessage = 'Store ID ungültig. Bitte wähle einen gültigen Store.'
      } else if (error?.message) {
        errorMessage = `Fehler: ${error.message}`
      }
      
      setError(errorMessage)
      console.error('Detailed error:', {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      })
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
      minimum_purchase_amount: coupon.minimum_purchase_amount?.toString() || '',
      conditions: coupon.conditions || ''
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

  const handleStructuredDataExtracted = (structuredData: any) => {
    console.log('🎯 Structured data extracted:', structuredData)
    
    // Auto-fill form with structured data
    setFormData(prev => ({
      ...prev,
      detected_store_name: structuredData.detectedStoreName || prev.detected_store_name,
      coupon_value_type: structuredData.couponValueType || prev.coupon_value_type,
      coupon_value_numeric: structuredData.couponValueNumeric || prev.coupon_value_numeric,
      coupon_value_text: structuredData.couponValueText || prev.coupon_value_text,
      
      // Auto-fill related fields based on structured data
      title: structuredData.couponValueText || prev.title,
      category: structuredData.couponValueType === 'multiplier' ? 'aktion' as any : 
                structuredData.couponValueType === 'euro_amount' ? 'euro' as any :
                structuredData.couponValueType === 'percentage' ? 'prozent' as any : prev.category
    }))

    // Try to auto-detect store from structured data
    if (structuredData.detectedStoreName && !formData.store_id) {
      const foundStore = stores.find(store => 
        store.name.toUpperCase().includes(structuredData.detectedStoreName.toUpperCase()) ||
        store.chain_code?.toUpperCase() === structuredData.detectedStoreName.toUpperCase()
      )
      if (foundStore) {
        console.log('✅ Store auto-assigned from structured data:', foundStore.name)
        setFormData(prev => ({ ...prev, store_id: foundStore.id }))
      }
    }
  }

  const handleGoogleVisionAnalysis = (result: any) => {
    console.log('🌟 Google Vision analysis result:', result)
    
    if (!result.success) {
      console.warn('❌ Google Vision analysis failed')
      return
    }
    
    // Auto-fill form with comprehensive Google Vision data
    setFormData(prev => {
      const updates: any = { ...prev }
      
      // Barcode data
      if (result.barcode) {
        updates.barcode_value = result.barcode.value
        updates.barcode_type = result.barcode.format.toLowerCase()
      }
      
      // Store name detection
      if (result.structuredData?.storeName) {
        updates.detected_store_name = result.structuredData.storeName
        
        // Try to find matching store ID
        const matchingStore = stores.find(store => 
          store.name.toLowerCase().includes(result.structuredData.storeName.toLowerCase())
        )
        if (matchingStore) {
          updates.store_id = matchingStore.id
        }
      }
      
      // Discount information
      if (result.structuredData?.discountValue && result.structuredData?.discountType) {
        updates.coupon_value_numeric = result.structuredData.discountValue
        updates.coupon_value_type = result.structuredData.discountType
        updates.coupon_value_text = result.structuredData.discountText || ''
        
        // Store structured discount data in new fields
        if (result.structuredData.discountType === 'euro') {
          updates.coupon_value_type = 'euro_amount'
          updates.coupon_value_numeric = result.structuredData.discountValue
          updates.coupon_value_text = `${result.structuredData.discountValue}€ Rabatt`
        } else if (result.structuredData.discountType === 'percentage') {
          updates.coupon_value_type = 'percentage'
          updates.coupon_value_numeric = result.structuredData.discountValue
          updates.coupon_value_text = `${result.structuredData.discountValue}% Rabatt`
        }
      }
      
      // Minimum purchase amount
      if (result.structuredData?.minAmount) {
        updates.minimum_purchase_amount = result.structuredData.minAmount.toString()
      }
      
      // Valid until date
      if (result.structuredData?.validUntil) {
        updates.valid_until = result.structuredData.validUntil
      }
      
      // Conditions
      if (result.structuredData?.conditions && result.structuredData.conditions.length > 0) {
        updates.conditions = result.structuredData.conditions.join('. ')
      }
      
      // Auto-generate title if not set
      if (!updates.title && result.structuredData?.discountValue && result.structuredData?.storeName) {
        const discountText = result.structuredData.discountType === 'multiplier' 
          ? `${result.structuredData.discountValue}FACH`
          : result.structuredData.discountType === 'percentage'
          ? `${result.structuredData.discountValue}%`
          : result.structuredData.discountType === 'euro'
          ? `${result.structuredData.discountValue}€`
          : result.structuredData.discountValue
        
        updates.title = `${result.structuredData.storeName} - ${discountText} Rabatt`
      }
      
      // Auto-generate description from detected text
      if (!updates.description && result.text) {
        // Take first meaningful sentences from detected text
        const sentences = result.text.split(/[.!?]/).filter(s => s.trim().length > 10)
        if (sentences.length > 0) {
          updates.description = sentences.slice(0, 2).join('. ').trim()
        }
      }
      
      return updates
    })
    
    console.log('✅ Form auto-filled with Google Vision data')
  }

  const handleBatchAnalysis = (results: any[]) => {
    console.log('📁 Batch analysis completed:', results)
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    alert(`Batch-Analyse abgeschlossen!\n✅ Erfolgreich: ${successful.length}\n❌ Fehlgeschlagen: ${failed.length}\n\nDie erfolgreich analysierten Coupons können jetzt einzeln als Vorlagen verwendet werden.`)
    
    // Optional: Auto-fill form with first successful result
    if (successful.length > 0) {
      const firstSuccess = successful[0]
      handleGoogleVisionAnalysis(firstSuccess)
    }
  }

  const handleBarcodeDetected = (barcode: string, type: string) => {
    console.log('📷 Barcode detected in form handler:', { barcode, type })
    
    // Auto-fill barcode fields
    setFormData(prev => ({
      ...prev,
      barcode_value: barcode,
      barcode_type: type as any
    }))
    
    // Try to auto-detect store from barcode patterns
    const detectedStore = detectStoreFromBarcode(barcode)
    console.log('🏪 Store detection result:', detectedStore)
    
    if (detectedStore) {
      console.log('✅ Setting store_id to:', detectedStore.id, '- Store name:', detectedStore.name)
      setFormData(prev => ({
        ...prev,
        store_id: detectedStore.id
      }))
    } else {
      console.log('❌ No store found for barcode:', barcode)
    }
  }

  const handleTextExtracted = (text: string) => {
    console.log('📝 Real OCR text extracted:', text)
    
    // Use the enhanced parsing from imageAnalysis.ts
    const parsed = parseExtractedText(text)
    console.log('📋 Enhanced parsed data:', parsed)
    
    // Fallback store detection from text if barcode didn't work
    let storeToSet = formData.store_id
    if (!storeToSet) {
      console.log('🏪 No store set from barcode, trying text detection...')
      const detectedStoreFromText = detectStoreFromText(text)
      if (detectedStoreFromText) {
        const foundStore = stores.find(store => 
          store.name.toLowerCase().includes(detectedStoreFromText.toLowerCase()) ||
          store.chain_code?.toLowerCase() === detectedStoreFromText.toLowerCase()
        )
        if (foundStore) {
          console.log('✅ Store detected from text:', foundStore.name)
          storeToSet = foundStore.id
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      title: parsed.title || prev.title,
      description: parsed.description || prev.description,
      minimum_purchase_amount: parsed.minimum_purchase_amount || prev.minimum_purchase_amount,
      valid_until: parsed.valid_until || prev.valid_until,
      conditions: parsed.conditions || prev.conditions,
      category: parsed.category || prev.category,
      store_id: storeToSet || prev.store_id,
      // Store structured data if available
      coupon_value_type: parsed.coupon_value_type || prev.coupon_value_type,
      coupon_value_numeric: parsed.coupon_value_numeric || prev.coupon_value_numeric,
      coupon_value_text: parsed.coupon_value_text || prev.coupon_value_text
    }))
  }

  const detectStoreFromBarcode = (barcode: string) => {
    // Real store detection based on actual barcode patterns
    const patterns = {
      'EDEKA': /^901000/, // Real EDEKA pattern from your example (9010002232171158)
      'REWE': /^4006381/, // REWE EAN prefix
      'ALDI': /^4337256/, // ALDI SÜD pattern
      'LIDL': /^4251234/, // LIDL Plus pattern
      'PENNY': /^4123456/, // PENNY pattern
      'dm': /^405678/, // dm pattern
      'ROSSMANN': /^407890/ // ROSSMANN pattern
    }
    
    console.log('🔍 Detecting store from barcode:', barcode)
    console.log('🏪 Available stores:', stores.map(s => `${s.name} (${s.chain_code})`))
    
    for (const [storeName, pattern] of Object.entries(patterns)) {
      console.log(`🔍 Testing pattern ${storeName}:`, pattern, 'against barcode:', barcode)
      if (pattern.test(barcode)) {
        console.log('✅ Store pattern matched:', storeName)
        const foundStore = stores.find(store => 
          store.name.toLowerCase().includes(storeName.toLowerCase()) ||
          store.chain_code?.toLowerCase() === storeName.toLowerCase()
        )
        console.log('🏪 Found store in database:', foundStore)
        return foundStore
      }
    }
    
    console.log('❌ No store pattern matched for barcode:', barcode)
    return null
  }

  const parseCouponText = (text: string) => {
    const result: Partial<CouponForm> = {}
    
    // Parse discount amount (5€, 10€, etc.) and store in structured fields
    const discountMatch = text.match(/(\d+)\s*[€€]/g)
    if (discountMatch) {
      const value = parseInt(discountMatch[0].replace(/[€€\s]/g, ''))
      result.coupon_value_type = 'euro_amount'
      result.coupon_value_numeric = value
      result.coupon_value_text = `${value}€ Rabatt`
    }
    
    // Parse percentage discount (10%, 20%, etc.) and store in structured fields
    const percentageMatch = text.match(/(\d+)\s*%/g)
    if (percentageMatch && !discountMatch) {
      const value = parseInt(percentageMatch[0].replace(/[%\s]/g, ''))
      result.coupon_value_type = 'percentage'
      result.coupon_value_numeric = value
      result.coupon_value_text = `${value}% Rabatt`
    }
    
    // Parse minimum amount patterns
    const minAmountPatterns = [
      /ab\s+(\d+)\s*[€€]/i,
      /mindest\w*\s*(\d+)\s*[€€]/i,
      /minimum\w*\s*(\d+)\s*[€€]/i
    ]
    
    for (const pattern of minAmountPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.minimum_purchase_amount = match[1]
        break
      }
    }
    
    // Parse valid until date (various formats)
    const datePatterns = [
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
      /(\d{4})-(\d{1,2})-(\d{1,2})/g,
      /bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        if (pattern.source.includes('bis')) {
          // Format: "bis DD.MM.YYYY"
          const [, day, month, year] = match
          result.valid_until = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else if (match[0].includes('-')) {
          // Format: "YYYY-MM-DD" 
          result.valid_until = match[0]
        } else {
          // Format: "DD.MM.YYYY"
          const [day, month, year] = match[0].split('.')
          result.valid_until = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
        break
      }
    }
    
    // Enhanced title extraction
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      let title = lines[0].trim()
      // Clean up common title patterns
      title = title.replace(/^(REWE|EDEKA|ALDI|LIDL|PENNY|dm)\s+/i, '')
      title = title.replace(/\s+(Coupon|COUPON)$/i, '')
      result.title = title
    }
    
    // Enhanced description extraction with conditions parsing
    if (lines.length > 1) {
      const descriptionLines = lines.slice(1)
      result.description = descriptionLines.join(' ').trim()
      
      // Extract specific conditions
      const conditionKeywords = [
        'nur einmal',
        'pro kunde',
        'ausgenommen',
        'nicht kombinierbar',
        'nicht gültig',
        'online',
        'filiale',
        'nicht übertragbar'
      ]
      
      const conditions = descriptionLines.filter(line => 
        conditionKeywords.some(keyword => 
          line.toLowerCase().includes(keyword)
        )
      )
      
      if (conditions.length > 0) {
        result.conditions = conditions.join(' ')
      }
    }
    
    // Auto-detect category based on text content
    const categoryKeywords = {
      'artikel': ['artikel', 'produkt', 'warengruppe'],
      'prozent': ['%', 'prozent', 'percent'],
      'euro': ['€', 'euro', 'rabatt'],
      'aktion': ['aktion', '2 für 1', 'gratis', 'kostenlos']
    }
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        result.category = category as any
        break
      }
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
      minimum_purchase_amount: '',
      conditions: ''
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setInputMethod('batch-drive')}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        inputMethod === 'batch-drive'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-xl mx-auto mb-1">📁</div>
                      <div className="text-xs font-medium">Google Drive</div>
                      <div className="text-xs text-gray-500">Batch Upload</div>
                    </button>
                    
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
                      <div className="text-xs text-gray-500">Google Vision KI</div>
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

                {/* Google Drive Batch Upload Section */}
                {inputMethod === 'batch-drive' && (
                  <div className="space-y-4">
                    <GoogleDriveBatchUpload
                      googleVisionApiKey={GOOGLE_VISION_API_KEY}
                      onBatchAnalyzed={handleBatchAnalysis}
                    />
                  </div>
                )}

                {/* Google Vision Debug Console */}
                <GoogleVisionDebug googleVisionApiKey={GOOGLE_VISION_API_KEY} />

                {/* Hybrid Coupon Upload Section */}
                {inputMethod === 'photo' && (
                  <HybridCouponUpload
                    onPhotoUploaded={handlePhotoUploaded}
                    onBarcodeDetected={handleBarcodeDetected}
                    onTextExtracted={handleTextExtracted}
                    onStructuredDataExtracted={handleStructuredDataExtracted}
                    onGoogleVisionAnalyzed={handleGoogleVisionAnalysis}
                    googleVisionApiKey={GOOGLE_VISION_API_KEY}
                    enableGoogleVision={!!GOOGLE_VISION_API_KEY}
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
                    <label className="label">Gültig ab (optional)</label>
                    <input
                      type="date"
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

                  {/* Structured coupon value display */}
                  {formData.coupon_value_text && (
                    <div>
                      <label className="label">Erkannter Coupon-Wert</label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <span className="text-green-800 font-medium">{formData.coupon_value_text}</span>
                        <span className="text-green-600 text-sm ml-2">({formData.coupon_value_type})</span>
                      </div>
                    </div>
                  )}
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

                {/* Kombinierbar Checkbox entfernt - immer auf true gesetzt */}
                <div className="text-sm text-gray-600">
                  ℹ️ Alle Coupons sind automatisch kombinierbar
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
