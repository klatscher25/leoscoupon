import { Database } from '@/lib/database.types'

type Coupon = Database['public']['Tables']['coupons']['Row']
type CouponCategory = Database['public']['Enums']['coupon_category']

export interface CouponValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface CartCoupon {
  coupon: Coupon
  quantity?: number
}

/**
 * Payback Coupon Kombinationsregeln (2024)
 * 
 * Basierend auf echten Payback-Richtlinien:
 * - Einkauf: Max 1 pro Transaktion
 * - Warengruppe: Mehrere möglich, aber nur verschiedene Warengruppen
 * - Artikel: Mehrere möglich, aber nur verschiedene Artikel
 */
export class PaybackCouponValidator {
  
  /**
   * Validiert ob Coupons zusammen verwendbar sind
   */
  static validateCouponCombination(cartCoupons: CartCoupon[]): CouponValidationResult {
    const result: CouponValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    if (cartCoupons.length === 0) {
      return result
    }

    // Regel 1: Maximal 1 Einkauf-Coupon pro Transaktion
    this.validateEinkaufCoupons(cartCoupons, result)

    // Regel 2: Warengruppe-Coupons müssen verschiedene Warengruppen betreffen
    this.validateWarengruppeCoupons(cartCoupons, result)

    // Regel 3: Artikel-Coupons müssen verschiedene Artikel betreffen  
    this.validateArtikelCoupons(cartCoupons, result)

    // Regel 4: Kombinierbarkeits-Matrix prüfen
    this.validateCombinabilityMatrix(cartCoupons, result)

    return result
  }

  /**
   * Prüft Einkauf-Coupon Regel: Max 1 pro Transaktion
   */
  private static validateEinkaufCoupons(cartCoupons: CartCoupon[], result: CouponValidationResult) {
    const einkaufCoupons = cartCoupons.filter(c => c.coupon.category === 'einkauf')
    
    if (einkaufCoupons.length > 1) {
      result.isValid = false
      result.errors.push(
        `Nur 1 Einkauf-Coupon pro Transaktion erlaubt. ` +
        `Gefunden: ${einkaufCoupons.map(c => c.coupon.title).join(', ')}`
      )
    }
  }

  /**
   * Prüft Warengruppe-Coupon Regel: Keine doppelten Warengruppen
   */
  private static validateWarengruppeCoupons(cartCoupons: CartCoupon[], result: CouponValidationResult) {
    const warengruppeCoupons = cartCoupons.filter(c => c.coupon.category === 'warengruppe')
    const warengruppen = new Set<string>()
    const duplicates: string[] = []

    warengruppeCoupons.forEach(cartCoupon => {
      const warengruppe = cartCoupon.coupon.warengruppe_id || cartCoupon.coupon.title
      
      if (warengruppen.has(warengruppe)) {
        duplicates.push(cartCoupon.coupon.title)
      } else {
        warengruppen.add(warengruppe)
      }
    })

    if (duplicates.length > 0) {
      result.isValid = false
      result.errors.push(
        `Mehrere Coupons für dieselbe Warengruppe nicht erlaubt: ${duplicates.join(', ')}`
      )
    }
  }

  /**
   * Prüft Artikel-Coupon Regel: Keine doppelten Artikel
   */
  private static validateArtikelCoupons(cartCoupons: CartCoupon[], result: CouponValidationResult) {
    const artikelCoupons = cartCoupons.filter(c => c.coupon.category === 'artikel')
    const artikel = new Set<string>()
    const duplicates: string[] = []

    artikelCoupons.forEach(cartCoupon => {
      const artikelId = cartCoupon.coupon.artikel_id || cartCoupon.coupon.title
      
      if (artikel.has(artikelId)) {
        duplicates.push(cartCoupon.coupon.title)
      } else {
        artikel.add(artikelId)
      }
    })

    if (duplicates.length > 0) {
      result.isValid = false
      result.errors.push(
        `Mehrere Coupons für denselben Artikel nicht erlaubt: ${duplicates.join(', ')}`
      )
    }
  }

