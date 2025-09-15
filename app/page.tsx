import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-20 h-20 mx-auto mb-6">
          <div className="w-full h-full bg-primary-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
            L
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Leo&apos;s Coupon & Cashback App
        </h1>
        <p className="text-gray-600 mb-8">
          Coupon Management und Cashback Tracking für die Familie
        </p>
        
        <div className="space-y-4">
          <Link 
            href="/auth/login"
            className="block w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Anmelden
          </Link>
          <Link 
            href="/auth/register"
            className="block w-full border border-primary-600 text-primary-600 py-3 px-6 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Registrieren
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>✅ Coupon Scanner & Management</p>
          <p>💰 Cashback Tracking</p>
          <p>📱 PWA Support</p>
        </div>
      </div>
    </div>
  )
}
