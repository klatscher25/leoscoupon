'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    
    if (user && sessionId) {
      loadSession();
    }
  }, [user, authLoading, sessionId]);

  useEffect(() => {
    // Enter fullscreen on component mount
    enterFullscreen();
    
    // Prevent scroll and zoom
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Cleanup on unmount
    return () => {
      exitFullscreen();
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const enterFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  };

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
    } catch (error) {
      console.error('Fehler beim Laden der Session:', error);
      router.push('/coupons/redeem');
    } finally {
      setLoading(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setSwipeCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    const deltaX = swipeCurrentX - swipeStartX;
    const threshold = 100; // Minimum swipe distance

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe right - previous
        handlePrevious();
      } else {
        // Swipe left - next
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
      // Erstelle Redemption Records für jeden Coupon
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

      // Markiere Session als completed
      const { error: sessionError } = await supabase
        .from('redemption_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      // Zeige Erfolgsmeldung und navigiere zurück
      alert('🎉 Coupons erfolgreich eingelöst!');
      router.push('/coupons');
    } catch (error) {
      console.error('Fehler beim Abschließen der Einlösung:', error);
      alert('❌ Fehler beim Einlösen der Coupons. Bitte versuche es erneut.');
    } finally {
      setIsCompleting(false);
    }
  };

  const generateBarcode = (type: string, value: string) => {
    // Für Demo-Zwecke zeigen wir Text + Striche
    // In Produktion würde hier eine echte Barcode-Library verwendet
    return (
      <div className="text-center">
        <div className="font-mono text-lg mb-2">{value}</div>
        <div className="flex justify-center space-x-1">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className={`bg-black ${Math.random() > 0.5 ? 'w-1' : 'w-0.5'} h-16`}
            />
          ))}
        </div>
        <div className="text-xs text-gray-600 mt-2">{type.toUpperCase()}</div>
      </div>
    );
  };

  const getCurrentDisplayName = () => {
    if (currentIndex === -1) return 'PAYBACK-Karte';
    return coupons[currentIndex]?.title || 'Coupon';
  };

  const renderPaybackCard = () => (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">💳</div>
        <h2 className="text-3xl font-bold mb-4">PAYBACK-Karte</h2>
        <p className="text-xl opacity-90">Zeige diese Karte zuerst vor</p>
      </div>
      
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">PAYBACK</div>
          {generateBarcode('CODE128', session?.payback_card_code || '')}
          <div className="mt-4 text-lg font-mono">
            {session?.payback_card_code}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm opacity-75">Karten-Nummer</p>
        <p className="text-lg">****{session?.payback_card_code?.slice(-4)}</p>
      </div>
    </div>
  );

  const renderCoupon = (coupon: CouponDisplay) => (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{coupon.title}</h2>
        {coupon.description && (
          <p className="text-lg opacity-90 max-w-md">{coupon.description}</p>
        )}
        <div className="mt-4 flex items-center justify-center gap-4">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
            {coupon.category_name}
          </span>
          {coupon.value_amount && (
            <span className="bg-green-500/30 px-3 py-1 rounded-full text-sm font-bold">
              {coupon.value_type === 'points' ? `${coupon.value_amount} Pkt.` :
               coupon.value_type === 'percentage' ? `${coupon.value_amount}%` :
               `€${coupon.value_amount}`}
            </span>
          )}
        </div>
      </div>
      
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full">
        <div className="text-center">
          {generateBarcode(coupon.barcode_type, coupon.barcode_value)}
        </div>
      </div>
      
      {coupon.image_url && (
        <div className="mt-6">
          <img 
            src={coupon.image_url} 
            alt={coupon.title}
            className="w-24 h-24 object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session nicht gefunden</h1>
          <button 
            onClick={() => router.push('/coupons/redeem')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
          >
            Zurück zur Auswahl
          </button>
        </div>
      </div>
    );
  }

  const totalSlides = coupons.length + 1; // +1 für PAYBACK-Karte

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🏪</span>
            <div>
              <h3 className="font-bold">{session.store.name}</h3>
              <p className="text-sm opacity-75">Checkout</p>
            </div>
          </div>
          <button
            onClick={() => {
              exitFullscreen();
              router.back();
            }}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-24 left-0 right-0 z-10 px-6">
        <div className="flex justify-center items-center space-x-2">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex + 1 
                  ? 'bg-white w-8' 
                  : 'bg-white/30 w-2'
              }`}
            />
          ))}
        </div>
        <div className="text-center mt-2 text-white/80 text-sm">
          {currentIndex + 2} von {totalSlides}
        </div>
      </div>

      {/* Current Display Title */}
      <div className="absolute top-40 left-0 right-0 z-10 text-center">
        <h1 className="text-white text-xl font-bold">
          {getCurrentDisplayName()}
        </h1>
      </div>

      {/* Main Content */}
      <div className="pt-48 pb-32 px-6 h-full">
        {currentIndex === -1 && renderPaybackCard()}
        {currentIndex >= 0 && coupons[currentIndex] && renderCoupon(coupons[currentIndex])}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 px-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex <= -1}
            className={`p-4 rounded-full transition-all ${
              currentIndex <= -1
                ? 'bg-white/10 text-white/30'
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
            }`}
          >
            <span className="text-xl">←</span>
          </button>

          <div className="text-center text-white">
            <p className="text-sm opacity-75">Swipe nach links für nächsten</p>
            {currentIndex === coupons.length - 1 && (
              <button
                onClick={completePurchase}
                disabled={isCompleting}
                className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-8 py-3 rounded-full text-white font-bold transition-colors"
              >
                {isCompleting ? '...' : '✓ Einlösung bestätigen'}
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= coupons.length - 1}
            className={`p-4 rounded-full transition-all ${
              currentIndex >= coupons.length - 1
                ? 'bg-white/10 text-white/30'
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
            }`}
          >
            <span className="text-xl">→</span>
          </button>
        </div>

        {/* Swipe Hint */}
        <div className="text-center mt-4 text-white/60 text-xs">
          👆 Tippe oder swipe um zu navigieren
        </div>
      </div>

      {/* Value Summary */}
      <div className="absolute bottom-32 right-6 bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
        <div className="text-center">
          <p className="opacity-75">Gesamt</p>
          <p className="font-bold">{session.total_value} Punkte</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
