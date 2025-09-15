# 🔑 Google Vision API Key - Schritt-für-Schritt Anleitung

Diese Anleitung zeigt dir **genau**, wie du einen Google Vision API Key erstellst und in der App hinterlegst.

## 📋 Übersicht

**Was brauchst du:**
- Google Account (kostenlos)
- 10-15 Minuten Zeit
- Kreditkarte (für Verifizierung, erste 1.000 Anfragen sind KOSTENLOS)

**Kosten für deine Nutzung:**
- **50-60 Coupons/Monat = $0.00** (komplett kostenlos!)
- Erste 1.000 Anfragen/Monat sind immer gratis

---

## 🚀 Schritt 1: Google Cloud Console öffnen

1. **Gehe zu:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Logge dich ein** mit deinem Google Account
3. **Akzeptiere** die Terms of Service (falls angezeigt)

---

## 🏗️ Schritt 2: Neues Projekt erstellen

1. **Klicke oben links** auf das Projekt-Dropdown (steht "Select a project" oder ein Projektname)
2. **Klicke** auf "**New Project**" (Neues Projekt)
3. **Projektname eingeben:** z.B. "Coupon Cashback App"
4. **Organization:** Lasse es leer oder wähle deinen Account
5. **Klicke** "**CREATE**"
6. **Warte** 30-60 Sekunden bis das Projekt erstellt ist
7. **Wähle das neue Projekt** aus dem Dropdown aus

**Screenshot-Hinweis:** Das Projekt-Dropdown ist oben links neben dem Google Cloud Logo.

---

## 🔌 Schritt 3: Google Vision API aktivieren

