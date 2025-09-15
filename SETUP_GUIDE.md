# 🚀 Setup Guide - Leo's Coupon & Cashback App

## ✅ Status Update (September 2024)

### 🔧 Behobene Probleme
- **✅ Login/Auth**: Singleton Supabase Client Pattern - Multiple GoTrueClient Warnings behoben
- **✅ Admin 404**: Vollständiger Admin-Bereich mit Dashboard verfügbar
- **✅ Database**: RLS Policies korrigiert, keine infinite recursion mehr

### 🏪 Implementierte Geschäfte

#### Payback Partner (19 Geschäfte)
- **Supermärkte**: REWE, PENNY, Netto Marken-Discount, toom Baumarkt
- **Drogerie**: dm-drogerie markt, DocMorris  
- **Tankstellen**: Aral, BP
- **Elektronik**: MediaMarkt, Saturn, Otto, eBay
- **Mode**: Galeria, C&A, ABOUT YOU
- **Services**: SIXT, ADAC, Burger King, Subway

#### Cashback Partner (12 zusätzliche)
- **Online**: Amazon, Zalando, Booking.com, Expedia, Nike, Apple, H&M, IKEA, Tchibo, Flixbus
- **Klassische**: Edeka, Lidl, Aldi, Rossmann

### 📋 Echte Payback Coupon-Regeln
- **Einkauf-Coupons**: Max 1 pro Transaktion (z.B. "5€ ab 50€")
- **Warengruppe-Coupons**: Mehrere für verschiedene Warengruppen
- **Artikel-Coupons**: Mehrere für verschiedene Artikel  
- **Validierung**: PaybackCouponValidator mit echter Kombinationslogik

---

## 📋 Vor dem Start

Die App ist **komplett fertig** entwickelt und wartet nur darauf, mit deiner Supabase-Datenbank verbunden zu werden!

## 🏗️ Schritt 1: Supabase Projekt erstellen

1. **Gehe zu [supabase.com](https://supabase.com)**
2. **Erstelle einen Account** (falls noch nicht vorhanden)
3. **Klicke "New Project"**
   - Organization: Wähle deine
   - Name: `Leo Coupon Cashback App`
   - Database Password: Wähle ein sicheres Passwort
   - Region: Europe (für bessere Performance in Deutschland)
4. **Warte ~30 Sekunden** bis das Projekt erstellt ist

## 🔑 Schritt 2: API-Keys kopieren

1. **In deinem Supabase Dashboard:**
   - Gehe zu **Settings** → **API**
   - Kopiere die **Project URL** 
   - Kopiere den **anon public** Key
   - Kopiere den **service_role** Key (für Admin-Funktionen)

## 📝 Schritt 3: Environment Variables setzen

1. **Öffne die Datei `.env.local`** in deinem Projekt
2. **Ersetze die Platzhalter:**

```bash
# Supabase - DEINE ECHTEN DATEN HIER EINFÜGEN
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key-hier
SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key-hier

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Schritt 4: Datenbank Schema installieren

1. **Gehe im Supabase Dashboard zu:**
   - **SQL Editor** (im linken Menü)
2. **Öffne die Datei `database/schema.sql`** aus dem Projekt
3. **Kopiere den kompletten Inhalt** und füge ihn in den SQL Editor ein
4. **Klicke "Run"** - Das erstellt alle Tabellen, Policies und Funktionen

## 📦 Schritt 5: Storage Buckets erstellen

1. **Gehe im Supabase Dashboard zu:**
   - **Storage** (im linken Menü)
2. **Erstelle 3 neue Buckets:**
   - `coupons` (für Coupon-Bilder)
   - `receipts` (für Kassenzettel)
   - `products` (für Produktfotos)
3. **Mache alle Buckets "Public"** (für einfachen Zugriff)

## 🎯 Schritt 6: App starten

```bash
# Development Server starten
npm run dev
```

Die App ist jetzt unter **http://localhost:3000** verfügbar!

## 👤 Schritt 7: Admin-Account erstellen

1. **Öffne http://localhost:3000** im Browser
2. **Klicke "Jetzt registrieren"**
3. **Erstelle deinen Account:**
   - E-Mail: deine E-Mail
   - Username: `leo` (oder beliebig)
   - Passwort: sicheres Passwort
4. **Nach der Registrierung:**
   - Gehe in Supabase Dashboard → **Authentication** → **Users**
   - Finde deinen User und klicke auf ihn
   - Gehe zu **Raw user meta data**
   - Ändere in der `profiles` Tabelle die `role` von `user` auf `admin`

## ✅ Schritt 8: App testen

### Als Admin (nach Role-Änderung):
- **Dashboard** → Siehst Admin-Funktionen
- **Admin** → **Coupons verwalten** → Erstelle Testcoupons
- **Admin** → **Cashback-Aktionen** → Erstelle Testkampagnen

### Als User:
- **Coupons** → Siehst alle verfügbaren Coupons
- **Coupon-Kombination** → Wähle mehrere aus und teste Regeln
- **Cashback** → Erstelle Testeinreichungen

### Testdaten erstellen:

**Beispiel Coupon:**
- Titel: "5€ Rabatt bei Edeka"
- Kategorie: Einkauf
- Store: Edeka
- Barcode: EAN-13
- Wert: 1234567890123
- Rabatt: 5€
- Gültig bis: In 1 Monat

**Beispiel Cashback-Aktion:**
- Titel: "Nutella Cashback"
- Marke: Ferrero
- Belohnung: 2€
- Gültig bis: In 2 Wochen

## 📱 iPhone/PWA Testing

1. **Öffne die App im iPhone Safari**
2. **Klicke Share → "Zum Home-Bildschirm"**
3. **App verhält sich wie native App!**

## 🎉 FERTIG!

Die App ist jetzt voll funktionsfähig mit:

### ✅ Implementierte Features:

**🎫 Coupon-System:**
- ✅ Admin kann alle Barcode-Typen hochladen
- ✅ Kombinierbarkeits-Regeln (Einkauf/Warengruppe/Artikel) funktionieren
- ✅ Pro-Payback-Account Limits werden enforced
- ✅ Intelligente Filter und Suche
- ✅ Mobile-optimiertes Design

**💰 Cashback-System:**
- ✅ Admin kann Aktionen verwalten
- ✅ User können Anträge einreichen
- ✅ Status-Flow: Entwurf → Eingereicht → Genehmigt → Ausgezahlt
- ✅ IBAN und Kontakt-Daten Tracking

**📱 Mobile PWA:**
- ✅ Installierbar auf iPhone
- ✅ Offline-fähig
- ✅ Native App-ähnliches Design
- ✅ Touch-optimiert

**🔐 Sicherheit:**
- ✅ Row Level Security aktiv
- ✅ Admin/User Rollen-System
- ✅ Sichere Authentifizierung

## 🆘 Support

Falls etwas nicht funktioniert:

1. **Prüfe die Browser-Konsole** (F12) nach Fehlern
2. **Prüfe Supabase-Logs** im Dashboard
3. **Prüfe Environment Variables** in `.env.local`
4. **Restart Dev Server:** Ctrl+C → `npm run dev`

Die App ist produktionsreif und kann sofort verwendet werden!
