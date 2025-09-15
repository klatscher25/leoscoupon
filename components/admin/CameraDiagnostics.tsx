'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  CameraIcon 
} from '@heroicons/react/24/outline'

export default function CameraDiagnostics() {
  const [diagnostics, setDiagnostics] = useState({
    https: false,
    mediaDevices: false,
    getUserMedia: false,
    cameras: 0,
    permissions: 'unknown' as 'granted' | 'denied' | 'prompt' | 'unknown'
  })
  
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    const results = { ...diagnostics }
    
    // Check HTTPS
    results.https = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1'
    
    // Check MediaDevices API
    results.mediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    
    if (results.mediaDevices) {
      try {
        // Check camera permissions
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
        results.permissions = permission.state
        
        // Count cameras
        const devices = await navigator.mediaDevices.enumerateDevices()
        results.cameras = devices.filter(device => device.kind === 'videoinput').length
        
      } catch (err) {
        console.log('Permission check failed:', err)
      }
    }
    
    setDiagnostics(results)
  }

  const testCamera = async () => {
    setTesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      // Success - stop stream
      stream.getTracks().forEach(track => track.stop())
      
      setDiagnostics(prev => ({ 
        ...prev, 
        getUserMedia: true, 
        permissions: 'granted' 
      }))
      
    } catch (err: any) {
      console.error('Camera test failed:', err)
      setDiagnostics(prev => ({ 
        ...prev, 
        getUserMedia: false,
        permissions: err.name === 'NotAllowedError' ? 'denied' : prev.permissions
      }))
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircleIcon className="h-5 w-5 text-green-500" /> : 
      <XCircleIcon className="h-5 w-5 text-red-500" />
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'granted': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'denied': return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'prompt': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      default: return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex items-center space-x-2 mb-4">
        <CameraIcon className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Kamera-Diagnose</h3>
        <button
          onClick={runDiagnostics}
          className="btn-outline text-xs py-1 px-2"
        >
          🔄 Aktualisieren
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">HTTPS/Localhost</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(diagnostics.https)}
            <span className="text-xs text-gray-500">
              {diagnostics.https ? 'OK' : 'Erforderlich'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">MediaDevices API</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(diagnostics.mediaDevices)}
            <span className="text-xs text-gray-500">
              {diagnostics.mediaDevices ? 'Verfügbar' : 'Nicht unterstützt'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Kamera-Berechtigung</span>
          <div className="flex items-center space-x-2">
            {getPermissionIcon(diagnostics.permissions)}
            <span className="text-xs text-gray-500 capitalize">
              {diagnostics.permissions === 'granted' ? 'Erlaubt' : 
               diagnostics.permissions === 'denied' ? 'Verweigert' :
               diagnostics.permissions === 'prompt' ? 'Noch nicht gefragt' : 'Unbekannt'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Gefundene Kameras</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(diagnostics.cameras > 0)}
            <span className="text-xs text-gray-500">
              {diagnostics.cameras} Gerät(e)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Kamera-Zugriff</span>
          <div className="flex items-center space-x-2">
            {diagnostics.getUserMedia ? 
              getStatusIcon(true) : 
              <button
                onClick={testCamera}
                disabled={testing || !diagnostics.mediaDevices || !diagnostics.https}
                className="btn-primary text-xs py-1 px-2"
              >
                {testing ? '⏳' : '🧪'} Testen
              </button>
            }
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      {(!diagnostics.https || !diagnostics.mediaDevices || diagnostics.permissions === 'denied') && (
        <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 text-sm mb-2">💡 Lösungen:</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            {!diagnostics.https && (
              <li>• Verwende https:// oder localhost für Kamera-Zugriff</li>
            )}
            {!diagnostics.mediaDevices && (
              <li>• Browser unterstützt keine Kamera-API (sehr alt?)</li>
            )}
            {diagnostics.permissions === 'denied' && (
              <li>• Browser-Einstellungen → Datenschutz → Kamera erlauben</li>
            )}
            {diagnostics.cameras === 0 && (
              <li>• Webcam anschließen oder iPhone Safari verwenden</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
