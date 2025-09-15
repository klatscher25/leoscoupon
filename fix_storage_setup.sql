-- Coupon Storage Setup - Korrekte Reihenfolge
-- WICHTIG: Bucket "coupons" muss zuerst im Dashboard erstellt werden!

-- 1. Image URL Feld zur Coupons-Tabelle hinzufügen
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Storage Policies für Bucket "coupons" 
-- (Nur ausführen NACH Bucket-Erstellung im Dashboard!)

-- Policy für Uploads (nur Admins)
DROP POLICY IF EXISTS "Admins can upload coupon images" ON storage.objects;
CREATE POLICY "Admins can upload coupon images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'coupons' AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy für Downloads (alle authentifizierten User)
DROP POLICY IF EXISTS "Authenticated users can view coupon images" ON storage.objects;
CREATE POLICY "Authenticated users can view coupon images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'coupons' AND 
  auth.role() = 'authenticated'
);

-- Policy für Updates/Deletes (nur Admins)
DROP POLICY IF EXISTS "Admins can manage coupon images" ON storage.objects;
CREATE POLICY "Admins can manage coupon images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'coupons' AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Policy für Deletes (nur Admins)
DROP POLICY IF EXISTS "Admins can delete coupon images" ON storage.objects;
CREATE POLICY "Admins can delete coupon images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'coupons' AND 
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Test Query: Zeige alle Storage Buckets
SELECT * FROM storage.buckets WHERE name = 'coupons';
