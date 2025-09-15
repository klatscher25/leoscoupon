'use client'

import Link from 'next/link'

export default function SafariHelpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🍎</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Safari iOS Login-Hilfe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Safari auf iPhone/iPad kann Login-Probleme verursachen
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">🔧 Lösungen ausprobieren:</h3>
          
          <div className="space-y-4 text-sm text-yellow-700">
            <div>
              <strong>1. Safari Einstellungen:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Einstellungen → Safari → "Cross-Site Tracking verhindern" AUS</li>
                <li>Einstellungen → Safari → "Alle Cookies blockieren" AUS</li>
              </ul>
            </div>
            
            <div>
              <strong>2. Privater Modus verwenden:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Safari öffnen → unten rechts Tabs → "Privat" → App erneut öffnen</li>
              </ul>
            </div>
            
            <div>
              <strong>3. Alternative Browser:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Chrome für iOS installieren und verwenden</li>
                <li>Firefox für iOS installieren und verwenden</li>
              </ul>
            </div>

            <div>
              <strong>4. Cache komplett leeren:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Einstellungen → Safari → Verlauf und Websitedaten löschen</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🔍 Warum passiert das?</h3>
          <p className="text-sm text-blue-700">
            Safari iOS hat strengere Sicherheitsrichtlinien für Cookies und localStorage. 
            Diese können die Authentifizierung blockieren, besonders bei Web-Apps.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="w-full btn-primary btn-lg block text-center"
          >
            🔄 Erneut versuchen
          </Link>
          
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.clear()
                sessionStorage.clear()
                window.location.href = '/auth/login'
              }
            }}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-red-700"
          >
            🗑️ Alle Daten löschen & neu starten
          </button>
        </div>

        <div className="text-center text-xs text-gray-500">
          <p>Probleme weiterhin? Verwende Chrome oder Firefox auf iOS</p>
        </div>
      </div>
    </div>
  )
}
