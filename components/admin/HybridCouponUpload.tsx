'use client'

import { useState, useRef, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import {
  PhotoIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { HybridCouponSystem, CouponDetectionResult } from '@/utils/hybridCouponSystem'

interface HybridCouponUploadProps {
  onPhotoUploaded?: (url: string) => void
  onBarcodeDetected?: (barcode: string, type: string) => void
  onTextExtracted?: (text: string) => void
  onStructuredDataExtracted?: (structuredData: any) => void
  existingPhotoUrl?: string
}

export default function HybridCouponUpload({
  onPhotoUploaded,
  onBarcodeDetected,
  onTextExtracted,
  onStructuredDataExtracted,
  existingPhotoUrl
}: HybridCouponUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(existingPhotoUrl || '')
  const [showPreview, setShowPreview] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<string>('')
  const [detectionResult, setDetectionResult] = useState<CouponDetectionResult | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const hybridSystem = useRef<HybridCouponSystem | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    hybridSystem.current = new HybridCouponSystem()
    
    return () => {
      if (hybridSystem.current) {
        hybridSystem.current.cleanup()
      }
    }
  }, [])

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

      // Process with hybrid system
      await processWithHybridSystem(publicUrl)
      
    } catch (error) {
      console.error('Upload error:', error)
      alert('Fehler beim Upload: ' + (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const processWithHybridSystem = async (imageUrl: string) => {
    if (!hybridSystem.current) return
    
    setAnalyzing(true)
    setAnalysisStatus('🎯 Starte intelligente Coupon-Analyse...')
    
    try {
      const result = await hybridSystem.current.processCoupon(imageUrl)
      setDetectionResult(result)
      
      if (result.barcode) {
        setAnalysisStatus('✅ Barcode erfolgreich erkannt und bereinigt!')
        onBarcodeDetected?.(result.barcode.value, result.barcode.format.toLowerCase())
      } else {
        setAnalysisStatus('📱 Barcode nicht erkannt - Original-Bild für Kassen-Scanner bereit')
      }

      if (result.text) {
        onTextExtracted?.(result.text)
      }

      if (result.structuredData) {
        onStructuredDataExtracted?.(result.structuredData)
      }
      
    } catch (error) {
      console.error('❌ Hybrid analysis error:', error)
      setAnalysisStatus('❌ Analyse fehlgeschlagen - Original-Bild verfügbar')
    } finally {
      setAnalyzing(false)
      setTimeout(() => setAnalysisStatus(''), 5000)
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
    setDetectionResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        🎯 Intelligenter Coupon-Upload (Hybrid-System)
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
                <QrCodeIcon className="h-10 w-10 text-blue-600 mx-auto" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-blue-600">🎯 Intelligentes Hybrid-System</p>
                  <p className="text-xs mt-1">Automatische Barcode-Erkennung + Original-Bild-Fallback</p>
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
                
                <div className="text-xs text-gray-500 mt-2 bg-blue-50 p-2 rounded">
                  <strong>💡 Wie es funktioniert:</strong><br/>
                  1. Upload → Automatische Barcode-Erkennung<br/>
                  2. Erfolg → Sauberer generierter Barcode<br/>
                  3. Fehlschlag → Original-Bild für Kassen-Scanner
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results Display */
        <div className="space-y-4">
          {/* Original Image */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="relative">
              <img
                src={photoUrl}
                alt="Original Coupon"
                className="w-full h-48 object-cover"
              />
              
              {analyzing && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="text-white text-center max-w-xs">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                    <p className="text-sm font-medium mb-2">🎯 Hybrid-Analyse</p>
                    <p className="text-xs opacity-90">{analysisStatus}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">📱 Original-Bild</span>
                  <p className="text-xs text-gray-500">Immer verfügbar für Kassen-Scanner</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="btn-outline text-xs py-1 px-2"
                >
                  <EyeIcon className="h-3 w-3 mr-1" />
                  Vergrößern
                </button>
              </div>
            </div>
          </div>

          {/* Detection Results */}
          {detectionResult && (
            <div className="space-y-3">
              {/* Barcode Result */}
              {detectionResult.barcode ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">✅ Barcode erfolgreich erkannt!</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-700"><strong>Code:</strong> {detectionResult.barcode.value}</p>
                      <p className="text-sm text-gray-700"><strong>Format:</strong> {detectionResult.barcode.format}</p>
                    </div>
                    {detectionResult.barcode.cleanBarcodeDataUrl && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-2">🎨 Sauberer generierter Barcode:</p>
                        <img 
                          src={detectionResult.barcode.cleanBarcodeDataUrl} 
                          alt="Clean Barcode"
                          className="max-h-20 mx-auto border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-800">📱 Fallback-Modus aktiv</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Barcode konnte nicht automatisch erkannt werden.<br/>
                    <strong>✅ Lösung:</strong> Original-Bild wird an der Kasse gescannt.
                  </p>
                </div>
              )}

              {/* Structured Data Display */}
              {detectionResult.structuredData && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-800 mb-2">🎯 Strukturierte Daten erkannt:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {detectionResult.structuredData.detectedStoreName && (
                      <div className="bg-white rounded p-2">
                        <span className="font-medium text-gray-700">🏪 Laden:</span>
                        <span className="ml-1 text-purple-700 font-bold">
                          {detectionResult.structuredData.detectedStoreName}
                        </span>
                      </div>
                    )}
                    {detectionResult.structuredData.couponValueText && (
                      <div className="bg-white rounded p-2">
                        <span className="font-medium text-gray-700">💰 Wert:</span>
                        <span className="ml-1 text-purple-700 font-bold">
                          {detectionResult.structuredData.couponValueText}
                        </span>
                      </div>
                    )}
                    {detectionResult.structuredData.couponValueType && (
                      <div className="bg-white rounded p-2">
                        <span className="font-medium text-gray-700">📊 Typ:</span>
                        <span className="ml-1 text-purple-700">
                          {detectionResult.structuredData.couponValueType}
                        </span>
                      </div>
                    )}
                    {detectionResult.structuredData.couponValueNumeric && (
                      <div className="bg-white rounded p-2">
                        <span className="font-medium text-gray-700">🔢 Sortier-Wert:</span>
                        <span className="ml-1 text-purple-700 font-bold">
                          {detectionResult.structuredData.couponValueNumeric}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Text Recognition */}
              {detectionResult.text && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">📝 Erkannter Text:</p>
                  <p className="text-xs text-gray-700 max-h-20 overflow-y-auto">
                    {detectionResult.text.substring(0, 200)}...
                  </p>
                  {detectionResult.confidence && (
                    <p className="text-xs text-blue-600 mt-1">
                      Genauigkeit: {Math.round(detectionResult.confidence)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => processWithHybridSystem(photoUrl)}
              disabled={analyzing}
              className="btn-outline text-sm py-2 px-3"
            >
              🔄 Neu analysieren
            </button>
            
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

      {/* Status Display */}
      {analysisStatus && (
        <div className="text-xs text-center p-2 bg-blue-50 rounded text-blue-700">
          {analysisStatus}
        </div>
      )}
    </div>
  )
}
