'use client'

import { useState } from 'react'
import { QrCodeIcon, PhotoIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'

interface CouponScannerProps {
  coupon: {
    id: string
    title: string
    barcode_value?: string
    barcode_type?: string
    image_url?: string
    generated_barcode_url?: string // URL to clean generated barcode
    store?: {
      name: string
      logo_url?: string
    }
  }
}

export default function CouponScanner({ coupon }: CouponScannerProps) {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [activeView, setActiveView] = useState<'barcode' | 'original'>('barcode')

  const hasCleanBarcode = coupon.generated_barcode_url || coupon.barcode_value
  const hasOriginalImage = coupon.image_url

  // Determine best scanning option
  const getBestScanningOption = () => {
    if (hasCleanBarcode) return 'barcode'
    if (hasOriginalImage) return 'original'
    return null
  }

  const bestOption = getBestScanningOption()

  if (!hasCleanBarcode && !hasOriginalImage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <QrCodeIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-800 font-medium">Kein Barcode verfügbar</p>
        <p className="text-red-600 text-sm">Dieser Coupon kann nicht gescannt werden</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{coupon.title}</h3>
            {coupon.store && (
              <p className="text-blue-100 text-sm">{coupon.store.name}</p>
            )}
          </div>
          <button
            onClick={() => setShowFullscreen(true)}
            className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors"
          >
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scanner Options */}
      {hasCleanBarcode && hasOriginalImage && (
        <div className="border-b border-gray-200 p-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveView('barcode')}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'barcode'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCodeIcon className="h-4 w-4 mr-2" />
              🎯 Sauberer Code
            </button>
            <button
              onClick={() => setActiveView('original')}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeView === 'original'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PhotoIcon className="h-4 w-4 mr-2" />
              📱 Original-Bild
            </button>
          </div>
        </div>
      )}

      {/* Scanner Display */}
      <div className="p-4">
        {(activeView === 'barcode' || !hasOriginalImage) && hasCleanBarcode && (
          <div className="text-center space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-center mb-2">
                <QrCodeIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">✅ Optimiert für Kassen-Scanner</span>
              </div>
              
              {coupon.generated_barcode_url ? (
                <img
                  src={coupon.generated_barcode_url}
                  alt="Generated Barcode"
                  className="max-w-full h-auto mx-auto bg-white p-2 rounded border"
                />
              ) : coupon.barcode_value && (
                <div className="bg-white p-4 rounded border font-mono text-lg">
                  {coupon.barcode_value}
                </div>
              )}
              
              <p className="text-green-700 text-sm mt-2">
                Dieser saubere Barcode wird an der Kasse optimal erkannt
              </p>
            </div>
          </div>
        )}

        {(activeView === 'original' || !hasCleanBarcode) && hasOriginalImage && (
          <div className="text-center space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-center mb-2">
                <PhotoIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">📱 Original Coupon-Bild</span>
              </div>
              
              <img
                src={coupon.image_url}
                alt="Original Coupon"
                className="max-w-full h-auto mx-auto rounded border"
              />
              
              <p className="text-blue-700 text-sm mt-2">
                Zeigen Sie dieses Bild an der Kasse zum Scannen
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-800 mb-2">💡 Verwendung an der Kasse:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Zeigen Sie den Bildschirm dem Kassierer</li>
            <li>• Warten Sie auf den Scanner-Piepton</li>
            <li>• Bei Problemen: Original-Bild verwenden</li>
          </ul>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Modal Header */}
            <div className="bg-white rounded-t-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{coupon.title}</h3>
                <p className="text-gray-600">{coupon.store?.name}</p>
              </div>
              <button
                onClick={() => setShowFullscreen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="bg-white rounded-b-lg p-6 text-center">
              {(activeView === 'barcode' || !hasOriginalImage) && hasCleanBarcode && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-green-700">🎯 Kassen-Scanner Ready</h4>
                  {coupon.generated_barcode_url ? (
                    <img
                      src={coupon.generated_barcode_url}
                      alt="Generated Barcode Fullscreen"
                      className="max-w-full h-auto mx-auto bg-white p-4 rounded border-2 border-green-300"
                      style={{ maxHeight: '300px' }}
                    />
                  ) : coupon.barcode_value && (
                    <div className="bg-white p-8 rounded border-2 border-green-300 font-mono text-2xl">
                      {coupon.barcode_value}
                    </div>
                  )}
                </div>
              )}

              {(activeView === 'original' || !hasCleanBarcode) && hasOriginalImage && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-blue-700">📱 Original Coupon</h4>
                  <img
                    src={coupon.image_url}
                    alt="Original Coupon Fullscreen"
                    className="max-w-full h-auto mx-auto rounded border-2 border-blue-300"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}

              <p className="text-lg font-medium text-gray-700 mt-4">
                🛒 Bereit für den Einkauf!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
