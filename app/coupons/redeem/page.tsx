'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Store {
  id: string;
  name: string;
  chain_code: string;
  logo_url?: string;
  tags: string[];
}

interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface Coupon {
  id: string;
  title: string;
  description?: string;
  category: 'einkauf' | 'warengruppe' | 'artikel';
  value_amount?: number;
  value_type: string;
  valid_until: string;
  category_name: string;
  can_combine: boolean;
  barcode_value: string;
  barcode_type: string;
  image_url?: string;
  product_category_id?: string;
}

interface CouponsByCategory {
  einkauf: Coupon[];
  warengruppe: Coupon[];
  artikel: Coupon[];
}

const CouponRedeemPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [coupons, setCoupons] = useState<CouponsByCategory>({
    einkauf: [],
    warengruppe: [],
    artikel: []
  });
  const [selectedCoupons, setSelectedCoupons] = useState<string[]>([]);
  const [paybackCard, setPaybackCard] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'store' | 'coupons'>('store');

  const supabase = createClientComponentClient();

  useEffect(() => {
    if (authLoading) {
      // Warten bis Auth Status geklärt ist
      return;
    }
    
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // User ist authentifiziert, lade Daten
    loadStores();
    loadUserPaybackCard();
  }, [user, authLoading, router]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Geschäfte:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPaybackCard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('payback_card_code')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data?.payback_card_code) {
        setPaybackCard(data.payback_card_code);
      }
    } catch (error) {
      console.error('Fehler beim Laden der PAYBACK-Karte:', error);
    }
  };

  const requiresPaybackCard = () => {
    return !paybackCard || paybackCard.trim() === '';
  };

  const loadCouponsForStore = async (storeId: string) => {
    try {
      setLoading(true);
      
      // Lade alle verfügbaren Coupons für den gewählten Store
      const { data, error } = await supabase
        .rpc('get_coupons_by_store_and_category', { 
          p_store_id: storeId 
        });

      if (error) throw error;

      // Gruppiere Coupons nach Kategorie
      const groupedCoupons: CouponsByCategory = {
        einkauf: [],
        warengruppe: [],
        artikel: []
      };

      data?.forEach((coupon: Coupon) => {
        groupedCoupons[coupon.category].push(coupon);
      });

      setCoupons(groupedCoupons);
      setStep('coupons');
    } catch (error) {
      console.error('Fehler beim Laden der Coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCouponCombination = async () => {
    if (selectedCoupons.length === 0) return;

    try {
      const { data, error } = await supabase
        .rpc('validate_coupon_combination', { 
          coupon_ids: selectedCoupons 
        });

      if (error) throw error;

      if (!data.valid) {
        setValidationErrors(data.conflicts || []);
        return false;
      }

      setValidationErrors([]);
      return true;
    } catch (error) {
      console.error('Fehler bei der Coupon-Validierung:', error);
      return false;
    }
  };

  const handleCouponToggle = (couponId: string) => {
    setSelectedCoupons(prev => {
      const newSelection = prev.includes(couponId)
        ? prev.filter(id => id !== couponId)
        : [...prev, couponId];
      
      // Validiere Kombination nach Änderung
      setTimeout(() => validateCouponCombination(), 100);
      
      return newSelection;
    });
  };

  const getTotalValue = () => {
    let total = 0;
    const allCoupons = [...coupons.einkauf, ...coupons.warengruppe, ...coupons.artikel];
    
    selectedCoupons.forEach(couponId => {
      const coupon = allCoupons.find(c => c.id === couponId);
      if (coupon?.value_amount) {
        total += coupon.value_amount;
      }
    });
    
    return total;
  };

  const proceedToCheckout = async () => {
    if (!selectedStore || selectedCoupons.length === 0) return;

    const isValid = await validateCouponCombination();
    if (!isValid) return;

    // Erstelle Redemption Session
    try {
      const { data: session, error } = await supabase
        .from('redemption_sessions')
        .insert({
          user_id: user?.id,
          store_id: selectedStore.id,
          payback_card_code: paybackCard,
          selected_coupons: selectedCoupons,
          total_value: getTotalValue()
        })
        .select()
        .single();

      if (error) throw error;

      // Navigiere zum Checkout mit Session ID
      router.push(`/coupons/checkout/${session.id}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Session:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'einkauf': return '🛒';
      case 'warengruppe': return '📦';
      case 'artikel': return '🏷️';
      default: return '💳';
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'einkauf': return 'Gesamter Einkauf';
      case 'warengruppe': return 'Warengruppen';
      case 'artikel': return 'Einzelne Artikel';
      default: return 'Sonstige';
    }
  };

  const renderCouponCard = (coupon: Coupon) => {
    const isSelected = selectedCoupons.includes(coupon.id);
    
    return (
      <div
        key={coupon.id}
        onClick={() => handleCouponToggle(coupon.id)}
        className={`
          p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {coupon.title}
            </h3>
            {coupon.description && (
              <p className="text-sm text-gray-600 mb-2">
                {coupon.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {coupon.category_name}
              </span>
              {coupon.value_amount && (
                <span className="font-medium text-green-600">
                  {coupon.value_type === 'points' ? `${coupon.value_amount} Pkt.` :
                   coupon.value_type === 'percentage' ? `${coupon.value_amount}%` :
                   `€${coupon.value_amount}`}
                </span>
              )}
              <span>
                Bis {new Date(coupon.valid_until).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center ml-4">
            {isSelected && (
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mb-2">
                ✓
              </div>
            )}
            {!coupon.can_combine && (
              <span className="text-xs text-orange-500 font-medium">
                Nicht kombinierbar
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Coupons einlösen
        </h1>
        <p className="text-gray-600">
          Wähle deinen Laden und die Coupons, die du einlösen möchtest
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center ${step === 'store' ? 'text-blue-600' : 'text-green-600'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            step === 'store' ? 'bg-blue-600' : 'bg-green-600'
          }`}>
            {step === 'store' ? '1' : '✓'}
          </div>
          <span className="ml-2 font-medium">Laden wählen</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-4"></div>
        <div className={`flex items-center ${step === 'coupons' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            step === 'coupons' ? 'bg-blue-600' : 'bg-gray-400'
          }`}>
            2
          </div>
          <span className="ml-2 font-medium">Coupons auswählen</span>
        </div>
      </div>

      {step === 'store' && (
        <>
          {/* PAYBACK Card Check */}
          {requiresPaybackCard() ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-amber-800">
                    💳 PAYBACK-Karte erforderlich
                  </h3>
                  <p className="mt-2 text-amber-700">
                    Um Coupons einzulösen, benötigst du eine hinterlegte PAYBACK-Karte. 
                    Diese wird beim Checkout automatisch angezeigt.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => router.push('/profile')}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      📱 PAYBACK-Karte jetzt hinterlegen
                    </button>
                    <button
                      onClick={() => router.push('/coupons')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Zurück zu Coupons
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💳</span>
                <div>
                  <h3 className="font-medium text-green-900">PAYBACK-Karte hinterlegt ✅</h3>
                  <p className="text-green-700">***{paybackCard.slice(-4)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Store Selection - Only show if PAYBACK card exists */}
          {!requiresPaybackCard() && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => {
                    setSelectedStore(store);
                    loadCouponsForStore(store.id);
                  }}
                  className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md cursor-pointer transition-all duration-200"
                >
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-2xl">🏪</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-600">{store.chain_code}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {store.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {store.tags.length > 3 && (
                    <span className="text-xs text-gray-400">+{store.tags.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </>
      )}

      {step === 'coupons' && selectedStore && (
        <>
          {/* Selected Store Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏪</span>
                <div>
                  <h3 className="font-medium text-gray-900">{selectedStore.name}</h3>
                  <p className="text-sm text-gray-600">Verfügbare Coupons</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStep('store');
                  setSelectedStore(null);
                  setSelectedCoupons([]);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Laden ändern
              </button>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-red-900 mb-2">⚠️ Kombinationsfehler:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Coupon Categories */}
          {(['einkauf', 'warengruppe', 'artikel'] as const).map((category) => {
            const categoryCoupons = coupons[category];
            if (categoryCoupons.length === 0) return null;

            return (
              <div key={category} className="mb-8">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {getCategoryTitle(category)}
                  </h2>
                  <span className="ml-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {categoryCoupons.length} verfügbar
                  </span>
                </div>
                <div className="space-y-3">
                  {categoryCoupons.map(renderCouponCard)}
                </div>
              </div>
            );
          })}

          {/* Checkout Section */}
          {selectedCoupons.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedCoupons.length} Coupon{selectedCoupons.length !== 1 ? 's' : ''} ausgewählt
                  </p>
                  <p className="font-semibold text-lg text-green-600">
                    Gesamt: {getTotalValue()} Punkte
                  </p>
                </div>
                <button
                  onClick={proceedToCheckout}
                  disabled={validationErrors.length > 0}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    validationErrors.length > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Zur Kasse 🛒
                </button>
              </div>
            </div>
          )}

          {/* Spacer for fixed bottom bar */}
          {selectedCoupons.length > 0 && <div className="h-24"></div>}
        </>
      )}
    </div>
  );
};

export default CouponRedeemPage;
