-- SYNCHRONISIERT LOKALES SCHEMA MIT AKTUELLER SUPABASE-STRUKTUR
-- Führe diese Migration aus, um fehlende Spalten hinzuzufügen

-- 1. FEHLENDE SPALTEN ZUR COUPONS TABELLE HINZUFÜGEN
-- (Nur hinzufügen falls sie nicht existieren)

-- detected_store_name
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'detected_store_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN detected_store_name TEXT;
        RAISE NOTICE '✅ Spalte detected_store_name hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte detected_store_name existiert bereits';
    END IF;
END $$;

-- coupon_value_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'coupon_value_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN coupon_value_type TEXT;
        RAISE NOTICE '✅ Spalte coupon_value_type hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte coupon_value_type existiert bereits';
    END IF;
END $$;

-- coupon_value_numeric
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'coupon_value_numeric'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN coupon_value_numeric DECIMAL(10,2);
        RAISE NOTICE '✅ Spalte coupon_value_numeric hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte coupon_value_numeric existiert bereits';
    END IF;
END $$;

-- coupon_value_text
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'coupon_value_text'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN coupon_value_text TEXT;
        RAISE NOTICE '✅ Spalte coupon_value_text hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte coupon_value_text existiert bereits';
    END IF;
END $$;

-- generated_barcode_url
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'generated_barcode_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN generated_barcode_url TEXT;
        RAISE NOTICE '✅ Spalte generated_barcode_url hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte generated_barcode_url existiert bereits';
    END IF;
END $$;

-- product_category_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'product_category_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN product_category_id UUID REFERENCES product_categories(id);
        RAISE NOTICE '✅ Spalte product_category_id hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte product_category_id existiert bereits';
    END IF;
END $$;

-- value_amount
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'value_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN value_amount DECIMAL(10,2);
        RAISE NOTICE '✅ Spalte value_amount hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte value_amount existiert bereits';
    END IF;
END $$;

-- value_type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'value_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN value_type TEXT DEFAULT 'points';
        RAISE NOTICE '✅ Spalte value_type hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte value_type existiert bereits';
    END IF;
END $$;

-- combination_rules
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'combination_rules'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons ADD COLUMN combination_rules JSONB;
        RAISE NOTICE '✅ Spalte combination_rules hinzugefügt';
    ELSE
        RAISE NOTICE '⚪ Spalte combination_rules existiert bereits';
    END IF;
END $$;

-- 2. ENTFERNE VERALTETE/NICHT VORHANDENE SPALTEN
-- (Nur entfernen falls sie existieren aber nicht in Supabase sind)

-- per_user_limit (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'per_user_limit'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN per_user_limit;
        RAISE NOTICE '🗑️ Veraltete Spalte per_user_limit entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte per_user_limit existiert nicht';
    END IF;
END $$;

-- per_payback_limit (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'per_payback_limit'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN per_payback_limit;
        RAISE NOTICE '🗑️ Veraltete Spalte per_payback_limit entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte per_payback_limit existiert nicht';
    END IF;
END $$;

-- warengruppe_id (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'warengruppe_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN warengruppe_id;
        RAISE NOTICE '🗑️ Veraltete Spalte warengruppe_id entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte warengruppe_id existiert nicht';
    END IF;
END $$;

-- artikel_id (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'artikel_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN artikel_id;
        RAISE NOTICE '🗑️ Veraltete Spalte artikel_id entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte artikel_id existiert nicht';
    END IF;
END $$;

-- discount_amount (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'discount_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN discount_amount;
        RAISE NOTICE '🗑️ Veraltete Spalte discount_amount entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte discount_amount existiert nicht';
    END IF;
END $$;

-- discount_percentage (nicht in aktueller Supabase-Struktur)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' 
        AND column_name = 'discount_percentage'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE coupons DROP COLUMN discount_percentage;
        RAISE NOTICE '🗑️ Veraltete Spalte discount_percentage entfernt';
    ELSE
        RAISE NOTICE '⚪ Spalte discount_percentage existiert nicht';
    END IF;
END $$;

SELECT '🎉 SCHEMA-SYNCHRONISATION ABGESCHLOSSEN!' as status;
SELECT 'Lokales Schema ist jetzt mit Supabase synchronisiert.' as info;
