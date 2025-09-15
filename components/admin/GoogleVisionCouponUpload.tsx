'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Camera, Upload, Zap, DollarSign, Eye, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'
import { GoogleVisionCouponAnalyzer, GoogleVisionCouponResult } from '../../utils/googleVisionCouponAnalyzer'

interface GoogleVisionCouponUploadProps {
  onCouponAnalyzed?: (result: GoogleVisionCouponResult) => void
  googleVisionApiKey: string
  enableDebug?: boolean
  existingPhotoUrl?: string
}

export default function GoogleVisionCouponUpload({
  onCouponAnalyzed,
  googleVisionApiKey,
  enableDebug = false,
  existingPhotoUrl
}: GoogleVisionCouponUploadProps) {
  
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [uploadedImageUrl, setUploadedImageUrl] = useState(existingPhotoUrl || '')
  const [analysisResult, setAnalysisResult] = useState<GoogleVisionCouponResult | null>(null)
  const [costSummary, setCostSummary] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const analyzerRef = useRef<GoogleVisionCouponAnalyzer | null>(null)

  // Initialize Google Vision Analyzer
  const getAnalyzer = useCallback(() => {
    if (!analyzerRef.current) {
      analyzerRef.current = new GoogleVisionCouponAnalyzer(
        { 
          apiKey: googleVisionApiKey, 
          enableDebug 
        },
        {
          maxMonthlyBudget: 10.0, // 10€ budget für ~3000 Coupons
          maxDailyRequests: 100,
          warningThreshold: 80
        }
      )
    }
    return analyzerRef.current
  }, [googleVisionApiKey, enableDebug])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setAnalysisStatus('Bild wird hochgeladen...')

    try {
      // Convert file to data URL for processing
      const dataUrl = await fileToDataUrl(file)
      setUploadedImageUrl(dataUrl)
      setAnalysisStatus('Upload erfolgreich! Starte Google Vision Analyse...')
      
      // Start analysis immediately
      await analyzeWithGoogleVision(dataUrl)
      
    } catch (error) {
      console.error('Upload error:', error)
      setAnalysisStatus('❌ Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  const analyzeWithGoogleVision = async (imageUrl: string) => {
    setAnalyzing(true)
    setAnalysisStatus('🌟 Google Vision API wird initialisiert...')
    
    try {
      const analyzer = getAnalyzer()
      
      setAnalysisStatus('🔍 Analysiere Barcode und Text mit Google AI...')
      
      const result = await analyzer.analyzeImage(imageUrl)
      
      setAnalysisResult(result)
      setCostSummary(analyzer.getCostSummary())
      
      if (result.success) {
        setAnalysisStatus(`✅ Analyse erfolgreich! ${result.barcode ? 'Barcode + ' : ''}Text erkannt`)
        
        // Call parent callback
        onCouponAnalyzed?.(result)
      } else {
        setAnalysisStatus('❌ Keine Coupon-Daten erkannt')
      }
      
    } catch (error) {
      console.error('Google Vision analysis error:', error)
      setAnalysisStatus(`❌ Analyse fehlgeschlagen: ${error}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Google Vision Coupon Analyzer</h2>
        </div>
        <p className="text-blue-100">
          Professionelle KI-gestützte Coupon-Erkennung mit höchster Genauigkeit
        </p>
      </div>

      {/* Cost Summary */}
      {costSummary && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Kosten-Übersicht</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Monatsbudget</div>
              <div className="font-semibold">${costSummary.monthlyBudget.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500">Verbraucht</div>
              <div className="font-semibold text-blue-600">
                ${costSummary.monthlyUsage.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Verbrauch %</div>
              <div className={`font-semibold ${costSummary.isNearLimit ? 'text-red-600' : 'text-green-600'}`}>
                {costSummary.percentageUsed.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-500">Heute</div>
              <div className="font-semibold">{costSummary.dailyUsage}/{costSummary.dailyQuota}</div>
            </div>
          </div>
          {costSummary.isNearLimit && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              ⚠️ Warnung: {costSummary.percentageUsed.toFixed(1)}% des Monatsbudgets verbraucht
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="w-12 h-12 text-gray-400" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Coupon-Bild hochladen
            </h3>
            <p className="text-gray-500 mt-1">
              PNG, JPG oder JPEG bis 10MB
            </p>
          </div>
          
          <button
            onClick={triggerFileUpload}
            disabled={uploading || analyzing}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            <Camera className="w-5 h-5" />
            {uploading ? 'Wird hochgeladen...' : 'Bild auswählen'}
          </button>
        </div>
      </div>

      {/* Analysis Status */}
      {(uploading || analyzing || analysisStatus) && (
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3">
            {analyzing && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold">Analyse-Status</h3>
              <p className="text-gray-600 mt-1">{analysisStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Image Preview */}
      {uploadedImageUrl && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Hochgeladenes Bild
          </h3>
          <div className="max-w-md mx-auto">
            <img 
              src={uploadedImageUrl} 
              alt="Uploaded coupon" 
              className="w-full rounded-lg border"
            />
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            {analysisResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <h3 className="text-xl font-semibold">
              Analyse-Ergebnisse
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Barcode Detection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Barcode-Erkennung</h4>
              {analysisResult.barcode ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-sm text-gray-600">Barcode</div>
                  <div className="font-mono text-lg">{analysisResult.barcode.value}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Format: {analysisResult.barcode.format} | 
                    Confidence: {analysisResult.barcode.confidence}%
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                  Kein Barcode erkannt
                </div>
              )}
            </div>

            {/* Text Detection */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700">Text-Erkennung</h4>
              {analysisResult.text ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-sm text-gray-600">Erkannter Text</div>
                  <div className="text-sm mt-1 max-h-32 overflow-y-auto">
                    {analysisResult.text.substring(0, 200)}
                    {analysisResult.text.length > 200 && '...'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Confidence: {analysisResult.confidence}%
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
                  Kein Text erkannt
                </div>
              )}
            </div>
          </div>

          {/* Structured Data */}
          {analysisResult.structuredData && Object.keys(analysisResult.structuredData).length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-700 mb-3">Strukturierte Coupon-Daten</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Store */}
                {analysisResult.structuredData.storeName && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-sm text-gray-600">Laden</div>
                    <div className="font-semibold text-blue-800">
                      {analysisResult.structuredData.storeName}
                    </div>
                  </div>
                )}

                {/* Discount */}
                {analysisResult.structuredData.discountValue && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-3">
                    <div className="text-sm text-gray-600">Rabatt</div>
                    <div className="font-semibold text-purple-800">
                      {analysisResult.structuredData.discountValue}
                      {analysisResult.structuredData.discountType === 'percentage' ? '%' : 
                       analysisResult.structuredData.discountType === 'euro' ? '€' : 
                       analysisResult.structuredData.discountType === 'multiplier' ? 'FACH' : ''}
                    </div>
                  </div>
                )}

                {/* Valid Until */}
                {analysisResult.structuredData.validUntil && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="text-sm text-gray-600">Gültig bis</div>
                    <div className="font-semibold text-green-800">
                      {new Date(analysisResult.structuredData.validUntil).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                )}

                {/* Minimum Amount */}
                {analysisResult.structuredData.minAmount && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="text-sm text-gray-600">Mindestumsatz</div>
                    <div className="font-semibold text-orange-800">
                      {analysisResult.structuredData.minAmount}€
                    </div>
                  </div>
                )}

              </div>

              {/* Conditions */}
              {analysisResult.structuredData.conditions && analysisResult.structuredData.conditions.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-2">Bedingungen</div>
                  <div className="bg-gray-50 border rounded p-3">
                    {analysisResult.structuredData.conditions.map((condition, index) => (
                      <div key={index} className="text-sm text-gray-700 mb-1">
                        • {condition}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance Stats */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Performance</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Verarbeitungszeit</div>
                <div className="font-semibold">{analysisResult.processingTime}ms</div>
              </div>
              <div>
                <div className="text-gray-500">API-Aufrufe</div>
                <div className="font-semibold">{analysisResult.costs.apiCalls}</div>
              </div>
              <div>
                <div className="text-gray-500">Geschätzte Kosten</div>
                <div className="font-semibold">${analysisResult.costs.estimatedCost.toFixed(4)}</div>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {enableDebug && analysisResult.debugInfo && (
            <div className="mt-6 pt-4 border-t">
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-gray-700">
                  Debug-Informationen anzeigen
                </summary>
                <div className="mt-3 space-y-3">
                  {analysisResult.debugInfo.detectedTexts.length > 0 && (
                    <div>
                      <div className="font-semibold">Alle erkannten Texte:</div>
                      <div className="bg-gray-100 p-2 rounded text-xs max-h-32 overflow-y-auto">
                        {analysisResult.debugInfo.detectedTexts.map((text, i) => (
                          <div key={i} className="border-b border-gray-200 pb-1 mb-1">
                            {text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Re-analyze Button */}
      {uploadedImageUrl && !analyzing && (
        <div className="text-center">
          <button
            onClick={() => analyzeWithGoogleVision(uploadedImageUrl)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
          >
            <Zap className="w-4 h-4" />
            Erneut analysieren
          </button>
        </div>
      )}
    </div>
  )
}
