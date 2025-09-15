-- Add structured coupon value fields for better sorting and filtering
-- Execute this in your Supabase SQL Editor

-- Create ENUM for coupon value types
CREATE TYPE coupon_value_type AS ENUM ('multiplier', 'euro_amount', 'percentage', 'buy_x_get_y', 'other');

-- Add new columns to coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS detected_store_name TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_type coupon_value_type;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_numeric DECIMAL(10,2);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS coupon_value_text TEXT;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS generated_barcode_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN coupons.detected_store_name IS 'Store name detected from image OCR (e.g., EDEKA, REWE)';
COMMENT ON COLUMN coupons.coupon_value_type IS 'Type of coupon value: multiplier (20FACH), euro_amount (5€), percentage (10%), etc.';
COMMENT ON COLUMN coupons.coupon_value_numeric IS 'Numeric value for sorting: 20 for 20FACH, 5 for 5€, 10 for 10%';
COMMENT ON COLUMN coupons.coupon_value_text IS 'Original text value: 20FACH, 5€ Rabatt, 10% auf Obst';
COMMENT ON COLUMN coupons.generated_barcode_url IS 'URL to clean generated barcode image';

-- Create indexes for efficient sorting
CREATE INDEX IF NOT EXISTS idx_coupons_value_type ON coupons(coupon_value_type);
CREATE INDEX IF NOT EXISTS idx_coupons_value_numeric ON coupons(coupon_value_numeric DESC);
CREATE INDEX IF NOT EXISTS idx_coupons_detected_store ON coupons(detected_store_name);

-- Example data structure:
-- EDEKA 20FACH Coupon:
-- detected_store_name: 'EDEKA'
-- coupon_value_type: 'multiplier'
-- coupon_value_numeric: 20
-- coupon_value_text: '20FACH auf den Einkauf'

-- REWE 5€ Coupon:
-- detected_store_name: 'REWE'  
-- coupon_value_type: 'euro_amount'
-- coupon_value_numeric: 5
-- coupon_value_text: '5€ Rabatt ab 50€'

-- dm 20% Coupon:
-- detected_store_name: 'dm'
-- coupon_value_type: 'percentage'
-- coupon_value_numeric: 20
-- coupon_value_text: '20% auf Eigenmarken'
