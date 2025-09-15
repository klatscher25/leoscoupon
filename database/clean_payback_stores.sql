-- BEREINIGUNG DER STORES: Duplikate entfernen und nur echte Payback-Partner behalten
-- Führe dieses SQL in deinem Supabase SQL Editor aus

-- 1. LÖSCHE ALLE BESTEHENDEN STORES (sauberer Neustart)
DELETE FROM stores;

-- 2. FÜGE NUR ECHTE PAYBACK-PARTNER HINZU (Stand 2024/2025)
INSERT INTO stores (name, chain_code, tags, is_active) VALUES
-- ✅ AKTUELLE PAYBACK Partner-Geschäfte (Stand 2024/2025)
('EDEKA', 'EDEKA', ARRAY['supermarkt', 'lebensmittel', 'payback'], true),
('Marktkauf', 'MARKTKAUF', ARRAY['supermarkt', 'lebensmittel', 'payback'], true),
('Netto Marken-Discount', 'NETTO', ARRAY['supermarkt', 'lebensmittel', 'payback'], true),
('trinkgut', 'TRINKGUT', ARRAY['getränke', 'lebensmittel', 'payback'], true),
('Alnatura', 'ALNATURA', ARRAY['bio', 'lebensmittel', 'payback'], true),
('Globus', 'GLOBUS', ARRAY['supermarkt', 'lebensmittel', 'payback'], true),

-- Drogerie & Gesundheit
('dm-drogerie markt', 'DM', ARRAY['drogerie', 'gesundheit', 'payback'], true),
('LINDA Apotheken', 'LINDA', ARRAY['apotheke', 'gesundheit', 'payback'], true),
('Apollo-Optik', 'APOLLO', ARRAY['optik', 'gesundheit', 'payback'], true),

-- Tankstellen
('Aral', 'ARAL', ARRAY['tankstelle', 'kraftstoff', 'payback'], true),

-- Mode & Bekleidung
('C&A', 'CA', ARRAY['mode', 'bekleidung', 'payback'], true),
('Galeria', 'GALERIA', ARRAY['kaufhaus', 'mode', 'payback'], true),

-- Elektronik & Technik
('MediaMarkt', 'MEDIAMARKT', ARRAY['elektronik', 'technik', 'payback'], true),

-- Sonstige
('Fressnapf', 'FRESSNAPF', ARRAY['tierbedarf', 'haustier', 'payback'], true),
('Thalia', 'THALIA', ARRAY['bücher', 'medien', 'payback'], true),
('Dehner', 'DEHNER', ARRAY['garten', 'pflanzen', 'payback'], true),
('TeeGschwendner', 'TEEGSCHWENDNER', ARRAY['tee', 'getränke', 'payback'], true),
('HOL AB!', 'HOLAB', ARRAY['getränke', 'lebensmittel', 'payback'], true);

-- 3. FÜGE IS_ACTIVE SPALTE HINZU FALLS NICHT VORHANDEN
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. STELLE SICHER DASS ALLE STORES AKTIV SIND
UPDATE stores SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- 5. ZEIGE BEREINIGTE LISTE
SELECT 
    name,
    chain_code,
    array_to_string(tags, ', ') as tags,
    is_active
FROM stores 
WHERE 'payback' = ANY(tags)
ORDER BY name;

SELECT '✅ STORES BEREINIGT! Nur noch echte Payback-Partner!' as status;
