import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-sm mx-auto">
          {/* Logo mit modernem Design */}
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-xl transform hover:scale-105 transition-transform duration-200">
              L
            </div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          
          {/* Titel mit besserem Typography */}
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">
            Leo&apos;s Coupons
          </h1>
          <h2 className="text-xl font-semibold text-blue-600 mb-2">
            & Cashback
          </h2>
          <p className="text-gray-600 mb-10 text-lg leading-relaxed px-2">
            Deine persönliche App für
            <br />
            <span className="font-semibold text-gray-800">Coupons & Cashback</span>
          </p>
          
          {/* Hauptbutton - größer und ansprechender */}
          <Link 
            href="/auth/login"
            className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            App öffnen
          </Link>

          {/* Features mit modernen Icons */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center justify-center space-x-3 text-gray-700">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">📱</span>
              </div>
              <span className="font-medium">Coupon Scanner</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-700">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-lg">💰</span>
              </div>
              <span className="font-medium">Cashback Tracking</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-700">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">⚡</span>
              </div>
              <span className="font-medium">Blitzschnell</span>
            </div>
          </div>

          {/* Family Badge */}
          <div className="mt-8 inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
            <span className="text-amber-600 text-sm font-medium">👨‍👩‍👧‍👦 Nur für die Familie</span>
          </div>
        </div>
      </div>
    </div>
  )
}
