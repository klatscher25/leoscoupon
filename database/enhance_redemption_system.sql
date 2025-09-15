-- Erweitert das Datenbank-Schema für das verbesserte Einlösungssystem
-- Leo's Coupon & Cashback App - Redemption Enhancement

-- 1. Erweitere profiles Tabelle um PAYBACK-Karten-Feld
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payback_card_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payback_card_scanned_at TIMESTAMP WITH TIME ZONE;

-- 2. Erstelle neue Warengruppen-Tabelle für bessere Verwaltung
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- z.B. 'drogerie', 'tiefkuehl', 'getraenke'
    name TEXT NOT NULL, -- z.B. 'Drogerie', 'Tiefkühl', 'Getränke'
    description TEXT,
    parent_category_id UUID REFERENCES product_categories(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 3. Erweitere coupons Tabelle um bessere Kategorisierung
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS product_category_id UUID REFERENCES product_categories(id);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS value_amount DECIMAL(10,2); -- Coupon-Wert in Punkten/Euro
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS value_type TEXT DEFAULT 'points'; -- 'points', 'euro', 'percentage'
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS combination_rules JSONB; -- Erweiterte Kombinationsregeln

-- 4. Erstelle Redemption Sessions Tabelle für den Checkout-Prozess
CREATE TABLE IF NOT EXISTS redemption_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    payback_card_code TEXT,
    selected_coupons UUID[], -- Array von Coupon IDs
    session_status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    total_value DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Erweitere coupon_redemptions um Session-Referenz
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES redemption_sessions(id);
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS redemption_order INTEGER DEFAULT 1; -- Reihenfolge im Checkout

-- 6. Erstelle Kombinationsvalidierungs-Funktion
CREATE OR REPLACE FUNCTION validate_coupon_combination(coupon_ids UUID[])
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"valid": true, "conflicts": [], "warnings": []}';
    coupon_record RECORD;
    coupon_id UUID;
    einkauf_count INTEGER := 0;
    category_counts JSONB := '{}';
    artikel_groups JSONB := '{}';
