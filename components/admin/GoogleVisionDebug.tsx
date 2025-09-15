'use client'

import React, { useState } from 'react'
import { PlayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface GoogleVisionDebugProps {
  googleVisionApiKey?: string
}

export default function GoogleVisionDebug({ googleVisionApiKey }: GoogleVisionDebugProps) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [serverLogs, setServerLogs] = useState<string[]>([])

  const testGoogleVisionAPI = async () => {
    if (!googleVisionApiKey) {
      setTestResult({ error: 'API Key fehlt - bitte in .env.local konfigurieren' })
      return
    }

    setTesting(true)
    setTestResult(null)
    setServerLogs(['🔄 Starte Google Vision API Test...'])

    try {
      console.log('🧪 STARTING GOOGLE VISION DEBUG TEST')
      
      const response = await fetch('/api/debug/google-vision-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: 'test-image-url',
          apiKey: googleVisionApiKey
        })
      })

      const data = await response.json()
      console.log('🧪 DEBUG TEST RESULT:', data)

      setTestResult(data)
      
      if (data.success) {
        setServerLogs(prev => [...prev, '✅ Google Vision API ist korrekt konfiguriert'])
      } else {
        setServerLogs(prev => [...prev, `❌ Test fehlgeschlagen: ${data.error}`])
      }

    } catch (error) {
      console.error('💥 DEBUG TEST ERROR:', error)
      setTestResult({ error: 'Netzwerk-Fehler: ' + (error as Error).message })
      setServerLogs(prev => [...prev, `💥 Netzwerk-Fehler: ${error}`])
    } finally {
      setTesting(false)
    }
  }

  // Real-time server logs simulation
  React.useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    
    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('GOOGLE VISION') || message.includes('🌟') || message.includes('📊')) {
        setServerLogs(prev => [...prev, `LOG: ${message}`])
      }
      originalLog.apply(console, args)
    }
    
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('GOOGLE VISION') || message.includes('❌') || message.includes('💥')) {
        setServerLogs(prev => [...prev, `ERROR: ${message}`])
      }
      originalError.apply(console, args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">🔧 Google Vision Debug Console</h3>
      
      {/* API Key Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {googleVisionApiKey ? (
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">API Key Status</span>
        </div>
        
        {googleVisionApiKey ? (
          <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
            ✅ API Key konfiguriert: {googleVisionApiKey.substring(0, 10)}...
          </div>
        ) : (
          <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
            ❌ Kein API Key gefunden. Bitte füge NEXT_PUBLIC_GOOGLE_VISION_API_KEY in .env.local hinzu.
          </div>
        )}
      </div>

      {/* Test Button */}
      <div className="mb-4">
        <button
          onClick={testGoogleVisionAPI}
          disabled={testing || !googleVisionApiKey}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          {testing ? 'Teste...' : 'Google Vision API testen'}
        </button>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="mb-4">
          <h4 className="font-medium mb-2">Test-Ergebnis:</h4>
          <div className={`p-3 rounded text-sm ${
            testResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {testResult.success ? (
              <div>
                <div className="font-medium">✅ Erfolgreich!</div>
                <div>{testResult.message}</div>
              </div>
            ) : (
              <div>
                <div className="font-medium">❌ Fehlgeschlagen</div>
                <div>{testResult.error}</div>
                {testResult.details && (
                  <div className="mt-2 text-xs">
                    Details: {JSON.stringify(testResult.details, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Server Logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Server Logs (Live)</h4>
          <button
            onClick={() => setServerLogs([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
        
        <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-64 overflow-y-auto">
          {serverLogs.length === 0 ? (
            <div className="text-gray-500">Warte auf Server-Logs...</div>
          ) : (
            serverLogs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-400">[{new Date().toLocaleTimeString()}]</span> {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
        <strong>💡 Debug-Tipps:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Öffne die Browser-Konsole (F12) für detaillierte Logs</li>
          <li>Server-Logs erscheinen hier in Echtzeit</li>
          <li>Bei Fehlern: Prüfe API Key, Netzwerk und Google Cloud Billing</li>
          <li>Test mit echtem Coupon-Upload um vollständige Logs zu sehen</li>
        </ul>
      </div>
    </div>
  )
}
