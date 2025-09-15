'use client'

import { useEffect, useState } from 'react'
import { clearSupabaseCache, detectCacheIssue } from '@/utils/clearBrowserCache'

export default function ClearCachePage() {
  const [cacheCleared, setCacheCleared] = useState(false)
  const [cacheIssues, setCacheIssues] = useState(false)

  useEffect(() => {
    const issues = detectCacheIssue()
    setCacheIssues(issues)
  }, [])

  const handleClearCache = () => {
    const success = clearSupabaseCache()
    setCacheCleared(success || false)
    
    if (success) {
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Cache Debug Tool
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-900">Cache Status</h2>
            <p className="text-blue-700">
              Cache Issues Detected: {cacheIssues ? '❌ Yes' : '✅ No'}
            </p>
          </div>

          {cacheIssues && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h2 className="font-semibold text-yellow-900">Problem erkannt</h2>
              <p className="text-yellow-700">
                Korrupte Browser-Session gefunden. Dies kann den Spinner verursachen.
              </p>
            </div>
          )}

          <button
            onClick={handleClearCache}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            🗑️ Browser Cache löschen
          </button>

          {cacheCleared && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h2 className="font-semibold text-green-900">✅ Cache gelöscht</h2>
              <p className="text-green-700">
                Weiterleitung zur Startseite in 2 Sekunden...
              </p>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>Problem:</strong> App funktioniert nur im Inkognito-Modus</p>
            <p><strong>Lösung:</strong> Browser-Cache löschen</p>
          </div>
        </div>
      </div>
    </div>
  )
}
