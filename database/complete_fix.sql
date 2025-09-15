-- VOLLSTÄNDIGE DATENBANK-REPARATUR
-- Führe dieses SQL in deinem Supabase SQL Editor aus
-- Alle fehlenden Spalten, Tabellen und Funktionen werden hinzugefügt

-- ===========================
-- 1. FEHLENDE ENUMS ERSTELLEN
-- ===========================

DO $$ BEGIN
    CREATE TYPE coupon_value_type AS ENUM ('multiplier', 'euro_amount', 'percentage', 'buy_x_get_y', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===========================
-- 2. FEHLENDE SPALTEN HINZUFÜGEN
-- ===========================

-- Profiles Tabelle erweitern
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payback_card_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payback_card_scanned_at TIMESTAMP WITH TIME ZONE;

-- Stores Tabelle erweitern 
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Coupons Tabelle erweitern
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS product_category_id UUID;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS value_amount DECIMAL(10,2);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'points';
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS combination_rules JSONB;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS detected_store_name TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_type coupon_value_type;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_numeric DECIMAL(10,2);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_text TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS generated_barcode_url TEXT;

-- ===========================
-- 3. FEHLENDE TABELLEN ERSTELLEN
-- ===========================

-- Product Categories Tabelle
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Redemption Sessions Tabelle
CREATE TABLE IF NOT EXISTS redemption_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    payback_card_code TEXT,
    selected_coupons UUID[],
    session_status TEXT DEFAULT 'active',
    total_value DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Coupon Redemptions erweitern
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES redemption_sessions(id);
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS redemption_order INTEGER DEFAULT 1;

-- ===========================
-- 4. JETZT STORES ALS AKTIV SETZEN (nachdem Spalte existiert)
-- ===========================

UPDATE stores SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- ===========================
-- 5. INDIZES ERSTELLEN
-- ===========================

CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_code ON product_categories(code);
CREATE INDEX IF NOT EXISTS idx_coupons_value_amount ON coupons(value_amount DESC);

-- ===========================
-- 6. RLS POLICIES
-- ===========================

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_sessions ENABLE ROW LEVEL SECURITY;

-- Product Categories Policies
DROP POLICY IF EXISTS "Everyone can view active categories" ON product_categories;
CREATE POLICY "Everyone can view active categories" ON product_categories
    FOR SELECT USING (is_active = true);

-- Redemption Sessions Policies  
DROP POLICY IF EXISTS "Users can manage own sessions" ON redemption_sessions;
CREATE POLICY "Users can manage own sessions" ON redemption_sessions
    FOR ALL USING (auth.uid() = user_id);

-- ===========================
-- 7. FUNKTIONEN REPARIEREN
-- ===========================

-- Lösche alte Funktion
DROP FUNCTION IF EXISTS get_coupons_by_store_and_category(UUID, coupon_category);

-- Erstelle neue Funktion
CREATE OR REPLACE FUNCTION get_coupons_by_store_and_category(
    p_store_id UUID,
    p_category coupon_category DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category coupon_category,
    value_amount DECIMAL,
    value_type TEXT,
    valid_until DATE,
    category_name TEXT,
    can_combine BOOLEAN,
    barcode_value TEXT,
    barcode_type barcode_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.category,
        c.value_amount,
        c.value_type,
        c.valid_until,
        COALESCE(pc.name, 'Allgemein') as category_name,
        c.is_combinable as can_combine,
        c.barcode_value,
        c.barcode_type
    FROM coupons c
    LEFT JOIN product_categories pc ON c.product_category_id = pc.id
    WHERE 
        c.store_id = p_store_id 
        AND c.is_active = true 
        AND c.valid_until >= CURRENT_DATE
        AND (p_category IS NULL OR c.category = p_category)
    ORDER BY 
        c.category,
        c.value_amount DESC NULLS LAST,
        c.priority DESC,
        c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Kombinationsvalidierung-Funktion
CREATE OR REPLACE FUNCTION validate_coupon_combination(coupon_ids UUID[])
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"valid": true, "conflicts": [], "warnings": []}';
    coupon_record RECORD;
    coupon_id UUID;
    einkauf_count INTEGER := 0;
BEGIN
    FOREACH coupon_id IN ARRAY coupon_ids
    LOOP
        SELECT * INTO coupon_record FROM coupons WHERE id = coupon_id;
        
        IF NOT FOUND THEN
            result := jsonb_set(result, '{conflicts}', 
                (result->>'conflicts')::jsonb || jsonb_build_array('Coupon nicht gefunden'));
            CONTINUE;
        END IF;
        
        -- Nur ein Einkaufs-Coupon erlaubt
        IF coupon_record.category = 'einkauf' THEN
            einkauf_count := einkauf_count + 1;
            IF einkauf_count > 1 THEN
                result := jsonb_set(result, '{valid}', 'false');
                result := jsonb_set(result, '{conflicts}', 
                    (result->>'conflicts')::jsonb || jsonb_build_array('Nur ein Einkaufs-Coupon erlaubt'));
            END IF;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- 8. STANDARD-DATEN HINZUFÜGEN
-- ===========================

-- Warengruppen hinzufügen
INSERT INTO product_categories (code, name, description) VALUES 
('einkauf', 'Gesamter Einkauf', 'Punkte auf den kompletten Einkaufswert'),
('getraenke', 'Getränke', 'Säfte, Limonaden, Wasser, alkoholische Getränke'),
('drogerie', 'Drogerie', 'Körperpflege, Kosmetik, Haushalt'),
('kraftstoff', 'Kraftstoff', 'Benzin, Diesel, AdBlue'),
('elektronik', 'Elektronik', 'Smartphones, Computer, TV, Audio')
ON CONFLICT (code) DO NOTHING;

-- Stores hinzufügen (nur falls sie noch nicht existieren)
INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'EDEKA', 'EDEKA', ARRAY['supermarkt', 'lebensmittel', 'payback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'EDEKA');

INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'dm-drogerie markt', 'DM', ARRAY['drogerie', 'gesundheit', 'payback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'dm-drogerie markt');

INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'Aral', 'ARAL', ARRAY['tankstelle', 'kraftstoff', 'payback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'Aral');

INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'MediaMarkt', 'MEDIAMARKT', ARRAY['elektronik', 'technik', 'payback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'MediaMarkt');

INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'REWE', 'REWE', ARRAY['supermarkt', 'lebensmittel', 'cashback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'REWE');

INSERT INTO stores (name, chain_code, tags, is_active) 
SELECT 'Lidl', 'LIDL', ARRAY['discounter', 'lebensmittel', 'cashback'], true
WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = 'Lidl');

-- Test-Coupons für EDEKA hinzufügen
DO $$ 
DECLARE
    edeka_store_id UUID;
    einkauf_category_id UUID;
BEGIN
    SELECT id INTO edeka_store_id FROM stores WHERE name = 'EDEKA' LIMIT 1;
    SELECT id INTO einkauf_category_id FROM product_categories WHERE code = 'einkauf' LIMIT 1;
    
    IF edeka_store_id IS NOT NULL AND einkauf_category_id IS NOT NULL THEN
        INSERT INTO coupons (
            store_id, 
            title, 
            description, 
            category, 
            barcode_type, 
            barcode_value, 
            valid_until, 
            value_amount, 
            value_type,
            product_category_id,
            is_active
        ) VALUES 
        (
            edeka_store_id,
            'EDEKA 20FACH PAYBACK',
            '20-fach PAYBACK Punkte auf den gesamten Einkauf',
            'einkauf',
            'ean13',
            '4000123456789',
            CURRENT_DATE + INTERVAL '30 days',
            20,
            'points',
            einkauf_category_id,
            true
        ),
        (
            edeka_store_id,
            '2€ Sofort-Rabatt',
            '2€ Sofort-Rabatt ab 15€ Einkaufswert',
            'einkauf',
            'code128',
            'EDK2024SAVE2',
            CURRENT_DATE + INTERVAL '7 days',
            2,
            'euro',
            einkauf_category_id,
            true
        );
    END IF;
END $$;

-- ===========================
-- ABSCHLUSS
-- ===========================

SELECT 'DATENBANK VOLLSTÄNDIG REPARIERT! ✅' as status,
       (SELECT COUNT(*) FROM stores WHERE is_active = true) as active_stores,
       (SELECT COUNT(*) FROM product_categories WHERE is_active = true) as categories,
       (SELECT COUNT(*) FROM coupons WHERE is_active = true) as active_coupons;
