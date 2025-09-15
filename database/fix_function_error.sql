-- BEHEBT DEN FUNCTION RETURN TYPE ERROR
-- Führe dieses SQL in deinem Supabase SQL Editor aus

-- 1. LÖSCHE DIE EXISTIERENDE FUNKTION
DROP FUNCTION IF EXISTS get_coupons_by_store_and_category(UUID, coupon_category);

-- 2. ERSTELLE DIE FUNKTION MIT KORREKTEM RETURN TYPE NEU
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

-- 3. STELLE SICHER DASS STORES AKTIV SIND
UPDATE stores SET is_active = true WHERE is_active IS NULL OR is_active = false;

SELECT 'FUNCTION FEHLER BEHOBEN! ✅' as status;
