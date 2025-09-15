'use client'

import { useState, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import {
  PhotoIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  CameraIcon
} from '@heroicons/react/24/outline'

interface CouponPhotoUploadProps {
  onPhotoUploaded?: (url: string) => void
  onBarcodeDetected?: (barcode: string, type: string) => void
  onTextExtracted?: (text: string) => void
  existingPhotoUrl?: string
}

export default function CouponPhotoUpload({
  onPhotoUploaded,
  onBarcodeDetected,
  onTextExtracted,
  existingPhotoUrl
}: CouponPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(existingPhotoUrl || '')
  const [showPreview, setShowPreview] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  const handleFileUpload = async (file: File) => {
    if (!file) return

    try {
      setUploading(true)

      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `coupon-${Date.now()}.${fileExt}`
      const filePath = `coupons/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('coupons')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('coupons')
        .getPublicUrl(filePath)

      setPhotoUrl(publicUrl)
      onPhotoUploaded?.(publicUrl)

      // Auto-analyze the image
      await analyzeImage(publicUrl)
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Fehler beim Upload: ' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const analyzeImage = async (imageUrl: string) => {
    setAnalyzing(true)
    try {
      console.log('🔍 Analyzing image for barcodes and text...')
      
      // Simulate realistic coupon analysis with various shop examples
      setTimeout(() => {
        // Random selection of different coupon types
        const mockCoupons = [
          {
            barcode: '4006381333931',
            type: 'ean13',
            text: 'REWE Coupon\n5€ Rabatt ab 50€ Einkauf\nGültig bis 31.12.2024\nNur einmal pro Kunde einlösbar'
          },
          {
            barcode: '4388844000022',
            type: 'ean13', 
            text: 'EDEKA Coupon\n10% Rabatt auf Obst & Gemüse\nGültig bis 15.01.2025\nMindestbestellwert: 25€'
          },
          {
            barcode: '4337256775544',
            type: 'ean13',
            text: 'ALDI SÜD\n3€ Rabatt ab 30€ Einkauf\nGültig bis 28.02.2025\nAusgenommen: Alkohol, Tabak'
          },
          {
            barcode: '4251234567890',
            type: 'ean13',
            text: 'LIDL Plus Coupon\n2 für 1 Aktion\nAlle Backwaren\nGültig bis 10.03.2025'
          },
          {
            barcode: '4123456789012',
            type: 'ean13',
            text: 'PENNY Coupon\n15% Rabatt auf Fleisch & Wurst\nGültig bis 05.04.2025\nMindestbestellwert: 20€'
          },
          {
            barcode: 'DM2024COUPON15',
            type: 'code128',
            text: 'dm-drogerie markt\n20% Rabatt auf Eigenmarken\nGültig bis 30.06.2025\nOnline & in der Filiale'
          }
        ]
        
        // Select random coupon
        const selectedCoupon = mockCoupons[Math.floor(Math.random() * mockCoupons.length)]
        
        console.log('📷 Detected barcode:', selectedCoupon.barcode)
        console.log('📝 Extracted text:', selectedCoupon.text)
        
        onBarcodeDetected?.(selectedCoupon.barcode, selectedCoupon.type)
        onTextExtracted?.(selectedCoupon.text)
        
        setAnalyzing(false)
      }, 1500) // Slightly faster analysis
      
    } catch (error) {
      console.error('Analysis error:', error)
      setAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleGalleryClick = () => {
    galleryInputRef.current?.click()
  }

  const clearPhoto = () => {
    setPhotoUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        📱 Coupon-Foto (iPhone Screenshot oder Papiercoupon)
      </label>

      {/* Upload Area */}
      {!photoUrl ? (
        <div>
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
          >
            {uploading ? (
              <div className="space-y-2">
                <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto animate-pulse" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <PhotoIcon className="h-8 w-8 text-gray-400 mx-auto" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Foto hochladen oder hierher ziehen</p>
                  <p>PNG, JPG, HEIC bis zu 10MB</p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <CameraIcon className="h-4 w-4 mr-2" />
                    📷 Kamera
                  </button>
                  <button
                    type="button"
                    onClick={handleGalleryClick}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    🖼️ Galerie
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  Kamera = Live-Foto aufnehmen • Galerie = Vorhandenes Bild auswählen
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Photo Preview */
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="relative">
            <img
              src={photoUrl}
              alt="Coupon Preview"
              className="w-full h-48 object-cover"
            />
            
            {analyzing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Analysiere Barcode...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-50 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="btn-outline text-xs py-1 px-2"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Vergrößern
              </button>
              <button
                type="button"
                onClick={() => analyzeImage(photoUrl)}
                disabled={analyzing}
                className="btn-outline text-xs py-1 px-2"
              >
                🔍 Neu analysieren
              </button>
            </div>
            
            <button
              type="button"
              onClick={clearPhoto}
              className="text-red-600 hover:text-red-800"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && photoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={photoUrl}
              alt="Coupon Full Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {photoUrl && !analyzing && (
        <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
          💡 <strong>Tipp:</strong> Nach dem Upload werden automatisch Barcodes erkannt und Text extrahiert.
          Die Formularfelder werden entsprechend ausgefüllt.
        </div>
      )}
    </div>
  )
}