  /**
   * Prüft generelle Kombinierbarkeits-Matrix
   */
  private static validateCombinabilityMatrix(cartCoupons: CartCoupon[], result: CouponValidationResult) {
    const incompatiblePairs: string[] = []

    for (let i = 0; i < cartCoupons.length; i++) {
      for (let j = i + 1; j < cartCoupons.length; j++) {
        const coupon1 = cartCoupons[i].coupon
        const coupon2 = cartCoupons[j].coupon

        if (!this.areCouponsCombinable(coupon1, coupon2)) {
          incompatiblePairs.push(`"${coupon1.title}" + "${coupon2.title}"`)
        }
      }
    }

    if (incompatiblePairs.length > 0) {
      result.isValid = false
      result.errors.push(
        `Folgende Coupon-Kombinationen sind nicht erlaubt: ${incompatiblePairs.join(', ')}`
      )
    }
  }

  /**
   * Prüft ob zwei spezifische Coupons kombinierbar sind
   */
  private static areCouponsCombinable(coupon1: Coupon, coupon2: Coupon): boolean {
    // Nicht kombinierbare Coupons sind grundsätzlich nicht kombinierbar
    if (!coupon1.is_combinable || !coupon2.is_combinable) {
      return false
    }

    // Prüfe explizite Kombinierbarkeits-Listen
    if (coupon1.combinable_with_categories && 
        !coupon1.combinable_with_categories.includes(coupon2.category)) {
      return false
    }

    if (coupon2.combinable_with_categories && 
        !coupon2.combinable_with_categories.includes(coupon1.category)) {
      return false
    }

    return true
  }

  /**
   * Prüft ob Coupon bereits für diesen Payback-Account eingelöst wurde
   */
  static async validatePaybackAccountUsage(
    couponId: string, 
    paybackAccountId: string,
    supabase: any
  ): Promise<CouponValidationResult> {
    const result: CouponValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      const { data: redemptions, error } = await supabase
        .from('coupon_redemptions')
        .select('*')
        .eq('coupon_id', couponId)
        .eq('payback_account_id', paybackAccountId)

      if (error) {
        result.errors.push('Fehler beim Prüfen der Einlösungshistorie')
        result.isValid = false
        return result
      }

      if (redemptions && redemptions.length > 0) {
        result.isValid = false
        result.errors.push('Coupon bereits für diesen Payback-Account eingelöst')
      }

    } catch (error) {
      result.errors.push('Unbekannter Fehler bei der Validierung')
      result.isValid = false
    }

    return result
  }

  /**
   * Generiert Hilfetext für Coupon-Kombinationen
   */
  static generateCombinationHelp(category: CouponCategory): string {
    const rules = {
      einkauf: "💡 Einkauf-Coupons: Nur 1 pro Einkauf, kombinierbar mit Warengruppe- und Artikel-Coupons",
      warengruppe: "💡 Warengruppe-Coupons: Mehrere möglich für verschiedene Warengruppen, kombinierbar mit allen anderen",
      artikel: "💡 Artikel-Coupons: Mehrere möglich für verschiedene Artikel, kombinierbar mit allen anderen"
    }

    return rules[category] || "💡 Kombinierbarkeit abhängig von Coupon-Typ"
  }

  /**
   * Schätzt maximale Anzahl kombinierbarer Coupons
   */
  static getMaxCombinableCoupons(coupons: Coupon[]): {
    maxEinkauf: number
    maxWarengruppe: number
    maxArtikel: number
  } {
    const warengruppen = new Set(
      coupons
        .filter(c => c.category === 'warengruppe')
        .map(c => c.warengruppe_id || c.title)
    )

    const artikel = new Set(
      coupons
        .filter(c => c.category === 'artikel')
        .map(c => c.artikel_id || c.title)
    )

    return {
      maxEinkauf: 1, // Immer nur 1
      maxWarengruppe: warengruppen.size,
      maxArtikel: artikel.size
    }
  }
}
