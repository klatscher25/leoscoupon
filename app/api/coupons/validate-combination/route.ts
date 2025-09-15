import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

interface CouponValidationRule {
  id: string;
  category: 'einkauf' | 'warengruppe' | 'artikel';
  product_category_id?: string;
  artikel_id?: string;
  is_combinable: boolean;
  combination_rules?: {
    max_per_transaction?: number;
    incompatible_categories?: string[];
    partner_specific_rules?: string;
  };
  store_id: string;
  title: string;
}

interface ValidationResult {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
  recommendations?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { coupon_ids, store_id } = await request.json();

    if (!coupon_ids || !Array.isArray(coupon_ids) || coupon_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Coupon IDs sind erforderlich' 
      }, { status: 400 });
    }

    const supabase = createServerComponentClient();

    // Lade alle Coupon-Details
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select(`
        id, category, product_category_id, artikel_id, is_combinable,
        combination_rules, store_id, title,
        product_categories(name, code)
      `)
      .in('id', coupon_ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!coupons || coupons.length !== coupon_ids.length) {
      return NextResponse.json({ 
        error: 'Einige Coupons wurden nicht gefunden' 
      }, { status: 404 });
    }

    // Validiere Kombination
    const result = validateCouponCombination(coupons as any[], store_id);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Fehler bei Coupon-Validierung:', error);
    return NextResponse.json({ 
      error: 'Interner Server-Fehler' 
    }, { status: 500 });
  }
}

