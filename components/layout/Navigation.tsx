'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import {
  HomeIcon,
  TicketIcon,
  CurrencyDollarIcon,
  UserIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Coupons', href: '/coupons', icon: TicketIcon },
  { name: 'Cashback', href: '/cashback', icon: CurrencyDollarIcon },
  { name: 'Profil', href: '/profile', icon: UserIcon },
]

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: Cog6ToothIcon },
]

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, isAdmin } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const allNavigation = isAdmin ? [...navigation, ...adminNavigation] : navigation

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900">Leo&apos;s Coupons</span>
          </div>
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="safe-area-top">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                    L
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-semibold text-gray-900">Leo&apos;s Coupons</div>
                    <div className="text-sm text-gray-500">{profile?.username}</div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="mt-4 px-4 space-y-1">
                {allNavigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Sign out */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 safe-area-bottom">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
                >
                  <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
              L
            </div>
            <div className="ml-3">
              <div className="text-lg font-semibold text-gray-900">Leo&apos;s Coupons</div>
              <div className="text-sm text-gray-500">{profile?.username}</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {allNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="flex-shrink-0 px-4">
            <button
              onClick={handleSignOut}
              className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <svg className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-16"></div>
    </>
  )
}
