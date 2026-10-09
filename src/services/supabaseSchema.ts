/**
 * Production-ready SQL Schema for Supabase PostgreSQL
 * Fully typed columns matching RawTripData, RateCardTable, DieselPriceRecord,
 * ZoneMappingRule, QuotationSchema, and FixedDieselCustomer.
 *
 * Includes indexes for high-speed queries on trip_no, job_no, issue_date, branch, truck_type.
 * Includes Row Level Security (RLS) policies allowing full read/write for anon public key.
 */

export const SUPABASE_DATABASE_SCHEMA_SQL = `-- ====================================================================
-- TRANSPORT BILLING & ANALYTICS SYSTEM - SUPABASE DATABASE SCHEMA
-- Generated for Supabase Project: dwpremcqguvpeheynvsk
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- TABLE 1: transport_trips (ข้อมูลเที่ยวรถขนส่งทั้งหมด รองรับมากกว่า 50,000+ รายการ)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_trips (
    id TEXT PRIMARY KEY,
    issue_date DATE,
    clearance_date DATE,
    consignee_shipper TEXT NOT NULL DEFAULT '',
    address TEXT,
    job_no TEXT NOT NULL DEFAULT '',
    hawb_no TEXT,
    mawb_no TEXT,
    flt_no TEXT,
    invoice_no TEXT,
    dimension TEXT,
    qty NUMERIC(12, 2) DEFAULT 0,
    unit TEXT,
    gw NUMERIC(12, 2) DEFAULT 0,
    volume NUMERIC(12, 4) DEFAULT 0,
    product TEXT,
    porter NUMERIC(12, 2) DEFAULT 0,
    dry_ice NUMERIC(12, 2) DEFAULT 0,
    actual_qty NUMERIC(12, 2) DEFAULT 0,
    unit1 TEXT,
    actual_gw NUMERIC(12, 2) DEFAULT 0,
    actual_volume NUMERIC(12, 4) DEFAULT 0,
    pick_up_date DATE,
    pick_up_time TEXT,
    pick_up_in TEXT,
    pick_up_out TEXT,
    pick_up_name TEXT NOT NULL DEFAULT '',
    pick_up_address TEXT,
    pick_up_province TEXT NOT NULL DEFAULT '',
    pick_up_district TEXT,
    pick_up_zone TEXT,
    pick_up_remark TEXT,
    delivery_date DATE,
    delivery_time TEXT,
    delivery_in TEXT,
    delivery_out TEXT,
    delivery_name TEXT NOT NULL DEFAULT '',
    delivery_address TEXT,
    delivery_province TEXT NOT NULL DEFAULT '',
    delivery_district TEXT DEFAULT '',
    delivery_zone TEXT,
    delivery_remark TEXT,
    cs_name TEXT,
    business_unit TEXT,
    order_type TEXT,
    sub_contractor TEXT,
    truck_site TEXT,
    truck_no TEXT,
    driver_name TEXT,
    truck_type TEXT NOT NULL DEFAULT '4W',
    truck_charge NUMERIC(12, 2) DEFAULT 0,
    transport_site TEXT,
    trip_start_date DATE,
    trip_status TEXT,
    backhaul TEXT,
    trip_no TEXT NOT NULL DEFAULT '',
    receiver TEXT,
    trip_detail_status TEXT,
    transport_remark TEXT,
    trip_create_date DATE,
    trip_created_by TEXT,
    haul_type TEXT,
    closing_remark TEXT,
    plan_remark TEXT,
    confirm_order_by TEXT,
    customer_ref2 TEXT,
    oms_order_number TEXT,
    zip_code TEXT,
    confirm_order_date DATE,
    e_running_no TEXT,
    branch TEXT DEFAULT 'นวนคร',
    od_type TEXT DEFAULT 'Company Truck',
    drop_count INT DEFAULT 0,
    waiting_hours NUMERIC(8, 2) DEFAULT 0,
    toll_actual NUMERIC(12, 2) DEFAULT 0,
    customer_quoted_rate NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transport_trips_trip_no ON public.transport_trips(trip_no);
CREATE INDEX IF NOT EXISTS idx_transport_trips_job_no ON public.transport_trips(job_no);
CREATE INDEX IF NOT EXISTS idx_transport_trips_issue_date ON public.transport_trips(issue_date);
CREATE INDEX IF NOT EXISTS idx_transport_trips_branch ON public.transport_trips(branch);
CREATE INDEX IF NOT EXISTS idx_transport_trips_truck_type ON public.transport_trips(truck_type);
CREATE INDEX IF NOT EXISTS idx_transport_trips_consignee ON public.transport_trips(consignee_shipper);

-- ====================================================================
-- TABLE 2: transport_diesel_prices (ตารางประวัติน้ำมันดีเซลรายวัน/ย้อนหลัง)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_diesel_prices (
    date TEXT PRIMARY KEY, -- 'YYYY-MM-DD' or 'DD/MM/YYYY'
    price NUMERIC(8, 2) NOT NULL,
    source TEXT DEFAULT 'PTT Station',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- TABLE 3: transport_rate_cards (ตาราง Rate Card ตามประเภทรถ 4W / 6W / 10W / OD4 / OD6)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_rate_cards (
    truck_type TEXT PRIMARY KEY, -- '4W', '6W', '10W', 'OD4', 'OD6'
    brackets JSONB NOT NULL DEFAULT '[]'::jsonb,
    rows JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- TABLE 4: transport_zone_mappings (ตารางจับคู่โซนและปลายทาง)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_zone_mappings (
    id TEXT PRIMARY KEY,
    raw_zone_keyword TEXT NOT NULL,
    province_keyword TEXT,
    district_keyword TEXT,
    matched_location TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- TABLE 5: transport_quotations (ตารางใบเสนอราคา / สัญญาของลูกค้า)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_quotations (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'นวนคร',
    effective_date DATE,
    expiry_date DATE,
    truck_types JSONB NOT NULL DEFAULT '{}'::jsonb,
    special_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_fees JSONB NOT NULL DEFAULT '{}'::jsonb,
    od_rates JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT DEFAULT '',
    file_name TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- TABLE 6: transport_fixed_customers (รายชื่อลูกค้าที่ล็อกราคาน้ำมัน Fixed Diesel)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_fixed_customers (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    fixed_diesel_rate NUMERIC(8, 2) NOT NULL,
    notes TEXT DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- TABLE 7: transport_custom_rates (อัตราค่าเที่ยวที่ Override ต่อ Trip No)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transport_custom_rates (
    trip_id TEXT PRIMARY KEY,
    custom_rate NUMERIC(12, 2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- COMPATIBILITY TABLES: rate_cards, fuel_prices, raw_data
-- Matching user exact requested SQL schema specification
-- ====================================================================

-- 1) ตาราง rate_cards (เรทราคาต่อโซน/ประเภทรถ/ช่วงน้ำหนัก)
CREATE TABLE IF NOT EXISTS public.rate_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch TEXT NOT NULL DEFAULT 'NLC',         -- NLC, BLC
    zone TEXT NOT NULL,                         -- Si Maha Phot, Prachinburi
    truck_type TEXT NOT NULL DEFAULT '4W',      -- 4W, 6W, 10W, OD4, OD6
    weight_min NUMERIC(10, 2),                  -- 30.01
    weight_max NUMERIC(10, 2),                  -- 32.00
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,    -- 3280
    effective_date DATE,
    expiry_date DATE,
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2) ตาราง fuel_prices (ค่าน้ำมันดีเซล)
CREATE TABLE IF NOT EXISTS public.fuel_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    price NUMERIC(8, 2) NOT NULL,               -- 40.69
    source TEXT DEFAULT 'PTT',                  -- PTT, BCP, etc.
    is_fixed BOOLEAN DEFAULT FALSE,             -- true = ไม่ผันแปร
    company TEXT,                               -- สำหรับบริษัทที่ Fixed Rate (เช่น Siemens)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3) ตาราง raw_data (ข้อมูลดิบที่อัปโหลด)
CREATE TABLE IF NOT EXISTS public.raw_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issue_date DATE,
    job_no TEXT,
    trip_no TEXT,
    consignee_shipper TEXT,
    pick_up_name TEXT,
    pick_up_province TEXT,
    delivery_name TEXT,
    delivery_province TEXT,
    delivery_district TEXT,
    zone_match TEXT,
    truck_type_raw TEXT,
    truck_type_std TEXT,                        -- 4W, 6W, 10W, OD
    backhaul TEXT,
    haul_type TEXT,
    trip_status TEXT,
    driver_name TEXT,
    truck_no TEXT,
    branch TEXT,                                -- NLC, BLC
    raw_json JSONB,                             -- เก็บข้อมูลดิบทั้งหมด
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Create indexes for fast lookup on raw_data & rate_cards
CREATE INDEX IF NOT EXISTS idx_rate_cards_branch_truck ON public.rate_cards(branch, truck_type);
CREATE INDEX IF NOT EXISTS idx_rate_cards_zone ON public.rate_cards(zone);
CREATE INDEX IF NOT EXISTS idx_fuel_prices_date ON public.fuel_prices(date);
CREATE INDEX IF NOT EXISTS idx_raw_data_job_no ON public.raw_data(job_no);
CREATE INDEX IF NOT EXISTS idx_raw_data_trip_no ON public.raw_data(trip_no);
CREATE INDEX IF NOT EXISTS idx_raw_data_issue_date ON public.raw_data(issue_date);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allow Anon / Authenticated Users full SELECT, INSERT, UPDATE, DELETE
-- ====================================================================
ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_diesel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_zone_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_fixed_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_custom_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_data ENABLE ROW LEVEL SECURITY;

-- 1. transport_trips policies
DROP POLICY IF EXISTS "Anon full access to transport_trips" ON public.transport_trips;
CREATE POLICY "Anon full access to transport_trips" ON public.transport_trips
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. transport_diesel_prices policies
DROP POLICY IF EXISTS "Anon full access to transport_diesel_prices" ON public.transport_diesel_prices;
CREATE POLICY "Anon full access to transport_diesel_prices" ON public.transport_diesel_prices
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. transport_rate_cards policies
DROP POLICY IF EXISTS "Anon full access to transport_rate_cards" ON public.transport_rate_cards;
CREATE POLICY "Anon full access to transport_rate_cards" ON public.transport_rate_cards
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. transport_zone_mappings policies
DROP POLICY IF EXISTS "Anon full access to transport_zone_mappings" ON public.transport_zone_mappings;
CREATE POLICY "Anon full access to transport_zone_mappings" ON public.transport_zone_mappings
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. transport_quotations policies
DROP POLICY IF EXISTS "Anon full access to transport_quotations" ON public.transport_quotations;
CREATE POLICY "Anon full access to transport_quotations" ON public.transport_quotations
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. transport_fixed_customers policies
DROP POLICY IF EXISTS "Anon full access to transport_fixed_customers" ON public.transport_fixed_customers;
CREATE POLICY "Anon full access to transport_fixed_customers" ON public.transport_fixed_customers
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. transport_custom_rates policies
DROP POLICY IF EXISTS "Anon full access to transport_custom_rates" ON public.transport_custom_rates;
CREATE POLICY "Anon full access to transport_custom_rates" ON public.transport_custom_rates
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. rate_cards policies
DROP POLICY IF EXISTS "Anon full access to rate_cards" ON public.rate_cards;
CREATE POLICY "Anon full access to rate_cards" ON public.rate_cards
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 9. fuel_prices policies
DROP POLICY IF EXISTS "Anon full access to fuel_prices" ON public.fuel_prices;
CREATE POLICY "Anon full access to fuel_prices" ON public.fuel_prices
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 10. raw_data policies
DROP POLICY IF EXISTS "Anon full access to raw_data" ON public.raw_data;
CREATE POLICY "Anon full access to raw_data" ON public.raw_data
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Realtime publication (Optional: enables live sync between multiple tabs)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_trips;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_diesel_prices;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_rate_cards;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_zone_mappings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_quotations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_fixed_customers;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rate_cards;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fuel_prices;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_data;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
`;
