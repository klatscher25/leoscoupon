-- ZEIGE DIE EXAKTE STRUKTUR DER COUPONS TABELLE
-- Führe diese Queries in deinem Supabase SQL Editor aus und gib mir das Ergebnis

-- 1. ALLE SPALTEN DER COUPONS TABELLE
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'coupons' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. ALLE SPALTEN DER STORES TABELLE  
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stores' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. ALLE SPALTEN DER PRODUCT_CATEGORIES TABELLE
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. ZEIGE ALLE TABELLEN IM SCHEMA
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
