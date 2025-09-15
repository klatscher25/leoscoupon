'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface RedemptionSession {
  id: string;
  user_id: string;
  store_id: string;
  payback_card_code: string;
  selected_coupons: string[];
  session_status: string;
  total_value: number;
  created_at: string;
  store: {
    name: string;
    chain_code: string;
    logo_url?: string;
  };
}

interface CouponDisplay {
  id: string;
  title: string;
  description?: string;
  barcode_type: string;
  barcode_value: string;
  image_url?: string;
  value_amount?: number;
  value_type: string;
  category: string;
  category_name: string;
}

interface PointsBreakdown {
  einkaufMultiplier: number;
  warengruppenMultiplier: number;
  artikelMultiplier: number;
  categories: { name: string; multiplier: number; type: string }[];
}

interface CumulativeMultipliers {
  einkauf: number;
  warengruppen: { [key: string]: number };
  artikel: { [key: string]: number };
}

const CheckoutPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<RedemptionSession | null>(null);
  const [coupons, setCoupons] = useState<CouponDisplay[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = PAYBACK Card, 0+ = Coupons
  const [isCompleting, setIsCompleting] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeCurrentX, setSwipeCurrentX] = useState(0);
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdown | null>(null);
  const [cumulativeMultipliers, setCumulativeMultipliers] = useState<CumulativeMultipliers | null>(null);
  const [screenWakeLock, setScreenWakeLock] = useState<any>(null);
  const [barcodeType, setBarcodeType] = useState<'barcode' | 'qr'>('barcode');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Auto-brightness and screen wake lock
  useEffect(() => {
    const setupScreenOptimization = async () => {
      try {
        // Request screen wake lock to keep screen on
        if ('wakeLock' in navigator) {
          const wakeLock = await (navigator as any).wakeLock.request('screen');
          setScreenWakeLock(wakeLock);
        }
        
        // Try to increase brightness (limited browser support)
        if ('screen' in navigator && 'orientation' in (navigator as any).screen) {
          // Mobile devices might support this
          document.documentElement.style.filter = 'brightness(1.2)';
        }
      } catch (error) {
        console.log('Screen optimization not available:', error);
      }
    };

    setupScreenOptimization();

    // Cleanup on unmount
    return () => {
      if (screenWakeLock) {
        screenWakeLock.release();
      }
      document.documentElement.style.filter = '';
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (sessionId) {
      loadSession();
    }
  }, [user, authLoading, sessionId, router]);

  const loadSession = async () => {
    try {
      // Lade Session Details
      const { data: sessionData, error: sessionError } = await supabase
        .from('redemption_sessions')
        .select(`
          *,
          store:stores(name, chain_code, logo_url)
        `)
        .eq('id', sessionId)
        .eq('user_id', user?.id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) {
        router.push('/coupons/redeem');
        return;
      }

      setSession(sessionData);

      // Lade Coupon Details
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select(`
          id, title, description, barcode_type, barcode_value,
          image_url, value_amount, value_type, category,
          product_categories(name)
        `)
        .in('id', sessionData.selected_coupons);

      if (couponsError) throw couponsError;

      // Format coupons data
      const formattedCoupons: CouponDisplay[] = couponsData.map(coupon => ({
        ...coupon,
        category_name: (coupon as any).product_categories?.name || 'Allgemein'
      }));

      setCoupons(formattedCoupons);
      
      // Berechne Punkte-Breakdown
      calculatePointsBreakdown(formattedCoupons);
      calculateCumulativeMultipliers(formattedCoupons);
    } catch (error) {
      console.error('Fehler beim Laden der Session:', error);
      router.push('/coupons/redeem');
    } finally {
      setLoading(false);
    }
  };

  const calculatePointsBreakdown = (couponList: CouponDisplay[]) => {
    let einkaufMultiplier = 1; // Basis 1x Punkte
    let warengruppenMultiplier = 1;
    let artikelMultiplier = 1;
    const categories: { name: string; multiplier: number; type: string }[] = [];

    couponList.forEach(coupon => {
      const couponValue = coupon.value_amount || 1;
      
      if (coupon.category === 'einkauf') {
        // Verwende den tatsächlichen Multiplikator-Wert aus dem Coupon
        einkaufMultiplier = Math.max(einkaufMultiplier, couponValue);
      } else if (coupon.category === 'warengruppe') {
        warengruppenMultiplier = Math.max(warengruppenMultiplier, couponValue);
        categories.push({ 
          name: coupon.category_name, 
          multiplier: couponValue, 
          type: 'warengruppe' 
        });
      } else if (coupon.category === 'artikel') {
        artikelMultiplier = Math.max(artikelMultiplier, couponValue);
        categories.push({ 
          name: coupon.category_name, 
          multiplier: couponValue, 
          type: 'artikel' 
        });
      }
    });
    
    setPointsBreakdown({
      einkaufMultiplier,
      warengruppenMultiplier,
      artikelMultiplier,
      categories
    });
  };

  const calculateCumulativeMultipliers = (couponList: CouponDisplay[]) => {
    let einkaufTotal = 1; // Basis 1x
    const warengruppen: { [key: string]: number } = {};
    const artikel: { [key: string]: number } = {};

    // Basis-Einkauf-Multiplikator von Einkauf-Coupons
    couponList.forEach(coupon => {
      if (coupon.category === 'einkauf') {
        einkaufTotal += (coupon.value_amount || 20) / 100; // z.B. 20% = 0.2x zusätzlich
      }
    });

    // Warengruppen kumulativ (Einkauf + Warengruppe)
    couponList.forEach(coupon => {
      if (coupon.category === 'warengruppe') {
        const warengruppeBonus = (coupon.value_amount || 20) / 100; // z.B. 20x = 20
        warengruppen[coupon.category_name] = einkaufTotal + warengruppeBonus;
      }
    });

    // Artikel kumulativ (Einkauf + Warengruppe + Artikel)
    couponList.forEach(coupon => {
      if (coupon.category === 'artikel') {
        const artikelBonus = (coupon.value_amount || 10) / 100; // z.B. 10x = 10
        // Finde passende Warengruppe für diesen Artikel
        const entsprechendeWarengruppe = Object.keys(warengruppen).find(name => 
          coupon.category_name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(coupon.category_name.toLowerCase())
        );
        
        const basisMultiplier = entsprechendeWarengruppe 
          ? warengruppen[entsprechendeWarengruppe] 
          : einkaufTotal;
          
        artikel[coupon.category_name] = basisMultiplier + artikelBonus;
      }
    });

    setCumulativeMultipliers({
      einkauf: einkaufTotal,
      warengruppen,
      artikel
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Verhindere Swiping über Barcode/QR-Code Bereich
    const target = e.target as HTMLElement;
    if (target.closest('.barcode-container')) {
      return;
    }
    
    setSwipeStartX(e.touches[0].clientX);
    setSwipeCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Verhindere Swiping über Barcode/QR-Code Bereich
    const target = e.target as HTMLElement;
    if (target.closest('.barcode-container')) {
      return;
    }
    
    setSwipeCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (swipeStartX === 0) return; // Kein gültiger Swipe-Start
    
    const deltaX = swipeCurrentX - swipeStartX;
    const threshold = 100;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }

    setSwipeStartX(0);
    setSwipeCurrentX(0);
  };

  const handleNext = () => {
    if (currentIndex < coupons.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > -1) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const completePurchase = async () => {
    if (!session || isCompleting) return;

    setIsCompleting(true);
    try {
      const redemptions = coupons.map((coupon, index) => ({
        coupon_id: coupon.id,
        user_id: user?.id,
        payback_account_id: session.payback_card_code,
        session_id: session.id,
        redemption_order: index + 1,
        location: session.store.name
      }));

      const { error: redemptionError } = await supabase
        .from('coupon_redemptions')
        .insert(redemptions);

      if (redemptionError) throw redemptionError;

      const { error: sessionError } = await supabase
        .from('redemption_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      alert('🎉 Coupons erfolgreich eingelöst!');
      router.push('/coupons');
    } catch (error) {
      console.error('Fehler beim Abschließen der Einlösung:', error);
      alert('❌ Fehler beim Einlösen der Coupons. Bitte versuche es erneut.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Generiere deterministisches Pattern basierend auf dem Coupon-Code
  const generateCodePattern = (code: string) => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const generateEnhancedBarcode = (value: string) => {
    if (barcodeType === 'qr') {
      return (
        <div className="bg-white rounded-xl p-6 mx-4 shadow-lg border-2 border-gray-100">
          <div className="text-center">
            <div className="font-mono text-xl font-bold mb-4 text-black tracking-wider">
              {value}
            </div>
            {/* QR Code basierend auf Coupon-Code */}
            <div className="flex justify-center mb-4">
              <div className="grid grid-cols-21 gap-0 w-48 h-48 bg-white border-2 border-gray-300 p-2">
                {Array.from({ length: 441 }, (_, i) => {
                  const row = Math.floor(i / 21);
                  const col = i % 21;
                  
                  // Generiere QR-Code Pattern basierend auf Coupon-Code
                  const codePattern = generateCodePattern(value);
                  
                  // Ecken-Marker (Position Detection Patterns) - 7x7 Quadrate
                  const isTopLeftCorner = row < 7 && col < 7;
                  const isTopRightCorner = row < 7 && col > 13;
                  const isBottomLeftCorner = row > 13 && col < 7;
                  
                  // Ecken-Marker Pattern
                  const isCornerMarker = 
                    (isTopLeftCorner && (row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4))) ||
                    (isTopRightCorner && (row === 0 || row === 6 || col === 14 || col === 20 || (row >= 2 && row <= 4 && col >= 16 && col <= 18))) ||
                    (isBottomLeftCorner && (row === 14 || row === 20 || col === 0 || col === 6 || (row >= 16 && row <= 18 && col >= 2 && col <= 4)));
                  
                  // Timing Pattern
                  const isTimingPattern = 
                    (row === 6 && col >= 8 && col <= 12 && col % 2 === 0) ||
                    (col === 6 && row >= 8 && row <= 12 && row % 2 === 0);
                  
                  // Daten-Pattern basierend auf Coupon-Code
                  const dataPattern = (codePattern + row * 21 + col) % 3 === 0;
                  
                  const shouldBeBlack = 
                    isCornerMarker ||
                    isTimingPattern ||
                    (dataPattern && !isTopLeftCorner && !isTopRightCorner && !isBottomLeftCorner && row !== 6 && col !== 6);
                  
                  return (
                    <div
                      key={i}
                      className={`w-full h-full ${
                        shouldBeBlack ? 'bg-black' : 'bg-white'
                      }`}
                      style={{ aspectRatio: '1' }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              QR-Code zum Scannen bereithalten
            </div>
          </div>
        </div>
      );
    }

    // Standard Barcode basierend auf Coupon-Code
    return (
      <div className="bg-white rounded-xl p-6 mx-4 shadow-lg border-2 border-gray-100">
        <div className="text-center">
          <div className="font-mono text-xl font-bold mb-4 text-black tracking-wider">
            {value}
          </div>
          <div className="flex justify-center space-x-px mb-4">
            {/* EAN13-ähnliches Barcode Pattern basierend auf Coupon-Code */}
            {Array.from({ length: 40 }, (_, i) => {
              const codePattern = generateCodePattern(value);
              const charCode = value.charCodeAt(i % value.length) || 48; // Default to '0' if no char
              const width = ((codePattern + charCode + i) % 4) === 0 ? 'w-1' : 
                           ((codePattern + charCode + i) % 4) === 1 ? 'w-0.5' : 'w-px';
              
              return (
                <div
                  key={i}
                  className={`bg-black ${width} h-20`}
                />
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Barcode zum Scannen bereithalten
          </div>
        </div>
      </div>
    );
  };

  const getStoreLogoUrl = (chainCode: string) => {
    const storeLogos: { [key: string]: string } = {
      'REWE': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/REWE_Group_Logo.svg/1200px-REWE_Group_Logo.svg.png',
      'DM': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Dm-drogerie_markt_Logo.svg/1200px-Dm-drogerie_markt_Logo.svg.png',
      'ROSSMANN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Rossmann_Logo.svg/1200px-Rossmann_Logo.svg.png',
      'SHELL': 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Shell_logo.svg/1200px-Shell_logo.svg.png',
      'ARAL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aral_logo.svg/1200px-Aral_logo.svg.png',
      'REAL': 'https://logos-world.net/wp-content/uploads/2021/02/Real-Logo.png',
      'PENNY': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Penny_Markt_logo.svg/1200px-Penny_Markt_logo.svg.png'
    };
    return storeLogos[chainCode.toUpperCase()] || null;
  };

  const renderPaybackCard = () => (
    <div className="flex flex-col h-full">
      {/* Payback Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-white text-2xl font-bold mr-3">PAYBACK</div>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">P</span>
            </div>
          </div>
          <div className="text-white text-sm opacity-90">
            Meine Karte
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 bg-white px-6 py-8 rounded-b-3xl shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">PAYBACK Karte</h2>
          <p className="text-gray-600">Zuerst scannen lassen</p>
        </div>
        
        {/* Enhanced Barcode */}
        <div className="barcode-container">
          {generateEnhancedBarcode(session?.payback_card_code || '')}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Kartennummer</p>
          <p className="text-lg font-mono text-gray-800">****{session?.payback_card_code?.slice(-4)}</p>
        </div>

        {/* Points Multiplier Overview */}
        {pointsBreakdown && (
          <div className="mt-6 bg-blue-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-3 text-center">🎯 Aktive Punktemultiplikatoren</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">🛒 Gesamter Einkauf:</span>
                <span className="font-bold text-blue-600">{pointsBreakdown.einkaufMultiplier}x Punkte</span>
              </div>
              {pointsBreakdown.warengruppenMultiplier > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">📦 Warengruppen:</span>
                  <span className="font-bold text-green-600">{pointsBreakdown.warengruppenMultiplier}x Punkte</span>
                </div>
              )}
              {pointsBreakdown.artikelMultiplier > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">🏷️ Einzelartikel:</span>
                  <span className="font-bold text-green-600">{pointsBreakdown.artikelMultiplier}x Punkte</span>
                </div>
              )}
              {pointsBreakdown.categories.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-500 mb-1">Spezielle Kategorien:</p>
                  {pointsBreakdown.categories.map((cat, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600">{cat.name}:</span>
                      <span className="font-medium text-green-600">{cat.multiplier}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCoupon = (coupon: CouponDisplay, index: number) => (
    <div className="flex flex-col h-full">
      {/* Store Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-white text-2xl font-bold mr-3">PAYBACK</div>
            {session && getStoreLogoUrl(session.store.chain_code) && (
              <img 
                src={getStoreLogoUrl(session.store.chain_code)!} 
                alt={session.store.name}
                className="w-8 h-8 bg-white rounded p-1"
              />
            )}
          </div>
          <div className="text-white text-sm opacity-90">
            Coupon {index + 1}/{coupons.length}
          </div>
        </div>
      </div>

      {/* Coupon Content */}
      <div className="flex-1 bg-white px-6 py-8 rounded-b-3xl shadow-xl">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">{coupon.title}</h2>
          {coupon.description && (
            <p className="text-gray-600 text-sm">{coupon.description}</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              {coupon.category_name}
            </span>
            {coupon.value_amount && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                {coupon.value_type === 'points' ? `+${coupon.value_amount} Pkt.` :
                 coupon.value_type === 'percentage' ? `${coupon.value_amount}% Extra` :
                 `€${coupon.value_amount} Rabatt`}
              </span>
            )}
          </div>
        </div>
        
        {/* Enhanced Barcode */}
        <div className="barcode-container">
          {generateEnhancedBarcode(coupon.barcode_value)}
        </div>
        
        {/* Category Bonus Info */}
        {pointsBreakdown && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
            <h4 className="font-bold text-gray-800 mb-2 text-center">🎁 Aktive Multiplikatoren</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">🛒 Einkauf:</span>
                <span className="font-bold text-blue-600">{pointsBreakdown.einkaufMultiplier}x</span>
              </div>
              {pointsBreakdown.warengruppenMultiplier > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">📦 Warengruppen:</span>
                  <span className="font-bold text-green-600">{pointsBreakdown.warengruppenMultiplier}x</span>
                </div>
              )}
              {pointsBreakdown.artikelMultiplier > 1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">🏷️ Artikel:</span>
                  <span className="font-bold text-green-600">{pointsBreakdown.artikelMultiplier}x</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-50">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Session nicht gefunden</h1>
          <button 
            onClick={() => router.push('/coupons/redeem')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Zurück zur Auswahl
          </button>
        </div>
      </div>
    );
  }

  const totalSlides = coupons.length + 1;

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">PAYBACK</h3>
              <p className="text-xs text-gray-600">{session.store.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Barcode Type Switcher */}
            <div className="flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setBarcodeType('barcode')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  barcodeType === 'barcode' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Barcode
              </button>
              <button
                onClick={() => setBarcodeType('qr')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  barcodeType === 'qr' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                QR-Code
              </button>
            </div>
            
            <button
              onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
            >
              <span className="text-gray-600 text-lg">✕</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-20 left-0 right-0 z-40 px-6">
        <div className="flex justify-center items-center space-x-2 mb-2">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex + 1 
                  ? 'bg-blue-600 w-8' 
                  : 'bg-gray-300 w-2'
              }`}
            />
          ))}
        </div>
        <div className="text-center text-gray-600 text-sm">
          {currentIndex === -1 ? 'PAYBACK Karte' : `Coupon ${currentIndex + 1} von ${coupons.length}`}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-32 pb-32 px-4 h-full">
        {currentIndex === -1 && renderPaybackCard()}
        {currentIndex >= 0 && coupons[currentIndex] && renderCoupon(coupons[currentIndex], currentIndex)}
      </div>

      {/* Enhanced Navigation Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex <= -1}
            className={`flex items-center px-6 py-3 rounded-full font-medium transition-all ${
              currentIndex <= -1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            <span className="text-xl mr-2">←</span>
            <span className="hidden sm:inline">Zurück</span>
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              {currentIndex === -1 ? 'PAYBACK Karte' : `Coupon ${currentIndex + 1} von ${coupons.length}`}
            </p>
            {currentIndex === coupons.length - 1 && (
              <button
                onClick={completePurchase}
                disabled={isCompleting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-8 py-3 rounded-full text-white font-bold transition-colors shadow-lg"
              >
                {isCompleting ? '...' : '✓ Einlösung bestätigen'}
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= coupons.length - 1}
            className={`flex items-center px-6 py-3 rounded-full font-medium transition-all ${
              currentIndex >= coupons.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            <span className="hidden sm:inline">Weiter</span>
            <span className="text-xl ml-2">→</span>
          </button>
        </div>

        {/* Swipe Hint */}
        <div className="text-center text-gray-500 text-xs">
          💡 Wische nach links/rechts oder nutze die Pfeile zum Navigieren
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;