BEGIN
    -- Durchlaufe alle Coupons und prüfe Kombinationsregeln
    FOREACH coupon_id IN ARRAY coupon_ids
    LOOP
        SELECT * INTO coupon_record FROM coupons WHERE id = coupon_id;
        
        IF NOT FOUND THEN
            result := jsonb_set(result, '{conflicts}', 
                (result->>'conflicts')::jsonb || jsonb_build_array('Coupon ' || coupon_id || ' nicht gefunden'));
            CONTINUE;
        END IF;
        
        -- Zähle Einkaufs-Coupons (max. 1 erlaubt)
        IF coupon_record.category = 'einkauf' THEN
            einkauf_count := einkauf_count + 1;
            IF einkauf_count > 1 THEN
                result := jsonb_set(result, '{valid}', 'false');
                result := jsonb_set(result, '{conflicts}', 
                    (result->>'conflicts')::jsonb || jsonb_build_array('Nur ein Einkaufs-Coupon erlaubt'));
            END IF;
        END IF;
        
        -- Zähle Warengruppen-Coupons (max. 1 pro Warengruppe)
        IF coupon_record.category = 'warengruppe' AND coupon_record.product_category_id IS NOT NULL THEN
            IF category_counts ? coupon_record.product_category_id::text THEN
                result := jsonb_set(result, '{valid}', 'false');
                result := jsonb_set(result, '{conflicts}', 
                    (result->>'conflicts')::jsonb || jsonb_build_array('Nur ein Coupon pro Warengruppe erlaubt'));
            ELSE
                category_counts := category_counts || jsonb_build_object(coupon_record.product_category_id::text, 1);
            END IF;
        END IF;
        
        -- Zähle Artikel-Coupons (max. 1 pro Artikel)
        IF coupon_record.category = 'artikel' AND coupon_record.artikel_id IS NOT NULL THEN
            IF artikel_groups ? coupon_record.artikel_id THEN
                result := jsonb_set(result, '{valid}', 'false');
                result := jsonb_set(result, '{conflicts}', 
                    (result->>'conflicts')::jsonb || jsonb_build_array('Nur ein Coupon pro Artikel erlaubt'));
            ELSE
                artikel_groups := artikel_groups || jsonb_build_object(coupon_record.artikel_id, 1);
            END IF;
        END IF;
        
        -- Prüfe individuelle Kombinationsregeln
        IF coupon_record.combination_rules IS NOT NULL THEN
            -- Hier können spezifische Partner-Regeln implementiert werden
            -- z.B. Aral: nur ein Kraftstoff-Coupon
            -- dm: nur ein Gesamteinkaufs-Coupon
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Erstelle Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_product_categories_code ON product_categories(code);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_coupons_product_category ON coupons(product_category_id);
CREATE INDEX IF NOT EXISTS idx_coupons_value_amount ON coupons(value_amount DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_sessions_user ON redemption_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_sessions_status ON redemption_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_session ON coupon_redemptions(session_id);

-- 8. Triggers für updated_at
CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 9. RLS Policies für neue Tabellen
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_sessions ENABLE ROW LEVEL SECURITY;

-- Product Categories Policies
CREATE POLICY "Everyone can view active categories" ON product_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON product_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Redemption Sessions Policies
CREATE POLICY "Users can manage own sessions" ON redemption_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 10. Füge Standard-Warengruppen hinzu basierend auf PAYBACK-Kategorien
INSERT INTO product_categories (code, name, description) VALUES 
('einkauf', 'Gesamter Einkauf', 'Punkte auf den kompletten Einkaufswert'),
('obst_gemuese', 'Obst & Gemüse', 'Frische Obst- und Gemüseprodukte'),
('getraenke', 'Getränke', 'Säfte, Limonaden, Wasser, alkoholische Getränke'),
('tiefkuehl', 'Tiefkühl', 'Tiefkühlprodukte aller Art'),
('kaffee_tee_kakao', 'Kaffee, Tee & Kakao', 'Heißgetränke und zugehörige Produkte'),
('fleisch_wurst', 'Fleisch & Wurst', 'Frische und verarbeitete Fleischprodukte'),
('milchprodukte', 'Milchprodukte', 'Milch, Joghurt, Käse, Butter'),
('brot_backwaren', 'Brot & Backwaren', 'Brot, Brötchen, Kuchen, Gebäck'),
('suessigkeiten', 'Süßigkeiten', 'Schokolade, Bonbons, Gummibärchen'),
('drogerie', 'Drogerie', 'Körperpflege, Kosmetik, Haushalt'),
('naturkosmetik', 'Naturkosmetik', 'Bio- und Naturkosmetikprodukte'),
('gesichtspflege', 'Gesichtspflege', 'Cremes, Reinigung, Anti-Aging'),
('sonnenschutz', 'Sonnenschutz', 'Sonnencreme, After-Sun, UV-Schutz'),
('kraftstoff', 'Kraftstoff', 'Benzin, Diesel, AdBlue'),
('tankstellen_shop', 'Tankstellen-Shop', 'Snacks, Getränke, Autozubehör'),
('autowaesche', 'Autowäsche', 'Waschprogramme und Autopflege'),
('mode_bekleidung', 'Mode & Bekleidung', 'Kleidung, Schuhe, Accessoires'),
('elektronik', 'Elektronik', 'Smartphones, Computer, TV, Audio'),
('haushaltswaren', 'Haushaltswaren', 'Küchengeräte, Haushaltshelfer'),
('tierbedarf', 'Tierbedarf', 'Futter, Spielzeug, Zubehör für Haustiere'),
('bucher_medien', 'Bücher & Medien', 'Bücher, Zeitschriften, DVDs, Games'),
('garten_pflanzen', 'Garten & Pflanzen', 'Pflanzen, Gartengeräte, Dünger'),
('baby_kind', 'Baby & Kind', 'Windeln, Babypflege, Spielzeug'),
('sport_freizeit', 'Sport & Freizeit', 'Sportartikel, Outdoor-Equipment'),
('apotheke', 'Apotheke', 'Medikamente, Gesundheitsprodukte')
ON CONFLICT (code) DO NOTHING;

-- 11. Erstelle Hilfsfunktion für Coupon-Sortierung nach Wert
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
    can_combine BOOLEAN
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
        c.is_combinable as can_combine
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

-- 12. Aktualisiere bestehende Trigger für Redemption Validation
DROP TRIGGER IF EXISTS validate_coupon_redemption_trigger ON coupon_redemptions;

CREATE OR REPLACE FUNCTION validate_coupon_redemption()
RETURNS TRIGGER AS $$
DECLARE
    coupon_record RECORD;
    redemption_count INTEGER;
    session_record RECORD;
BEGIN
    -- Get coupon details
    SELECT * INTO coupon_record FROM coupons WHERE id = NEW.coupon_id;
    
    -- Check if coupon is still valid
    IF coupon_record.valid_until < CURRENT_DATE THEN
        RAISE EXCEPTION 'Coupon ist abgelaufen';
    END IF;
    
    -- Check user limit
    SELECT COUNT(*) INTO redemption_count 
    FROM coupon_redemptions 
    WHERE coupon_id = NEW.coupon_id AND user_id = NEW.user_id;
    
    IF redemption_count >= coupon_record.per_user_limit THEN
        RAISE EXCEPTION 'User-Limit für diesen Coupon erreicht';
    END IF;
    
    -- Check payback account limit if provided
    IF NEW.payback_account_id IS NOT NULL THEN
        SELECT COUNT(*) INTO redemption_count 
        FROM coupon_redemptions 
        WHERE coupon_id = NEW.coupon_id AND payback_account_id = NEW.payback_account_id;
        
        IF redemption_count >= coupon_record.per_payback_limit THEN
            RAISE EXCEPTION 'Payback-Account-Limit für diesen Coupon erreicht';
        END IF;
    END IF;
    
    -- Validate session if provided
    IF NEW.session_id IS NOT NULL THEN
        SELECT * INTO session_record FROM redemption_sessions WHERE id = NEW.session_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Redemption Session nicht gefunden';
        END IF;
        
        IF session_record.session_status != 'active' THEN
            RAISE EXCEPTION 'Redemption Session ist nicht aktiv';
        END IF;
        
        -- Ensure coupon is in session's selected coupons
        IF NOT (NEW.coupon_id = ANY(session_record.selected_coupons)) THEN
            RAISE EXCEPTION 'Coupon ist nicht in der aktuellen Session ausgewählt';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_coupon_redemption_trigger
    BEFORE INSERT ON coupon_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_coupon_redemption();

-- Grant permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