function validateCouponCombination(
  coupons: CouponValidationRule[], 
  storeId?: string
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    conflicts: [],
    warnings: [],
    recommendations: []
  };

  // 1. Basis-Validierungen
  
  // Prüfe: Alle Coupons müssen kombinierbar sein
  const nonCombinableCoupons = coupons.filter(c => !c.is_combinable);
  if (nonCombinableCoupons.length > 0) {
    if (coupons.length > 1) {
      result.valid = false;
      result.conflicts.push(
        `Diese Coupons sind nicht kombinierbar: ${nonCombinableCoupons.map(c => c.title).join(', ')}`
      );
    }
  }

  // Prüfe: Alle Coupons müssen vom gleichen Store sein
  const differentStores = coupons.filter(c => storeId && c.store_id !== storeId);
  if (differentStores.length > 0) {
    result.valid = false;
    result.conflicts.push('Alle Coupons müssen vom gleichen Store sein');
  }

  // 2. PAYBACK-spezifische Kombinationsregeln

  // Regel 1: Nur ein "Einkauf"-Coupon erlaubt
  const einkaufCoupons = coupons.filter(c => c.category === 'einkauf');
  if (einkaufCoupons.length > 1) {
    result.valid = false;
    result.conflicts.push(
      'Nur ein Coupon für den "Gesamten Einkauf" kann gleichzeitig verwendet werden'
    );
  }

  // Regel 2: Nur ein Coupon pro Warengruppe
  const warengruppenCoupons = coupons.filter(c => c.category === 'warengruppe');
  const categoryGroups = new Map<string, CouponValidationRule[]>();
  
  warengruppenCoupons.forEach(coupon => {
    const categoryId = coupon.product_category_id || 'unknown';
    if (!categoryGroups.has(categoryId)) {
      categoryGroups.set(categoryId, []);
    }
    categoryGroups.get(categoryId)!.push(coupon);
  });

  categoryGroups.forEach((groupCoupons, categoryId) => {
    if (groupCoupons.length > 1) {
      const categoryName = (groupCoupons[0] as any).product_categories?.name || 'Unbekannte Warengruppe';
      result.valid = false;
      result.conflicts.push(
        `Nur ein Coupon pro Warengruppe erlaubt. Mehrere Coupons für "${categoryName}" gefunden`
      );
    }
  });

  // Regel 3: Nur ein Coupon pro Artikel
  const artikelCoupons = coupons.filter(c => c.category === 'artikel');
  const artikelGroups = new Map<string, CouponValidationRule[]>();
  
  artikelCoupons.forEach(coupon => {
    const artikelId = coupon.artikel_id || coupon.id; // Fallback auf Coupon-ID
    if (!artikelGroups.has(artikelId)) {
      artikelGroups.set(artikelId, []);
    }
    artikelGroups.get(artikelId)!.push(coupon);
  });

  artikelGroups.forEach((groupCoupons, artikelId) => {
    if (groupCoupons.length > 1) {
      result.valid = false;
      result.conflicts.push(
        `Nur ein Coupon pro Artikel erlaubt. Mehrere Coupons für denselben Artikel gefunden`
      );
    }
  });

  // 3. Partner-spezifische Regeln

  // Aral-spezifische Regeln
  const aralCoupons = coupons.filter(c => 
    c.store_id && isAralStore(c.store_id) // Helper-Funktion
  );
  
  if (aralCoupons.length > 0) {
    // Aral: Nur ein Kraftstoff-Coupon pro Tankung
    const kraftstoffCoupons = aralCoupons.filter(c => 
      c.title?.toLowerCase().includes('kraftstoff') ||
      c.title?.toLowerCase().includes('benzin') ||
      c.title?.toLowerCase().includes('diesel')
    );
    
    if (kraftstoffCoupons.length > 1) {
      result.valid = false;
      result.conflicts.push(
        'Aral: Nur ein Kraftstoff-Coupon pro Tankung erlaubt'
      );
    }

    // Aral: Shop und Kraftstoff sind kombinierbar
    const shopCoupons = aralCoupons.filter(c => 
      c.title?.toLowerCase().includes('shop') ||
      c.title?.toLowerCase().includes('snack')
    );
    
    if (kraftstoffCoupons.length === 1 && shopCoupons.length >= 1) {
      result.recommendations?.push(
        'Tipp: Kraftstoff- und Shop-Coupons können bei Aral kombiniert werden'
      );
    }
  }

  // dm-spezifische Regeln
  const dmCoupons = coupons.filter(c => 
    c.store_id && isDmStore(c.store_id)
  );

  if (dmCoupons.length > 0) {
    // dm: Nur ein "Gesamter Einkauf" Coupon
    const dmEinkaufCoupons = dmCoupons.filter(c => c.category === 'einkauf');
    if (dmEinkaufCoupons.length > 1) {
      result.valid = false;
      result.conflicts.push(
        'dm: Nur ein Coupon für den gesamten Einkauf erlaubt'
      );
    }

    // dm: Kategorien sind zusätzlich kombinierbar
    const dmKategorieCoupons = dmCoupons.filter(c => c.category === 'warengruppe');
    if (dmEinkaufCoupons.length === 1 && dmKategorieCoupons.length >= 1) {
      result.recommendations?.push(
        'Optimal: Bei dm können Gesamteinkaufs-Coupons mit Kategorie-Coupons kombiniert werden'
      );
    }
  }

  // 4. Erweiterte Kombinationsregeln aus den Coupon-Daten
  coupons.forEach(coupon => {
    const rules = coupon.combination_rules;
    if (!rules) return;

    // Max pro Transaktion
    if (rules.max_per_transaction && rules.max_per_transaction < coupons.length) {
      result.valid = false;
      result.conflicts.push(
        `"${coupon.title}" erlaubt maximal ${rules.max_per_transaction} Coupon(s) pro Transaktion`
      );
    }

    // Inkompatible Kategorien
    if (rules.incompatible_categories && rules.incompatible_categories.length > 0) {
      const conflictingCoupons = coupons.filter(c => 
        c.id !== coupon.id && 
        c.product_category_id &&
        rules.incompatible_categories!.includes(c.product_category_id)
      );
      
      if (conflictingCoupons.length > 0) {
        result.valid = false;
        result.conflicts.push(
          `"${coupon.title}" ist nicht kompatibel mit Coupons aus bestimmten Kategorien`
        );
      }
    }
  });

  // 5. Warnungen und Empfehlungen

  // Warnung: Viele Artikel-Coupons
  if (artikelCoupons.length >= 5) {
    result.warnings.push(
      'Viele Einzelartikel-Coupons ausgewählt. Prüfe, ob alle Artikel im Einkaufskorb sind.'
    );
  }

  // Empfehlung: Optimale Kombination
  if (einkaufCoupons.length === 1 && warengruppenCoupons.length >= 2) {
    result.recommendations?.push(
      'Exzellente Kombination: Ein Einkaufs-Coupon mit mehreren Warengruppen-Coupons maximiert die Punkte'
    );
  }

  // Warnung: Gültigkeitsdaten (falls verfügbar)
  // Dies würde eine zusätzliche Datenbankabfrage für valid_until erfordern

  return result;
}

// Helper-Funktionen für Store-Erkennung
function isAralStore(storeId: string): boolean {
  // In Produktion würde hier die Store-Datenbank abgefragt werden
  // Für Demo nehmen wir an, dass Store-Namen "ARAL" enthalten
  return true; // Placeholder
}

function isDmStore(storeId: string): boolean {
  // Ähnlich für dm-Stores
  return true; // Placeholder
}
