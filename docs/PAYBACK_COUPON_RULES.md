# Payback Coupon Kombinationsregeln

## Übersicht
Basierend auf der Recherche von echten Payback-Regeln (Stand 2024)

## Coupon-Kategorien

### 1. Einkauf-Coupons (`einkauf`)
- **Beschreibung**: Rabatt auf den gesamten Einkauf
- **Beispiel**: "5€ ab 50€ Einkaufswert"
- **Limit**: Maximal **1 Coupon pro Einkauf**
- **Kombinierbar mit**: Warengruppe-Coupons, Artikel-Coupons

### 2. Warengruppe-Coupons (`warengruppe`)
- **Beschreibung**: Rabatt auf bestimmte Produktkategorien
- **Beispiel**: "20% auf Drogerie-Artikel", "3€ auf Tiefkühlkost"
- **Limit**: **Mehrere Coupons möglich** (verschiedene Warengruppen)
- **Kombinierbar mit**: Einkauf-Coupons, Artikel-Coupons (anderer Warengruppe)

### 3. Artikel-Coupons (`artikel`)
- **Beschreibung**: Rabatt auf spezifische Produkte/Marken
- **Beispiel**: "1€ auf Coca-Cola 1.5L", "50ct auf Nutella"
- **Limit**: **Mehrere Coupons möglich** (verschiedene Artikel)
- **Kombinierbar mit**: Einkauf-Coupons, Warengruppe-Coupons, andere Artikel-Coupons

## Kombinationsregeln

| Coupon Typ 1 | Coupon Typ 2 | Kombinierbar? | Regel |
|--------------|--------------|---------------|-------|
| Einkauf | Einkauf | ❌ | Nur 1 Einkauf-Coupon pro Transaktion |
| Einkauf | Warengruppe | ✅ | Unbegrenzt kombinierbar |
| Einkauf | Artikel | ✅ | Unbegrenzt kombinierbar |
| Warengruppe | Warengruppe | ✅ | Nur verschiedene Warengruppen |
| Warengruppe | Artikel | ✅ | Nur wenn Artikel nicht in derselben Warengruppe |
| Artikel | Artikel | ✅ | Nur verschiedene Artikel |

## Einlösungsregeln

### Pro Payback-Account
- Jeder Coupon kann nur **1x pro Payback-Account** eingelöst werden
- Bei mehreren App-Nutzern mit demselben Payback-Account → geteiltes Limit

### Pro Einkauf
- Einkauf-Coupons: Max. 1 pro Transaktion
- Warengruppe-Coupons: Unbegrenzt, aber nur verschiedene Warengruppen
- Artikel-Coupons: Unbegrenzt, aber nur verschiedene Artikel

## Implementierung in der App

### Datenbank-Felder
```sql
-- Coupons Tabelle
category: coupon_category (einkauf, warengruppe, artikel)
is_combinable: boolean
combinable_with_categories: coupon_category[]
per_payback_limit: integer (meist 1)
warengruppe_id: text (für Warengruppe-Coupons)
artikel_id: text (für Artikel-Coupons)
```

### Validierungslogik
1. **Einkauf-Coupon Check**: Max. 1 pro Warenkorb
2. **Warengruppe Check**: Keine doppelten Warengruppen
3. **Artikel Check**: Keine doppelten Artikel
4. **Payback-Account Check**: Einlösung-Historie prüfen
5. **Kombinierbarkeits-Matrix**: Regelkonforme Kombinationen

## Beispiel-Szenarien

### ✅ Erlaubte Kombinationen
```
Warenkorb A:
- 1x Einkauf-Coupon: "5€ ab 50€"
- 1x Warengruppe-Coupon: "20% auf Drogerie"
- 1x Artikel-Coupon: "1€ auf Coca-Cola"
- 1x Artikel-Coupon: "50ct auf Nutella"
```

### ❌ Nicht erlaubte Kombinationen
```
Warenkorb B:
- 2x Einkauf-Coupon: "5€ ab 50€" + "10€ ab 80€" ❌
- 2x Warengruppe-Coupon: "20% auf Drogerie" + "15% auf Drogerie" ❌  
- 2x Artikel-Coupon: "1€ auf Coca-Cola" + "50ct auf Coca-Cola" ❌
```

## Geschäftsspezifische Regeln

### REWE/PENNY
- Alle Standard-Payback-Regeln
- Zusätzlich: Eigenmarken-Coupons oft kombinierbar

### dm-drogerie markt
- Alle Standard-Payback-Regeln
- Besonderheit: Beauty-Punkte-Coupons (separate Kategorie)

### Aral/BP
- Kraftstoff-Coupons meist "Einkauf"-Kategorie
- Shop-Artikel-Coupons als "Artikel"-Kategorie
