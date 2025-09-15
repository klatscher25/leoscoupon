# Leo's Coupon & Cashback App

Eine mobile-first PWA für Coupon-Management und Cashback-Tracking, speziell für die Familie optimiert.

## Features

### 🎫 Payback Coupon Management
- **Admin**: Upload von Coupons mit Barcode-Support (EAN, QR, Code128, etc.)
- **User**: Strukturierte Coupon-Übersicht mit intelligenter Filterung
- **Einlösung**: Pro-User/Payback-Account Tracking mit Kombinierbarkeits-Regeln
- **Planung**: Einkäufe optimal planen mit Coupon-Kombinationen

### 💰 Cashback Tracking
- **Admin**: Aktuelle Cashback-Aktionen verwalten und teilen
- **User**: Persönliches Tracking von Cashback-Einreichungen
- **Status-Flow**: Entwurf → Eingereicht → Genehmigt → Ausgezahlt
- **Banking**: IBAN-Verwaltung und Auszahlungs-Tracking

### 📱 Mobile-First Design
- **PWA**: Installierbar auf iPhone Home Screen
- **Responsive**: Optimiert für alle Bildschirmgrößen
- **Offline**: Funktioniert auch ohne Internet
- **Kamera**: Barcode-Scanner und Beleg-Upload

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Styling**: Tailwind CSS + Headless UI
- **Backend**: Supabase (Auth + Postgres + Storage)
- **PWA**: Service Worker + Manifest
- **Scanner**: ZXing Library für Barcode-Support

## Setup

1. **Repository klonen**
   ```bash
   git clone [repo-url]
   cd coupon-cashback-app
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Supabase Projekt erstellen**
   - Gehe zu [supabase.com](https://supabase.com)
   - Erstelle neues Projekt
   - Kopiere URL und Anon Key

4. **Environment Variables**
   ```bash
   cp env.example .env.local
   # Füge deine Supabase Credentials ein
   ```

5. **Datenbank Setup**
   ```bash
   # SQL Schema ausführen (siehe database/schema.sql)
   ```

6. **Development Server starten**
   ```bash
   npm run dev
   ```

## Datenbank Schema

### Entitäten
- `profiles`: User-Profile mit Rollen
- `stores`: Geschäfte/Läden
- `coupons`: Coupons mit Kombinierbarkeits-Regeln
- `coupon_redemptions`: Einlösungs-Tracking
- `cashback_campaigns`: Admin-Aktionen
- `cashback_submissions`: User-Einreichungen
- `payout_accounts`: Banking-Daten

### Row Level Security (RLS)
- Owner-basierte Zugriffskontrolle
- Admin-Rolle für Management-Funktionen
- Sichere Isolation zwischen Usern

## Deployment

Die App kann auf Vercel, Netlify oder ähnlichen Plattformen deployed werden.

```bash
npm run build
npm start
```

## Support

Für Fragen oder Support wende dich an den Administrator.
