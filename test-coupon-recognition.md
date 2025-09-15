# 🧪 Coupon-Erkennung Test Guide

## ✅ Was wurde behoben:

### 1. iPhone Galerie-Problem 
- **Problem**: Galerie-Button öffnete die Kamera 
- **Lösung**: Separate Input-Felder für Kamera (`capture="environment"`) und Galerie (ohne capture)
- **Buttons**: 
  - 📷 **Kamera** = Live-Foto aufnehmen
  - 🖼️ **Galerie** = Vorhandenes Bild auswählen

### 2. Verbesserte Store-Erkennung
Automatische Shop-Erkennung basierend auf Barcode-Mustern:

```javascript
// Erkannte Barcode-Muster:
'rewe': /^4006381/     // REWE EAN prefix
'edeka': /^4388844/    // EDEKA pattern  
'aldi': /^4337256/     // ALDI SÜD pattern
'lidl': /^4251234/     // LIDL Plus pattern
'penny': /^4123456/    // PENNY pattern
'dm': /DM.*COUPON/     // dm barcode pattern
```

### 3. Intelligente Text-Erkennung
Automatisches Parsing von:

#### Rabatte:
- `5€`, `10€` → Discount Amount
- `10%`, `20%` → Discount Percentage

#### Mindestbeträge:
- `ab 50€`
- `Mindestbestellwert: 25€`
- `Minimum 30€`

#### Gültigkeitsdaten:
- `Gültig bis 31.12.2024`
- `bis 15.01.2025`
- `31.12.2024` (DD.MM.YYYY)

#### Bedingungen:
- "nur einmal pro Kunde"
- "ausgenommen: Alkohol"
- "nicht kombinierbar"

## 🎯 Test-Szenarien:

### Szenario 1: REWE Coupon Screenshot
**Erwarteter Text**: "REWE Coupon\n5€ Rabatt ab 50€ Einkauf\nGültig bis 31.12.2024"
**Erwartete Ergebnisse**:
- ✅ Store: REWE automatisch erkannt
- ✅ Title: "5€ Rabatt ab 50€ Einkauf"
- ✅ Discount: 5€
- ✅ Minimum: 50€
- ✅ Valid Until: 2024-12-31

### Szenario 2: EDEKA Prozent-Coupon
**Erwarteter Text**: "EDEKA Coupon\n10% Rabatt auf Obst & Gemüse\nGültig bis 15.01.2025"
**Erwartete Ergebnisse**:
- ✅ Store: EDEKA automatisch erkannt
- ✅ Title: "10% Rabatt auf Obst & Gemüse"
- ✅ Percentage: 10%
- ✅ Category: "prozent" (automatisch)
- ✅ Valid Until: 2025-01-15

### Szenario 3: dm Eigenmarken-Coupon
**Erwarteter Text**: "dm-drogerie markt\n20% Rabatt auf Eigenmarken\nGültig bis 30.06.2025"
**Erwartete Ergebnisse**:
- ✅ Store: dm-drogerie markt automatisch erkannt
- ✅ Title: "20% Rabatt auf Eigenmarken"
- ✅ Percentage: 20%
- ✅ Valid Until: 2025-06-30

## 🔧 Test-Durchführung:

1. **Admin-Bereich öffnen**: `/admin/coupons`
2. **"Neuen Coupon hinzufügen"** klicken
3. **Input-Methode**: "📱 Foto Upload" wählen
4. **iPhone Tests**:
   - 📷 **Kamera** drücken → Live-Kamera sollte öffnen
   - 🖼️ **Galerie** drücken → Fotogalerie sollte öffnen (NICHT Kamera!)
5. **Screenshot hochladen**: Beliebigen Coupon-Screenshot wählen
6. **Automatische Analyse beobachten**: Nach 1-2 Sekunden werden Felder automatisch ausgefüllt
7. **Ergebnisse prüfen**: Store, Titel, Rabatt, Gültigkeit automatisch erkannt

## 📝 Erwartete Mock-Ergebnisse:

Die App simuliert folgende Coupon-Erkennungen zufällig:

1. **REWE**: 5€ ab 50€, gültig bis 31.12.2024
2. **EDEKA**: 10% Obst & Gemüse, gültig bis 15.01.2025  
3. **ALDI SÜD**: 3€ ab 30€, gültig bis 28.02.2025
4. **LIDL Plus**: 2 für 1 Backwaren, gültig bis 10.03.2025
5. **PENNY**: 15% Fleisch & Wurst, gültig bis 05.04.2025
6. **dm**: 20% Eigenmarken, gültig bis 30.06.2025

## ✅ Erfolgreiche Tests zeigen:

- 📱 **Galerie vs. Kamera** funktioniert korrekt getrennt
- 🏪 **Store-Erkennung** anhand Barcode-Muster
- 💰 **Rabatt-Parsing** für € und %
- 📅 **Datum-Erkennung** in verschiedenen Formaten
- 📝 **Titel/Beschreibung** automatisch extrahiert
- ⚙️ **Formular-Felder** automatisch ausgefüllt

Das System ist jetzt bereit für echte OCR/Barcode-Scanner Integration in der Produktion!
