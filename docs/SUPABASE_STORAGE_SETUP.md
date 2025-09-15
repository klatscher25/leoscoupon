# 🗄️ Supabase Storage Setup für Coupon-Fotos

## Erforderliche Storage Buckets

### 1. `coupons` Bucket erstellen

**In der Supabase Dashboard:**

1. **Gehe zu Storage** → Create new bucket
2. **Name:** `coupons`
3. **Public:** ✅ An (für Foto-Zugriff)
4. **File size limit:** 10MB
5. **Allowed file types:** `image/*`

### 2. Storage Policies einrichten

**Führe folgende SQL-Statements in der Supabase SQL Editor aus:**

```sql
-- Policy für Upload (nur Admins)
CREATE POLICY "Admins can upload coupon images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'coupons' AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy für Read (alle authentifizierten User)
CREATE POLICY "Authenticated users can view coupon images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'coupons' AND 
  auth.role() = 'authenticated'
);

-- Policy für Update/Delete (nur Admins)
CREATE POLICY "Admins can manage coupon images" ON storage.objects
FOR ALL USING (
  bucket_id = 'coupons' AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
```

### 3. Image URL Feld zur Coupons-Tabelle hinzufügen

```sql
-- Add image_url column to coupons table
ALTER TABLE coupons ADD COLUMN image_url TEXT;
```

## 📱 Features nach Setup

### ✅ Was funktioniert:

#### Foto Upload
- **iPhone Screenshots** hochladen
- **Papiercoupon-Fotos** von der Kamera
- **Drag & Drop** im Browser
- **Automatische Kompression** und Optimierung

#### Barcode Scanner
- **Live Kamera-Scanner** mit ZXing
- **EAN-13, UPC-A, Code128, QR** Support
- **Automatisches Formular-Ausfüllen**
- **Store-Erkennung** basierend auf Barcode-Mustern

#### Text-Extraktion (Mock)
- **Automatische Erkennung** von:
  - Rabattbeträgen ("5€", "10€")
  - Mindestbeträgen ("ab 50€")
  - Gültigkeitsdaten ("31.12.2024")
  - Titel und Beschreibung

### 🔧 Für Produktion erweitern:

#### OCR Integration
```javascript
// Beispiel: Google Vision API Integration
const extractTextFromImage = async (imageUrl) => {
  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: JSON.stringify({ imageUrl }),
    headers: { 'Content-Type': 'application/json' }
  })
  return response.json()
}
```

#### Erweiterte Barcode-Erkennung
```javascript
// Beispiel: ZXing WebAssembly für bessere Erkennung
import { BrowserQRCodeReader } from '@zxing/library'

const scanner = new BrowserQRCodeReader()
scanner.decodeFromConstraints({
  video: { facingMode: 'environment' }
}, videoElement, (result, error) => {
  if (result) {
    onBarcodeDetected(result.text, result.format)
  }
})
```

## 🚀 Admin Workflow

### 1. **Foto-Upload Workflow**
1. Admin wählt "📷 Foto Upload"
2. Lädt iPhone Screenshot oder Papiercoupon-Foto hoch
3. System analysiert automatisch:
   - Barcode (falls sichtbar)
   - Text-Inhalte (Titel, Rabatt, Datum)
4. Formular wird automatisch ausgefüllt
5. Admin korrigiert/ergänzt Details
6. Coupon wird gespeichert mit Foto-Referenz

### 2. **Scanner Workflow**
1. Admin wählt "📷 Barcode Scanner"
2. Startet Live-Kamera
3. Hält Coupon/Barcode in den Scan-Bereich
4. System erkennt Barcode automatisch
5. Formular wird mit Barcode-Daten ausgefüllt
6. Store wird basierend auf Barcode-Muster erkannt

### 3. **Hybrid Workflow**
1. Admin uploaded Foto UND scannt Barcode
2. System kombiniert beide Datenquellen
3. Maximale Automatisierung bei minimaler manueller Eingabe

## 📊 Storage-Statistiken

- **Durchschnittliche Foto-Größe:** 500KB - 2MB
- **Unterstützte Formate:** PNG, JPG, HEIC, WebP
- **Automatische Kompression:** Ja (Browser)
- **CDN-Auslieferung:** Via Supabase Storage

---

**Nach dem Setup ist die Admin Coupon-Verwaltung iPhone-optimiert und unterstützt alle realen Anwendungsfälle!** 📱✨
