import { format, parseISO, isValid } from 'date-fns'
import { de } from 'date-fns/locale'
import { Database } from '@/lib/database.types'
import { COMBINATION_RULES } from './constants'

type CouponCategory = Database['public']['Enums']['coupon_category']

// Date formatting
export function formatDate(date: string | Date, formatStr: string = 'dd.MM.yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, formatStr, { locale: de })
  } catch {
    return ''
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm')
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount)
}

// String utilities
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

// Array utilities
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key])
    if (!result[group]) {
      result[group] = []
    }
    result[group].push(item)
    return result
  }, {} as Record<string, T[]>)
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidIBAN(iban: string): boolean {
  // Basic IBAN validation (German format)
  const ibanRegex = /^DE\d{20}$/
  return ibanRegex.test(iban.replace(/\s/g, ''))
}

export function formatIBAN(iban: string): string {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase()
  return cleanIban.replace(/(.{4})/g, '$1 ').trim()
}

// File utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// Coupon utilities
export function canCombineCoupons(
  coupon1Category: CouponCategory,
  coupon2Category: CouponCategory
): boolean {
  // Same category combinations
  if (coupon1Category === coupon2Category) {
    // Einkauf coupons cannot be combined with each other
    if (coupon1Category === 'einkauf') return false
    // Warengruppe and artikel can be combined with same category
    return true
  }
  
  // Different category combinations
  const allowedCombinations = COMBINATION_RULES[coupon1Category]
  return allowedCombinations.includes(coupon2Category)
}

export function validateCouponCombination(
  selectedCoupons: Array<{ category: CouponCategory }>
): { isValid: boolean; conflicts: string[] } {
  const conflicts: string[] = []
  
  // Check if multiple "einkauf" coupons are selected
  const einkaufCoupons = selectedCoupons.filter(c => c.category === 'einkauf')
  if (einkaufCoupons.length > 1) {
    conflicts.push('Nur ein Einkaufs-Coupon kann verwendet werden')
  }
  
  // Check category combinations
  for (let i = 0; i < selectedCoupons.length; i++) {
    for (let j = i + 1; j < selectedCoupons.length; j++) {
      if (!canCombineCoupons(selectedCoupons[i].category, selectedCoupons[j].category)) {
        conflicts.push(`${selectedCoupons[i].category} kann nicht mit ${selectedCoupons[j].category} kombiniert werden`)
      }
    }
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts: unique(conflicts)
  }
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    entwurf: 'bg-gray-100 text-gray-800',
    eingereicht: 'bg-blue-100 text-blue-800',
    genehmigt: 'bg-green-100 text-green-800',
    ausgezahlt: 'bg-success-100 text-success-800',
    abgelehnt: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800'
  }
  
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

// Search utilities
export function searchInObject(obj: any, searchTerm: string): boolean {
  const search = searchTerm.toLowerCase()
  
  const searchValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase().includes(search)
    }
    if (typeof value === 'number') {
      return value.toString().includes(search)
    }
    if (Array.isArray(value)) {
      return value.some(searchValue)
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(searchValue)
    }
    return false
  }
  
  return Object.values(obj).some(searchValue)
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch {
    return defaultValue
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Handle storage errors silently
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(key)
  } catch {
    // Handle storage errors silently
  }
}
