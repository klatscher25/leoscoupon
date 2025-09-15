'use client'

import React, { useState, useRef } from 'react'
import { 
  FolderIcon, 
  LinkIcon, 
  PlayIcon, 
  StopIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  EyeIcon,
  CurrencyDollarIcon as DollarSignIcon 
} from '@heroicons/react/24/outline'
import { GoogleVisionCouponAnalyzer, GoogleVisionCouponResult } from '../../utils/googleVisionCouponAnalyzer'

interface GoogleDriveBatchUploadProps {
  googleVisionApiKey?: string
  onBatchAnalyzed?: (results: GoogleVisionCouponResult[]) => void
}

interface BatchProgress {
  total: number
  processed: number
  successful: number
  failed: number
  currentFile: string
  isRunning: boolean
}

export default function GoogleDriveBatchUpload({
  googleVisionApiKey,
  onBatchAnalyzed
}: GoogleDriveBatchUploadProps) {
  
  const [driveUrls, setDriveUrls] = useState('')
  const [progress, setProgress] = useState<BatchProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    currentFile: '',
    isRunning: false
  })
  const [results, setResults] = useState<GoogleVisionCouponResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [totalCost, setTotalCost] = useState(0)
  
  const analyzerRef = useRef<GoogleVisionCouponAnalyzer | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize Google Vision Analyzer
  const getAnalyzer = () => {
    if (!analyzerRef.current && googleVisionApiKey) {
      analyzerRef.current = new GoogleVisionCouponAnalyzer(
        { apiKey: googleVisionApiKey, enableDebug: false },
        { maxMonthlyBudget: 20.0, maxDailyRequests: 200 }
      )
    }
    return analyzerRef.current
  }

  // Extract Google Drive image URLs from shared links
  const extractImageUrls = (urls: string): string[] => {
    const lines = urls.split('\n').filter(line => line.trim())
    const imageUrls: string[] = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Google Drive direct image URLs
      if (trimmed.includes('drive.google.com') && trimmed.includes('/file/d/')) {
        const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
        if (fileIdMatch) {
          const fileId = fileIdMatch[1]
          const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
          imageUrls.push(directUrl)
        }
      }
      // Google Drive sharing links
      else if (trimmed.includes('drive.google.com') && trimmed.includes('sharing')) {
        const fileIdMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/)
        if (fileIdMatch) {
          const fileId = fileIdMatch[1]
          const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
          imageUrls.push(directUrl)
        }
      }
      // Direct image URLs (http/https)
      else if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
        imageUrls.push(trimmed)
      }
    }
    
    return imageUrls
  }

  const startBatchProcessing = async () => {
    if (!googleVisionApiKey) {
      alert('Google Vision API Key ist erforderlich für Batch-Processing')
      return
    }

    const analyzer = getAnalyzer()
    if (!analyzer) {
      alert('Google Vision Analyzer konnte nicht initialisiert werden')
      return
    }

    const imageUrls = extractImageUrls(driveUrls)
    if (imageUrls.length === 0) {
      alert('Keine gültigen Bild-URLs gefunden. Bitte überprüfe deine Google Drive Links.')
      return
    }

    // Reset state
    setResults([])
    setTotalCost(0)
    setProgress({
      total: imageUrls.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentFile: '',
      isRunning: true
    })

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()
    
    try {
      const batchResults: GoogleVisionCouponResult[] = []
      let runningCost = 0

      for (let i = 0; i < imageUrls.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          break
        }

        const url = imageUrls[i]
        const fileName = `Coupon ${i + 1}`
        
        setProgress(prev => ({
          ...prev,
          currentFile: fileName,
          processed: i
        }))

        try {
          console.log(`🔄 Processing ${fileName}: ${url}`)
          const result = await analyzer.analyzeImage(url)
          
          result.originalImageUrl = url // Ensure we have the URL
          batchResults.push(result)
          
          if (result.success) {
            setProgress(prev => ({ ...prev, successful: prev.successful + 1 }))
            runningCost += result.costs?.estimatedCost || 0
          } else {
            setProgress(prev => ({ ...prev, failed: prev.failed + 1 }))
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${fileName}:`, error)
          
          // Create failed result
          const failedResult: GoogleVisionCouponResult = {
            success: false,
            confidence: 0,
            structuredData: {},
            costs: { apiCalls: 0, estimatedCost: 0 },
            processingTime: 0,
            originalImageUrl: url
          }
          
          batchResults.push(failedResult)
          setProgress(prev => ({ ...prev, failed: prev.failed + 1 }))
        }

        setProgress(prev => ({ ...prev, processed: i + 1 }))
        setTotalCost(runningCost)

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setResults(batchResults)
      setShowResults(true)
      onBatchAnalyzed?.(batchResults)

    } catch (error) {
      console.error('Batch processing error:', error)
      alert('Fehler beim Batch-Processing: ' + error)
    } finally {
      setProgress(prev => ({ ...prev, isRunning: false, currentFile: '' }))
      abortControllerRef.current = null
    }
  }

  const stopBatchProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setProgress(prev => ({ ...prev, isRunning: false, currentFile: '' }))
    }
  }

  const getProgressPercentage = () => {
    if (progress.total === 0) return 0
    return Math.round((progress.processed / progress.total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <FolderIcon className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Google Drive Batch Upload</h2>
        </div>
        <p className="text-green-100">
          Verarbeite mehrere Coupons aus deinem Google Drive Ordner mit KI-Power
        </p>
      </div>

      {/* API Key Status */}
      {!googleVisionApiKey && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">⚠️ Google Vision API Key fehlt</div>
          <div className="text-red-600 text-sm mt-1">
            Für Batch-Processing wird ein Google Vision API Key benötigt.<br/>
            <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_VISION_API_KEY=your_api_key</code>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Google Drive Links eingeben
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Drive Sharing Links (ein Link pro Zeile)
            </label>
            <textarea
              value={driveUrls}
              onChange={(e) => setDriveUrls(e.target.value)}
              placeholder={`Beispiel:
https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing
https://drive.google.com/file/d/1DEF456uvw/view?usp=sharing
https://drive.google.com/file/d/1GHI789rst/view?usp=sharing

Oder direkte Bild-URLs:
https://example.com/coupon1.jpg
https://example.com/coupon2.png`}
              rows={8}
              className="w-full border rounded-lg p-3 text-sm font-mono"
              disabled={progress.isRunning}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {extractImageUrls(driveUrls).length} Bilder erkannt
            </div>
            
            <div className="flex gap-2">
              {!progress.isRunning ? (
                <button
                  onClick={startBatchProcessing}
                  disabled={!googleVisionApiKey || extractImageUrls(driveUrls).length === 0}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <PlayIcon className="w-4 h-4" />
                  Batch-Analyse starten
                </button>
              ) : (
                <button
                  onClick={stopBatchProcessing}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <StopIcon className="w-4 h-4" />
                  Stoppen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {progress.total > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Fortschritt</h3>
          
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{progress.processed}</div>
                <div className="text-gray-500">Verarbeitet</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.successful}</div>
                <div className="text-gray-500">Erfolgreich</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
                <div className="text-gray-500">Fehlgeschlagen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${totalCost.toFixed(4)}</div>
                <div className="text-gray-500">Kosten</div>
              </div>
            </div>
            
            {progress.currentFile && (
              <div className="text-center text-sm text-gray-600">
                Verarbeite gerade: <span className="font-semibold">{progress.currentFile}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Batch-Ergebnisse</h3>
            <button
              onClick={() => setShowResults(!showResults)}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <EyeIcon className="w-4 h-4" />
              {showResults ? 'Ausblenden' : 'Anzeigen'}
            </button>
          </div>

          {showResults && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Gesamt:</span>
                    <span className="font-semibold ml-2">{results.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Erfolgreich:</span>
                    <span className="font-semibold text-green-600 ml-2">
                      {results.filter(r => r.success).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fehlgeschlagen:</span>
                    <span className="font-semibold text-red-600 ml-2">
                      {results.filter(r => !r.success).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Gesamtkosten:</span>
                    <span className="font-semibold text-purple-600 ml-2">
                      ${totalCost.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Results */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.success 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold">Coupon {index + 1}</span>
                      </div>
                      
                      {result.costs && (
                        <div className="text-sm text-gray-500">
                          ${result.costs.estimatedCost.toFixed(4)}
                        </div>
                      )}
                    </div>

                    {result.success && result.structuredData && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {result.structuredData.storeName && (
                          <div>
                            <span className="text-gray-500">Store:</span>
                            <span className="font-semibold ml-1">{result.structuredData.storeName}</span>
                          </div>
                        )}
                        
                        {result.structuredData.discountValue && (
                          <div>
                            <span className="text-gray-500">Rabatt:</span>
                            <span className="font-semibold ml-1">
                              {result.structuredData.discountValue}
                              {result.structuredData.discountType === 'percentage' ? '%' : 
                               result.structuredData.discountType === 'euro' ? '€' : 
                               result.structuredData.discountType === 'multiplier' ? 'FACH' : ''}
                            </span>
                          </div>
                        )}
                        
                        {result.barcode && (
                          <div>
                            <span className="text-gray-500">Barcode:</span>
                            <span className="font-mono text-xs ml-1">{result.barcode.value.substring(0, 8)}...</span>
                          </div>
                        )}
                        
                        {result.structuredData.validUntil && (
                          <div>
                            <span className="text-gray-500">Gültig bis:</span>
                            <span className="font-semibold ml-1">
                              {new Date(result.structuredData.validUntil).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {!result.success && (
                      <div className="text-sm text-red-600">
                        Keine Coupon-Daten erkannt
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => {
                    const successful = results.filter(r => r.success)
                    if (successful.length > 0) {
                      alert(`${successful.length} erfolgreich analysierte Coupons können jetzt als Vorlagen verwendet werden.`)
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Erfolgreiche als Vorlagen verwenden
                </button>
                
                <button
                  onClick={() => {
                    const csvData = results.map((r, i) => ({
                      coupon: `Coupon ${i + 1}`,
                      success: r.success ? 'Ja' : 'Nein',
                      store: r.structuredData?.storeName || '',
                      discount: r.structuredData?.discountValue || '',
                      barcode: r.barcode?.value || '',
                      cost: r.costs?.estimatedCost || 0
                    }))
                    
                    console.log('CSV Export:', csvData)
                    alert('CSV-Export-Funktion würde hier implementiert werden')
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Als CSV exportieren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Wie funktioniert's?</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. Teile deine Coupon-Bilder in Google Drive und kopiere die Links</div>
          <div>2. Füge die Links hier ein (ein Link pro Zeile)</div>
          <div>3. Starte die Batch-Analyse - Google Vision KI erkennt alle Daten automatisch</div>
          <div>4. Nutze die erfolgreich analysierten Coupons als Vorlagen für neue Einträge</div>
        </div>
        
        <div className="mt-3 text-xs text-blue-600">
          <strong>Kosten:</strong> ~$0.003 pro Coupon | <strong>Geschwindigkeit:</strong> ~2-3 Sekunden pro Coupon
        </div>
      </div>
    </div>
  )
}
