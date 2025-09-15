-- Remove unwanted coupon fields: per_user_limit, per_payback_limit, discount_amount, discount_percentage
-- Execute this in your Supabase SQL Editor

-- Remove the unwanted columns from coupons table
ALTER TABLE coupons DROP COLUMN IF EXISTS per_user_limit;
ALTER TABLE coupons DROP COLUMN IF EXISTS per_payback_limit;
ALTER TABLE coupons DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE coupons DROP COLUMN IF EXISTS discount_percentage;

-- Add comment for documentation
COMMENT ON TABLE coupons IS 'Coupons table updated - removed individual discount fields in favor of structured coupon_value_* fields';

-- Verify the columns are removed (this will error if they still exist)
-- SELECT per_user_limit FROM coupons LIMIT 1; -- Should error
-- SELECT per_payback_limit FROM coupons LIMIT 1; -- Should error  
-- SELECT discount_amount FROM coupons LIMIT 1; -- Should error
-- SELECT discount_percentage FROM coupons LIMIT 1; -- Should error
