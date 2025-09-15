export const COUPON_CATEGORIES = {
  einkauf: {
    label: 'Gesamter Einkauf',
    description: 'Rabatt auf den kompletten Einkaufswert',
    color: 'bg-blue-100 text-blue-800',
    icon: '🛒'
  },
  warengruppe: {
    label: 'Warengruppe',
    description: 'Rabatt auf eine bestimmte Produktkategorie',
    color: 'bg-green-100 text-green-800',
    icon: '📦'
  },
  artikel: {
    label: 'Einzelartikel',
    description: 'Rabatt auf ein spezifisches Produkt',
    color: 'bg-purple-100 text-purple-800',
    icon: '🏷️'
  }
} as const

export const BARCODE_TYPES = {
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upc_a: 'UPC-A',
  upc_e: 'UPC-E',
  code128: 'Code 128',
  code39: 'Code 39',
  qr: 'QR Code',
  datamatrix: 'Data Matrix',
  aztec: 'Aztec',
  other: 'Sonstiger'
} as const

export const CASHBACK_STATUS = {
  entwurf: {
    label: 'Entwurf',
    color: 'bg-gray-100 text-gray-800',
    icon: '📝'
  },
  eingereicht: {
    label: 'Eingereicht',
    color: 'bg-blue-100 text-blue-800',
    icon: '📤'
  },
  genehmigt: {
    label: 'Genehmigt',
    color: 'bg-green-100 text-green-800',
    icon: '✅'
  },
  ausgezahlt: {
    label: 'Ausgezahlt',
    color: 'bg-success-100 text-success-800',
    icon: '💰'
  },
  abgelehnt: {
    label: 'Abgelehnt',
    color: 'bg-red-100 text-red-800',
    icon: '❌'
  }
} as const

export const COMBINATION_RULES = {
  // Einkauf kann nicht mit anderen Einkauf kombiniert werden
  einkauf: ['warengruppe', 'artikel'],
  // Warengruppe kann mit anderen Warengruppen und Artikeln kombiniert werden
  warengruppe: ['warengruppe', 'artikel'],
  // Artikel kann mit allem kombiniert werden
  artikel: ['einkauf', 'warengruppe', 'artikel']
} as const

export const STORES = [
  'Edeka',
  'Rewe',
  'Lidl',
  'Aldi',
  'dm',
  'Rossmann',
  'Saturn',
  'MediaMarkt',
  'Kaufland',
  'Real',
  'Penny',
  'Netto',
  'Norma'
] as const

export const CURRENCIES = ['EUR', 'USD', 'CHF'] as const

export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'

export const TOAST_DURATION = 4000

export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
} as const
