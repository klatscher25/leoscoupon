'use client'

import { useState } from 'react'
import { clearSupabaseCache, detectCacheIssue } from '@/utils/clearBrowserCache'

export default function LoginDebugger() {
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [isVisible, setIsVisible] = useState(false)

  const runDiagnostics = () => {
    const info = []
    
    // Check cache issues
    const hasCacheIssue = detectCacheIssue()
    info.push(`Cache Issues: ${hasCacheIssue ? '❌ DETECTED' : '✅ OK'}`)
    
    // Check localStorage
    const localStorageKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('supabase') || key?.includes('auth')) {
        localStorageKeys.push(key)
      }
    }
    info.push(`Auth Keys in localStorage: ${localStorageKeys.length}`)
    
    // Check environment
    info.push(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`)
    info.push(`Supabase Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`)
    
    // Check network connectivity
    info.push(`Online: ${navigator.onLine ? '✅ Connected' : '❌ Offline'}`)
    
    setDebugInfo(info.join('\n'))
    setIsVisible(true)
  }

  const clearAllCache = () => {
    clearSupabaseCache()
    setDebugInfo('Cache cleared! Please try logging in again.')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={runDiagnostics}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-xs hover:bg-gray-700"
      >
        🔧 Login Debug
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-60 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">Login Diagnostics</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
            {debugInfo}
          </pre>
          
          <div className="mt-3 space-y-2">
            <button
              onClick={clearAllCache}
              className="w-full bg-red-500 text-white py-1 px-2 rounded text-xs hover:bg-red-600"
            >
              🗑️ Clear All Cache
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-500 text-white py-1 px-2 rounded text-xs hover:bg-blue-600"
            >
              🔄 Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
