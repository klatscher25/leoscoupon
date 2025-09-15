-- DEMO COUPONS FÜR EDEKA
-- Führe dieses SQL in deinem Supabase SQL Editor aus

-- 1. HOLE EDEKA STORE ID UND CATEGORY IDs
DO $$ 
DECLARE
    edeka_store_id UUID;
    einkauf_category_id UUID;
    getraenke_category_id UUID;
    drogerie_category_id UUID;
BEGIN
    -- Hole EDEKA Store ID
    SELECT id INTO edeka_store_id FROM stores WHERE name = 'EDEKA' LIMIT 1;
    
    IF edeka_store_id IS NULL THEN
        RAISE EXCEPTION 'EDEKA Store nicht gefunden! Führe zuerst clean_payback_stores.sql aus.';
    END IF;
    
    -- Hole Category IDs
    SELECT id INTO einkauf_category_id FROM product_categories WHERE code = 'einkauf' LIMIT 1;
    SELECT id INTO getraenke_category_id FROM product_categories WHERE code = 'getraenke' LIMIT 1;
    SELECT id INTO drogerie_category_id FROM product_categories WHERE code = 'drogerie' LIMIT 1;
    
    -- Lösche alle existierenden Coupons erstmal
    DELETE FROM coupons;
    
    -- 🛒 EINKAUFS-COUPONS (Gesamter Einkauf)
    INSERT INTO coupons (
        title, description, category, valid_until, store_id, product_category_id, 
        barcode_value, barcode_type, is_active, is_combinable, 
        value_amount, value_type, priority
    ) VALUES 
    -- Einkauf 20-fach Punkte
    ('20-fach PAYBACK Punkte', 
     'Sammle 20-fach PAYBACK Punkte auf deinen gesamten Einkauf bei EDEKA. Gültig auf alle Artikel.', 
     'einkauf', CURRENT_DATE + INTERVAL '30 days', edeka_store_id, einkauf_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 20, 'multiplier', 10),
     
    -- Einkauf 15-fach Punkte 
    ('15-fach PAYBACK Punkte', 
     'Sammle 15-fach PAYBACK Punkte auf deinen gesamten Einkauf. Ideal für größere Einkäufe.', 
     'einkauf', CURRENT_DATE + INTERVAL '25 days', edeka_store_id, einkauf_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 15, 'multiplier', 9),
     
    -- Einkauf 10-fach Punkte
    ('10-fach PAYBACK Punkte', 
     'Sammle 10-fach PAYBACK Punkte auf deinen gesamten Einkauf bei EDEKA.', 
     'einkauf', CURRENT_DATE + INTERVAL '20 days', edeka_store_id, einkauf_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 10, 'multiplier', 8);
    
    -- 📦 WARENGRUPPEN-COUPONS
    INSERT INTO coupons (
        title, description, category, valid_until, store_id, product_category_id, 
        barcode_value, barcode_type, is_active, is_combinable, 
        value_amount, value_type, priority
    ) VALUES 
    -- Getränke 20-fach
    ('20-fach Punkte auf Getränke', 
     'Sammle 20-fach PAYBACK Punkte auf alle Getränke: Säfte, Limonaden, Wasser, Energy Drinks und mehr.', 
     'warengruppe', CURRENT_DATE + INTERVAL '35 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 20, 'multiplier', 7),
     
    -- Getränke 15-fach
    ('15-fach Punkte auf Getränke', 
     'Sammle 15-fach PAYBACK Punkte auf alle alkoholfreien Getränke bei EDEKA.', 
     'warengruppe', CURRENT_DATE + INTERVAL '28 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 15, 'multiplier', 6),
     
    -- Drogerie 25-fach
    ('25-fach Punkte auf Drogerie', 
     'Sammle 25-fach PAYBACK Punkte auf alle Drogerie-Artikel: Körperpflege, Kosmetik, Haushalt.', 
     'warengruppe', CURRENT_DATE + INTERVAL '40 days', edeka_store_id, drogerie_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 25, 'multiplier', 8);
    
    -- 🏷️ ARTIKEL-COUPONS (Spezielle Marken)
    INSERT INTO coupons (
        title, description, category, valid_until, store_id, product_category_id, 
        barcode_value, barcode_type, is_active, is_combinable, 
        value_amount, value_type, priority
    ) VALUES 
    -- Coca-Cola 30-fach
    ('30-fach Punkte auf Coca-Cola', 
     'Sammle 30-fach PAYBACK Punkte auf alle Coca-Cola Produkte: Cola, Fanta, Sprite, etc.', 
     'artikel', CURRENT_DATE + INTERVAL '15 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 30, 'multiplier', 9),
     
    -- Red Bull 25-fach
    ('25-fach Punkte auf Red Bull', 
     'Sammle 25-fach PAYBACK Punkte auf alle Red Bull Energy Drinks.', 
     'artikel', CURRENT_DATE + INTERVAL '18 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 25, 'multiplier', 8),
     
    -- Nivea 35-fach
    ('35-fach Punkte auf Nivea', 
     'Sammle 35-fach PAYBACK Punkte auf alle Nivea Körperpflege-Produkte.', 
     'artikel', CURRENT_DATE + INTERVAL '22 days', edeka_store_id, drogerie_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 35, 'multiplier', 10),
     
    -- Melitta Kaffee 20-fach
    ('20-fach Punkte auf Melitta Kaffee', 
     'Sammle 20-fach PAYBACK Punkte auf alle Melitta Kaffee-Produkte.', 
     'artikel', CURRENT_DATE + INTERVAL '30 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 20, 'multiplier', 7),
     
    -- Haribo 15-fach
    ('15-fach Punkte auf Haribo', 
     'Sammle 15-fach PAYBACK Punkte auf alle Haribo Süßwaren.', 
     'artikel', CURRENT_DATE + INTERVAL '25 days', edeka_store_id, getraenke_category_id,
     '2024' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0'), 'ean13',
     true, true, 15, 'multiplier', 6);
     
    RAISE NOTICE '✅ DEMO COUPONS ERSTELLT!';
    RAISE NOTICE '🛒 3 Einkaufs-Coupons (10x, 15x, 20x)';
    RAISE NOTICE '📦 3 Warengruppen-Coupons (15x Getränke, 20x Getränke, 25x Drogerie)';
    RAISE NOTICE '🏷️ 5 Artikel-Coupons (Coca-Cola 30x, Red Bull 25x, Nivea 35x, Melitta 20x, Haribo 15x)';
    RAISE NOTICE '📊 Insgesamt: 11 Demo-Coupons für EDEKA';
END;
$$;

-- 2. ZEIGE ÜBERSICHT DER ERSTELLTEN COUPONS
SELECT 
    c.title,
    c.category,
    COALESCE(c.value_amount::text || 'x ' || c.value_type, 'Kein Wert') as wert,
    pc.name as kategorie,
    c.valid_until::date as gueltig_bis,
    c.is_combinable as kombinierbar,
    s.name as laden
FROM coupons c
LEFT JOIN product_categories pc ON c.product_category_id = pc.id
LEFT JOIN stores s ON c.store_id = s.id
ORDER BY c.category, c.value_amount DESC;

SELECT '🎉 DEMO COUPONS ERFOLGREICH ERSTELLT!' as status;