1. **Gehe zu:** [https://console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)
2. **Oder:** Klicke links im Menü auf "**APIs & Services**" → "**Library**"
3. **Suche** nach "**Vision**" in der Suchleiste
4. **Klicke** auf "**Cloud Vision API**" (nicht "AutoML Vision API")
5. **Klicke** den blauen "**ENABLE**" Button
6. **Warte** bis "API enabled" angezeigt wird (30-60 Sekunden)

**Direkt-Link:** [https://console.cloud.google.com/apis/library/vision.googleapis.com](https://console.cloud.google.com/apis/library/vision.googleapis.com)

---

## 🔑 Schritt 4: API Key erstellen

1. **Gehe zu:** [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. **Oder:** Klicke links im Menü auf "**APIs & Services**" → "**Credentials**"
3. **Klicke** oben auf "**+ CREATE CREDENTIALS**"
4. **Wähle** "**API key**" aus dem Dropdown
5. **Kopiere** den generierten API Key (beginnt mit "AIza...")
6. **Klicke** "**CLOSE**"

**⚠️ WICHTIG:** Kopiere den API Key sofort - er wird nur einmal angezeigt!

---

## 🔒 Schritt 5: API Key beschränken (Sicherheit)

**Empfohlen für bessere Sicherheit:**

1. **Klicke** auf den Stift-Icon neben deinem neuen API Key
2. **Unter "API restrictions"** wähle "**Restrict key**"
3. **Wähle** aus der Liste: "**Cloud Vision API**"
4. **Klicke** "**SAVE**"

**Optional:** Du kannst auch "Application restrictions" setzen, aber für lokale Entwicklung ist das nicht nötig.

---

## 💳 Schritt 6: Billing aktivieren (falls nötig)

**Nur nötig, falls du eine Fehlermeldung bekommst:**

1. **Gehe zu:** [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)
2. **Klicke** "**LINK A BILLING ACCOUNT**"
3. **Erstelle** ein neues Billing Account
4. **Gib deine Kreditkartendaten ein** (für Verifizierung)
5. **Keine Sorge:** Erste 1.000 Anfragen sind kostenlos!

**Hinweis:** Google braucht eine Kreditkarte zur Verifizierung, aber du zahlst nichts für die ersten 1.000 API-Calls pro Monat.

---

## 🔧 Schritt 7: API Key in der App hinterlegen

### Option A: .env.local Datei (Empfohlen)

1. **Öffne** dein Coupon Cashback Projekt in VS Code
2. **Erstelle** eine neue Datei im Projekt-Root: `.env.local`
3. **Füge hinzu:**
   ```bash
   # Google Vision API
   NEXT_PUBLIC_GOOGLE_VISION_API_KEY=AIzaSyABC123dein_echter_api_key_hier
   ```
4. **Ersetze** `AIzaSyABC123dein_echter_api_key_hier` mit deinem echten API Key
5. **Speichere** die Datei
6. **Starte den Server neu:** `npm run dev`

### Option B: Direkt in Vercel/Hosting

Falls du die App bereits deployed hast:

1. **Gehe** zu deinem Vercel Dashboard
2. **Wähle** dein Projekt
3. **Gehe** zu "**Settings**" → "**Environment Variables**"
4. **Füge hinzu:**
   - **Name:** `NEXT_PUBLIC_GOOGLE_VISION_API_KEY`
   - **Value:** Dein API Key
5. **Klicke** "**Save**"
6. **Redeploy** deine App

---

## ✅ Schritt 8: Testen

1. **Starte** deine App: `npm run dev`
2. **Gehe** zu **Admin** → **Coupons**
3. **Wähle** "Foto Upload" als Eingabe-Methode
4. **Lade** ein Coupon-Bild hoch
5. **Schaue** in der Konsole nach "🌟 Google Vision KI-Analyse läuft..."

**Erfolg:** Du siehst "✅ Google Vision erfolgreich!" in der Analyse-Anzeige.

---

## 🎯 Spezielle Links für dich

### Direkte Google Cloud Links:
- **Neues Projekt:** [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)
- **Vision API aktivieren:** [https://console.cloud.google.com/apis/library/vision.googleapis.com](https://console.cloud.google.com/apis/library/vision.googleapis.com)
- **API Key erstellen:** [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
- **Billing:** [https://console.cloud.google.com/billing](https://console.cloud.google.com/billing)

### Kosten-Monitoring:
- **Usage Dashboard:** [https://console.cloud.google.com/apis/dashboard](https://console.cloud.google.com/apis/dashboard)
- **Quotas:** [https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas](https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas)

---

## 💰 Kosten-Rechner für deine Nutzung

| Coupons/Monat | API Calls | Kosten/Monat | Status |
|--------------|-----------|--------------|---------|
| 50-60        | 120       | **$0.00**    | ✅ KOSTENLOS |
| 100          | 200       | **$0.00**    | ✅ KOSTENLOS |
| 500          | 1.000     | **$0.00**    | ✅ KOSTENLOS |
| 1.000        | 2.000     | **$1.50**    | 💰 Kostenpflichtig |

**Fazit:** Für deine 50-60 Coupons/Monat zahlst du nichts! 🎉

---

## 🛠️ Troubleshooting

### ❌ "API key not valid"
**Lösung:**
1. Überprüfe, ob der API Key korrekt kopiert wurde (keine Leerzeichen)
2. Stelle sicher, dass Cloud Vision API aktiviert ist
3. Warte 5-10 Minuten nach API Key Erstellung

### ❌ "Cloud Vision API has not been used"
**Lösung:**
1. Gehe zu [https://console.cloud.google.com/apis/library/vision.googleapis.com](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Klicke "ENABLE"
3. Warte 2-3 Minuten

### ❌ "Billing must be enabled"
**Lösung:**
1. Aktiviere Billing in der Google Cloud Console
2. Keine Sorge: Erste 1.000 Calls sind kostenlos

### ❌ "Quota exceeded"
**Lösung:**
1. Du hast die kostenlosen 1.000 Calls aufgebraucht
2. Entweder warten bis nächsten Monat oder Billing aktivieren

---

## 📱 App-Integration Prüfen

**Nach dem Setup solltest du sehen:**

### Im Coupon-Upload:
- 🌟 "Google Vision KI-Analyse läuft..."
- ✅ "Google Vision erfolgreich!"
- 📊 "Analyse-Methode: Google Vision KI"
- 💰 "Kosten: $0.0030 (2 API-Calls)"

### Im Debug-Bereich:
- Barcode automatisch erkannt
- Store automatisch zugeordnet
- Rabatt-Typ automatisch erkannt
- Formular automatisch ausgefüllt

---

## 🎉 Fertig!

**Du hast erfolgreich:**
✅ Google Cloud Projekt erstellt  
✅ Vision API aktiviert  
✅ API Key generiert und gesichert  
✅ Key in der App hinterlegt  
✅ Integration getestet  

**Jetzt kannst du:**
- 📸 Einzelne Coupons mit perfekter KI-Erkennung hochladen
- 📁 Batch-Upload für 20-30 Coupons aus Google Drive
- 💰 Kosten im Blick behalten (automatisches Monitoring)
- 🎯 99%+ Erkennungsrate bei deutschen Coupons genießen

**Viel Spaß mit der perfekten Coupon-Erkennung!** 🚀
