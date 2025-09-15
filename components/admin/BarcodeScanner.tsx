'use client'

import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import {
  CameraIcon,
  StopIcon,
  QrCodeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string, format: string) => void
  onError?: (error: string) => void
}

export default function BarcodeScanner({ onBarcodeDetected, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    // Initialize barcode reader
    codeReaderRef.current = new BrowserMultiFormatReader()
    
    // Get video devices
    getVideoDevices()
    
    return () => {
      stopScanning()
    }
  }, [])

  const getVideoDevices = async () => {
    try {
      // ZUERST: Kamera-Berechtigung explizit anfordern
      console.log('🔍 Requesting camera permission...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // iPhone Back-Camera bevorzugen
        } 
      })
      
      // Stream wieder stoppen (nur für Permission-Check)
      stream.getTracks().forEach(track => track.stop())
      
      console.log('✅ Camera permission granted')
      
      // DANN: Video Devices laden
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices()
      console.log('📷 Found devices:', videoDevices.length)
      
      setDevices(videoDevices)
      
      if (videoDevices.length === 0) {
        setError('Keine Kamera gefunden. Stelle sicher, dass eine Kamera angeschlossen ist.')
        return
      }
      
      // Prefer back camera on mobile (iPhone/Android)
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('hauptkamera')
      )
      
      if (backCamera) {
        console.log('📱 Using back camera:', backCamera.label)
        setSelectedDevice(backCamera.deviceId)
      } else if (videoDevices.length > 0) {
        console.log('💻 Using first available camera:', videoDevices[0].label)
        setSelectedDevice(videoDevices[0].deviceId)
      }
      
    } catch (err: any) {
      console.error('Camera error:', err)
      
      let errorMessage = 'Kamera-Zugriff nicht verfügbar'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = '❌ Kamera-Berechtigung verweigert. Bitte in den Browser-Einstellungen erlauben.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = '📷 Keine Kamera gefunden. Webcam oder iPhone-Kamera erforderlich.'
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '🔒 HTTPS erforderlich für Kamera-Zugriff. Verwende https:// statt http://'
      } else if (err.name === 'NotReadableError') {
        errorMessage = '🔧 Kamera wird bereits von anderer App verwendet.'
      }
      
      setError(errorMessage)
    }
  }

  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current) return

    try {
      setError(null)
      setIsScanning(true)
      
      const deviceId = selectedDevice || undefined
      
      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcode = result.getText()
            const format = result.getBarcodeFormat().toString().toLowerCase()
            
            console.log('📷 Barcode detected:', { barcode, format })
            onBarcodeDetected(barcode, format)
            stopScanning()
          }
          
          if (error && error.name !== 'NotFoundException') {
            console.error('Barcode scan error:', error)
          }
        }
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setError('Kamera kann nicht gestartet werden')
      setIsScanning(false)
      onError?.('Kamera-Fehler: ' + (err as Error).message)
    }
  }

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset()
    }
    setIsScanning(false)
  }

  const isHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  )

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        📷 Barcode Scanner
      </label>
      
      {/* HTTPS Warning */}
      {!isHTTPS && !isLocalhost && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <div className="text-sm">
              <p className="font-semibold text-yellow-800">HTTPS erforderlich</p>
              <p className="text-yellow-700">
                Kamera-Zugriff funktioniert nur über HTTPS. 
                Für Entwicklung: verwende localhost oder https://
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Selection */}
      {devices.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Kamera auswählen
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="input text-sm"
            disabled={isScanning}
          >
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Kamera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scanner Controls */}
      <div className="flex space-x-2">
        {!isScanning ? (
          <>
            <button
              type="button"
              onClick={startScanning}
              disabled={devices.length === 0 || (!isHTTPS && !isLocalhost)}
              className="btn-primary text-sm py-2 px-3"
            >
              <CameraIcon className="h-4 w-4 mr-2" />
              Scanner starten
            </button>
            
            {/* Fallback: Manual Barcode Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="📝 Barcode manuell eingeben (Fallback)"
                className="input text-sm w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const barcode = e.currentTarget.value.trim()
                    console.log('📝 Manual barcode entry:', barcode)
                    
                    // Detect barcode type based on format
                    let format = 'unknown'
                    if (/^\d{13}$/.test(barcode)) format = 'ean13'
                    else if (/^\d{12}$/.test(barcode)) format = 'upc_a'
                    else if (/^\d{8}$/.test(barcode)) format = 'ean8'
                    
                    onBarcodeDetected(barcode, format)
                    e.currentTarget.value = ''
                  }
                }}
              />
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={stopScanning}
            className="btn-outline text-sm py-2 px-3"
          >
            <StopIcon className="h-4 w-4 mr-2" />
            Scanner stoppen
          </button>
        )}
      </div>

      {/* Video Element */}
      {isScanning && (
        <div className="relative border-2 border-dashed border-blue-300 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-64 object-cover bg-black"
            playsInline
            muted
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-red-500 bg-red-500 bg-opacity-20 rounded-lg">
              <QrCodeIcon className="h-16 w-16 text-red-500 m-4" />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white text-sm p-2 rounded">
            Halte den Barcode in den roten Bereich. Scanner erkennt automatisch EAN-13, UPC, QR-Codes und mehr.
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Info */}
      {!isScanning && !error && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            💡 <strong>Unterstützte Formate:</strong> EAN-13, UPC-A, Code128, QR-Code, DataMatrix und mehr.
          </div>
          
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            📱 <strong>iPhone:</strong> Verwende Safari-Browser für beste Kamera-Kompatibilität<br/>
            💻 <strong>Desktop:</strong> Stelle sicher, dass eine Webcam angeschlossen ist<br/>
            📝 <strong>Fallback:</strong> Barcode manuell eingeben und Enter drücken
          </div>
          
          {devices.length > 0 && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
              ✅ {devices.length} Kamera(s) erkannt: {devices.map(d => d.label || 'Unbekannt').join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
