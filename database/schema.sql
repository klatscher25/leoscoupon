-- Leo's Coupon & Cashback App - Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE coupon_category AS ENUM ('einkauf', 'warengruppe', 'artikel');
CREATE TYPE cashback_status AS ENUM ('entwurf', 'eingereicht', 'genehmigt', 'ausgezahlt', 'abgelehnt');
CREATE TYPE barcode_type AS ENUM ('ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr', 'datamatrix', 'aztec', 'other');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    payback_account_id TEXT,
    role user_role DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores table
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    chain_code TEXT,
    logo_url TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Coupons table (aktualisiert basierend auf Supabase-Struktur)
CREATE TABLE coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category coupon_category NOT NULL DEFAULT 'artikel',
    barcode_type barcode_type NOT NULL,
    barcode_value TEXT NOT NULL,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    is_combinable BOOLEAN DEFAULT true,
    combinable_with_categories coupon_category[],
    tags TEXT[],
    image_url TEXT,
    conditions TEXT,
    minimum_purchase_amount DECIMAL(10,2),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Erweiterte Felder aus aktueller Supabase-Struktur
    detected_store_name TEXT,
    coupon_value_type TEXT, -- USER-DEFINED type in Supabase
    coupon_value_numeric DECIMAL(10,2),
    coupon_value_text TEXT,
    generated_barcode_url TEXT,
    product_category_id UUID REFERENCES product_categories(id),
    value_amount DECIMAL(10,2),
    value_type TEXT DEFAULT 'points',
    combination_rules JSONB
);

-- Coupon redemptions table
CREATE TABLE coupon_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    payback_account_id TEXT,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location TEXT,
    notes TEXT,
    receipt_image_url TEXT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cashback campaigns table
CREATE TABLE cashback_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    brand TEXT,
    product_title TEXT,
    description TEXT,
    terms TEXT,
    start_at DATE NOT NULL DEFAULT CURRENT_DATE,
    end_at DATE NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    link_url TEXT,
    form_url TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Payout accounts table
CREATE TABLE payout_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    iban TEXT NOT NULL,
    bank_name TEXT,
    account_holder TEXT,
    is_preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cashback submissions table
CREATE TABLE cashback_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES cashback_campaigns(id) ON DELETE SET NULL,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    purchase_date DATE NOT NULL,
    status cashback_status DEFAULT 'entwurf',
    payout_account_id UUID REFERENCES payout_accounts(id),
    contact_email TEXT,
    contact_phone TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    decided_at TIMESTAMP WITH TIME ZONE,
    payout_at TIMESTAMP WITH TIME ZONE,
    reject_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    attachment_type TEXT NOT NULL, -- 'receipt', 'product', 'coupon'
    linked_table TEXT, -- 'cashback_submissions', 'coupon_redemptions', 'coupons'
    linked_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_coupons_store_id ON coupons(store_id);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);
CREATE INDEX idx_coupons_category ON coupons(category);
CREATE INDEX idx_coupons_active ON coupons(is_active);
CREATE INDEX idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);
CREATE INDEX idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_payback ON coupon_redemptions(payback_account_id);
CREATE INDEX idx_cashback_submissions_user_id ON cashback_submissions(user_id);
CREATE INDEX idx_cashback_submissions_status ON cashback_submissions(status);
CREATE INDEX idx_cashback_campaigns_active ON cashback_campaigns(is_active);
CREATE INDEX idx_attachments_owner ON attachments(owner_user_id);
CREATE INDEX idx_attachments_linked ON attachments(linked_table, linked_id);

-- Unique constraints
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
ALTER TABLE coupon_redemptions ADD CONSTRAINT unique_coupon_user_payback 
    UNIQUE (coupon_id, user_id, payback_account_id);

-- Functions for validation
CREATE OR REPLACE FUNCTION validate_coupon_redemption()
RETURNS TRIGGER AS $$
DECLARE
    coupon_record RECORD;
    redemption_count INTEGER;
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for coupon redemption validation
CREATE TRIGGER validate_coupon_redemption_trigger
    BEFORE INSERT ON coupon_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_coupon_redemption();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cashback_campaigns_updated_at
    BEFORE UPDATE ON cashback_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cashback_submissions_updated_at
    BEFORE UPDATE ON cashback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Stores policies
CREATE POLICY "Everyone can view stores" ON stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stores" ON stores FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Coupons policies
CREATE POLICY "Everyone can view active coupons" ON coupons
    FOR SELECT USING (is_active = true AND valid_until >= CURRENT_DATE);

CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Coupon redemptions policies
CREATE POLICY "Users can view own redemptions" ON coupon_redemptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions" ON coupon_redemptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions" ON coupon_redemptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Cashback campaigns policies
CREATE POLICY "Everyone can view active campaigns" ON cashback_campaigns
    FOR SELECT USING (is_active = true AND end_at >= CURRENT_DATE);

CREATE POLICY "Admins can manage campaigns" ON cashback_campaigns FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payout accounts policies
CREATE POLICY "Users can manage own payout accounts" ON payout_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Cashback submissions policies
CREATE POLICY "Users can manage own submissions" ON cashback_submissions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions" ON cashback_submissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update submission status" ON cashback_submissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Attachments policies
CREATE POLICY "Users can manage own attachments" ON attachments
    FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Admins can view all attachments" ON attachments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage policies (execute in Supabase Dashboard -> Storage)
-- Create buckets: 'coupons', 'receipts', 'products'

-- Insert AKTUELLE Payback partner stores 2024/2025 und zusätzliche Cashback stores
INSERT INTO stores (name, chain_code, tags) VALUES
-- ✅ AKTUELLE PAYBACK Partner-Geschäfte (Stand 2024/2025)
('EDEKA', 'EDEKA', ARRAY['supermarkt', 'lebensmittel', 'payback']),
('Marktkauf', 'MARKTKAUF', ARRAY['supermarkt', 'lebensmittel', 'payback']),
('Netto Marken-Discount', 'NETTO', ARRAY['supermarkt', 'lebensmittel', 'payback']),
('trinkgut', 'TRINKGUT', ARRAY['getränke', 'lebensmittel', 'payback']),
('Alnatura', 'ALNATURA', ARRAY['bio', 'lebensmittel', 'payback']),
('Globus', 'GLOBUS', ARRAY['supermarkt', 'lebensmittel', 'payback']),
('dm-drogerie markt', 'DM', ARRAY['drogerie', 'gesundheit', 'payback']),
('Aral', 'ARAL', ARRAY['tankstelle', 'kraftstoff', 'payback']),
('C&A', 'CA', ARRAY['mode', 'bekleidung', 'payback']),
('MediaMarkt', 'MEDIAMARKT', ARRAY['elektronik', 'technik', 'payback']),
('Galeria', 'GALERIA', ARRAY['kaufhaus', 'mode', 'payback']),
('Fressnapf', 'FRESSNAPF', ARRAY['tierbedarf', 'haustier', 'payback']),
('Apollo-Optik', 'APOLLO', ARRAY['optik', 'gesundheit', 'payback']),
('Thalia', 'THALIA', ARRAY['bücher', 'medien', 'payback']),
('Dehner', 'DEHNER', ARRAY['garten', 'pflanzen', 'payback']),
('TeeGschwendner', 'TEEGSCHWENDNER', ARRAY['tee', 'getränke', 'payback']),
('LINDA Apotheken', 'LINDA', ARRAY['apotheke', 'gesundheit', 'payback']),
('HOL AB!', 'HOLAB', ARRAY['getränke', 'lebensmittel', 'payback']),


-- 💰 Weitere Cashback-Partner (NICHT bei Payback dabei)
('Amazon', 'AMAZON', ARRAY['online', 'marktplatz', 'cashback']),
('Zalando', 'ZALANDO', ARRAY['mode', 'online', 'cashback']),
('Booking.com', 'BOOKING', ARRAY['reise', 'hotel', 'cashback']),
('Expedia', 'EXPEDIA', ARRAY['reise', 'hotel', 'cashback']),
('Nike', 'NIKE', ARRAY['sport', 'mode', 'cashback']),
('Apple', 'APPLE', ARRAY['elektronik', 'technik', 'cashback']),
('H&M', 'HM', ARRAY['mode', 'bekleidung', 'cashback']),
('IKEA', 'IKEA', ARRAY['möbel', 'einrichtung', 'cashback']),
('Tchibo', 'TCHIBO', ARRAY['kaffee', 'lifestyle', 'cashback']),
('Flixbus', 'FLIXBUS', ARRAY['reise', 'transport', 'cashback']),

-- ❌ Ex-Payback Partner (jetzt nur noch Cashback)
('REWE', 'REWE', ARRAY['supermarkt', 'lebensmittel', 'cashback']),
('PENNY', 'PENNY', ARRAY['supermarkt', 'lebensmittel', 'cashback']),
('Lidl', 'LIDL', ARRAY['discounter', 'lebensmittel', 'cashback']),
('Aldi', 'ALDI', ARRAY['discounter', 'lebensmittel', 'cashback']),
('Rossmann', 'ROSSMANN', ARRAY['drogerie', 'kosmetik', 'cashback']);

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
