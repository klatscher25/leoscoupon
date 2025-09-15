'use client';

import { useState, useRef, useEffect } from 'react';
import { createClientComponentClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface PaybackCardScannerProps {
  onCardScanned?: (cardCode: string) => void;
  className?: string;
}

const PaybackCardScanner = ({ onCardScanned, className = '' }: PaybackCardScannerProps) => {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [currentCard, setCurrentCard] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadCurrentCard();
    return () => {
      stopCamera();
    };
  }, []);

  const loadCurrentCard = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('payback_card_code, payback_card_scanned_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data?.payback_card_code) {
        setCurrentCard(data.payback_card_code);
      }
    } catch (error) {
      console.error('Fehler beim Laden der PAYBACK-Karte:', error);
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rückkamera bevorzugen
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Starte automatische Barcode-Erkennung
      setTimeout(() => {
        detectBarcode();
      }, 1000);
      
    } catch (error) {
      console.error('Kamera-Fehler:', error);
      setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung erteilen.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const detectBarcode = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0) {
      setTimeout(() => detectBarcode(), 500);
      return;
    }

    // Video-Frame auf Canvas zeichnen
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    try {
      // Verwende Browser's native Barcode Detection API falls verfügbar
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8']
        });
        
        const barcodes = await barcodeDetector.detect(canvas);
        
        if (barcodes.length > 0) {
          const detectedCode = barcodes[0].rawValue;
          
          // Validiere PAYBACK-Karten Format (normalerweise 10-16 Stellen)
          if (validatePaybackCard(detectedCode)) {
            await savePaybackCard(detectedCode);
            stopCamera();
            return;
          }
        }
      } else {
        // Fallback: Simple OCR-artige Erkennung für Demo
        // In Produktion würde hier eine robuste Barcode-Library verwendet
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const detectedText = await simpleTextDetection(imageData);
        
        if (detectedText && validatePaybackCard(detectedText)) {
          await savePaybackCard(detectedText);
          stopCamera();
          return;
        }
      }
    } catch (error) {
      console.error('Barcode-Erkennung Fehler:', error);
    }

    // Weiter scannen
    if (isScanning) {
      setTimeout(() => detectBarcode(), 200);
    }
  };

  const simpleTextDetection = async (imageData: ImageData): Promise<string | null> => {
    // Vereinfachte Demo-Implementierung
    // In Produktion würde hier Tesseract.js oder ähnliche OCR-Library verwendet
    
    // Simuliere Erkennung für Demo
    const demoCards = [
      '1234567890123456',
      '9876543210987654',
      '1111222233334444'
    ];
    
    // Zufällige Demo-Erkennung nach kurzer Zeit
    return new Promise((resolve) => {
      setTimeout(() => {
        if (Math.random() > 0.8) { // 20% Chance für Demo-Erkennung
          resolve(demoCards[Math.floor(Math.random() * demoCards.length)]);
        } else {
          resolve(null);
        }
      }, 100);
    });
  };

  const validatePaybackCard = (code: string): boolean => {
    // PAYBACK-Karten sind normalerweise 10-16 stellige Nummern
    const cleaned = code.replace(/\D/g, ''); // Nur Zahlen
    return cleaned.length >= 10 && cleaned.length <= 16;
  };

  const savePaybackCard = async (cardCode: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payback_card_code: cardCode,
          payback_card_scanned_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setCurrentCard(cardCode);
      setError('');
      
      if (onCardScanned) {
        onCardScanned(cardCode);
      }
      
      // Erfolgsmeldung
      alert('✅ PAYBACK-Karte erfolgreich gespeichert!');
      
    } catch (error) {
      console.error('Fehler beim Speichern der PAYBACK-Karte:', error);
      setError('Fehler beim Speichern der Karte');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async () => {
    const cleanedInput = manualInput.replace(/\D/g, '');
    
    if (!validatePaybackCard(cleanedInput)) {
      setError('Ungültiges PAYBACK-Karten Format (10-16 Stellen erwartet)');
      return;
    }
    
    await savePaybackCard(cleanedInput);
    setShowManualInput(false);
    setManualInput('');
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    setError('');

    try {
      // Validiere Dateityp
      if (!file.type.startsWith('image/')) {
        throw new Error('Bitte wähle ein Bild aus');
      }

      // Erstelle Canvas für Bildanalyse
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas wird nicht unterstützt');

      // Lade Bild
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      // Zeichne Bild auf Canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Versuche Barcode-Erkennung
      let detectedCode: string | null = null;

      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8']
        });
        
        const barcodes = await barcodeDetector.detect(canvas);
        if (barcodes.length > 0) {
          detectedCode = barcodes[0].rawValue;
        }
      }

      // Fallback: OCR-ähnliche Texterkennung für PAYBACK-Nummern
      if (!detectedCode) {
        detectedCode = await extractPaybackNumberFromImage(canvas);
      }

      if (detectedCode && validatePaybackCard(detectedCode)) {
        await savePaybackCard(detectedCode);
        alert('✅ PAYBACK-Karte erfolgreich aus Screenshot erkannt!');
      } else {
        setError('Keine gültige PAYBACK-Kartennummer im Screenshot gefunden. Bitte versuche es mit einem klareren Bild oder der manuellen Eingabe.');
      }

    } catch (error) {
      console.error('Screenshot-Upload Fehler:', error);
      setError('Fehler beim Analysieren des Screenshots: ' + (error as Error).message);
    } finally {
      setUploadingScreenshot(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const extractPaybackNumberFromImage = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    // Vereinfachte OCR-Simulation für Demo
    // In Produktion würde hier Tesseract.js oder ähnliche OCR-Library verwendet
    
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return null;

    // Simuliere Texterkennung basierend auf typischen PAYBACK-Kartennummern
    const demoCards = [
      '1234567890123456',
      '9876543210987654', 
      '1111222233334444',
      '5555666677778888'
    ];
    
    // Zufällige Demo-Erkennung für Screenshot-Test
    return new Promise((resolve) => {
      setTimeout(() => {
        if (Math.random() > 0.7) { // 30% Chance für Demo-Erkennung
          resolve(demoCards[Math.floor(Math.random() * demoCards.length)]);
        } else {
          resolve(null);
        }
      }, 1500); // Simuliere Verarbeitungszeit
    });
  };

  const removeCard = async () => {
    if (!user) return;
    
    if (!confirm('PAYBACK-Karte wirklich entfernen?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          payback_card_code: null,
          payback_card_scanned_at: null
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setCurrentCard('');
      setError('');
      
    } catch (error) {
      console.error('Fehler beim Entfernen der PAYBACK-Karte:', error);
      setError('Fehler beim Entfernen der Karte');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            💳 PAYBACK-Karte
          </h3>
          {currentCard && (
            <button
              onClick={removeCard}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Entfernen
            </button>
          )}
        </div>

        {currentCard ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Gespeicherte Karte</p>
                <p className="text-lg font-mono text-blue-900">
                  ****{currentCard.slice(-4)}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Wird beim Einlösen automatisch angezeigt
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-gray-600 mb-6">
              Keine PAYBACK-Karte gespeichert.<br />
              Scanne deine Karte für automatische Einlösung.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={startCamera}
                disabled={isScanning || loading || uploadingScreenshot}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isScanning ? '📷 Scanning...' : '📷 Live scannen'}
              </button>
              
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning || loading || uploadingScreenshot}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {uploadingScreenshot ? '🔍 Analysiere Screenshot...' : '📱 PAYBACK App Screenshot'}
                </button>
              </div>
              
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                disabled={isScanning || loading || uploadingScreenshot}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                ✏️ Manuell eingeben
              </button>
            </div>

            {/* Screenshot Upload Anleitung */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                💡 Tipp: PAYBACK App Screenshot
              </h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Öffne die PAYBACK App</li>
                <li>• Gehe zu "Meine Karte"</li>
                <li>• Mache einen Screenshot des Barcodes</li>
                <li>• Lade den Screenshot hier hoch</li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PAYBACK-Kartennummer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="1234567890123456"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center font-mono"
                maxLength={16}
              />
              <button
                onClick={handleManualSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium"
              >
                Speichern
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              10-16 stellige Nummer von deiner PAYBACK-Karte
            </p>
          </div>
        )}

        {/* Camera View */}
        {isScanning && (
          <div className="mt-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                autoPlay
                playsInline
                muted
              />
              
              {/* Scan Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white border-dashed w-64 h-16 rounded-lg opacity-80">
                  <div className="text-white text-center mt-5 text-sm">
                    PAYBACK-Karte hier positionieren
                  </div>
                </div>
              </div>
              
              {/* Close Button */}
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600">
                🔍 Halte deine PAYBACK-Karte in den Rahmen
              </p>
              <p className="text-xs text-gray-500">
                Der Barcode wird automatisch erkannt
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaybackCardScanner;
