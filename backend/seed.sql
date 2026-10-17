-- ============================================================
-- E-CUKUR SUPABASE SCHEMA & SEED DATA
-- Copy and paste this script directly into Supabase SQL Editor
-- ============================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Barbers Table
CREATE TABLE IF NOT EXISTS barbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  profile_photo TEXT,
  account_status TEXT DEFAULT 'ACTIVE' CHECK (account_status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
  availability_status TEXT DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'BREAK', 'LEAVE', 'OFF')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  barber_name TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name TEXT,
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  booking_status TEXT DEFAULT 'CONFIRMED' CHECK (booking_status IN ('PENDING_PAYMENT', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  payment_method TEXT CHECK (payment_method IN ('CASH', 'QRIS', 'Tunai')),
  payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'EXPIRED')),
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Barber Schedules Table
CREATE TABLE IF NOT EXISTS barber_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_off BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Row Level Security (RLS) Configuration
-- Enable public reads and writes for seamless client & guest booking
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies for services (Public can view)
DROP POLICY IF EXISTS "Public can view active services" ON services;
CREATE POLICY "Public can view active services" ON services
  FOR SELECT USING (true);

-- Policies for barbers (Public can view)
DROP POLICY IF EXISTS "Public can view active barbers" ON barbers;
CREATE POLICY "Public can view active barbers" ON barbers
  FOR SELECT USING (true);

-- Policies for bookings (Public can view and insert bookings)
DROP POLICY IF EXISTS "Public can view bookings" ON bookings;
CREATE POLICY "Public can view bookings" ON bookings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert bookings" ON bookings;
CREATE POLICY "Public can insert bookings" ON bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update bookings" ON bookings;
CREATE POLICY "Public can update bookings" ON bookings
  FOR UPDATE USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Clear existing sample data safely
TRUNCATE TABLE services, barbers, bookings CASCADE;

-- Insert Barbers
INSERT INTO barbers (id, name, email, phone, specialty, bio, profile_photo, account_status, availability_status) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Reza', 'reza@ecukur.com', '081234567801', 'Classic Cut & Fade', 'Expert dalam potongan klasik dan fade modern.', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop', 'ACTIVE', 'AVAILABLE'),
  ('a2222222-2222-2222-2222-222222222222', 'Bima', 'bima@ecukur.com', '081234567802', 'Hair Coloring & Perm', 'Spesialis pewarnaan dan styling kekinian.', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop', 'ACTIVE', 'AVAILABLE'),
  ('a3333333-3333-3333-3333-333333333333', 'Andi', 'andi@ecukur.com', '081234567803', 'Beard Grooming & Shave', 'Ahli merawat brewok dan grooming pria.', 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop', 'ACTIVE', 'AVAILABLE'),
  ('a4444444-4444-4444-4444-444444444444', 'Doni', 'doni@ecukur.com', '081234567804', 'Modern Undercut', 'Ahli variasi undercut kontemporer.', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop', 'ACTIVE', 'BREAK');

-- Insert Services
INSERT INTO services (id, name, description, price, duration_minutes, is_active) VALUES
  ('s1111111-1111-1111-1111-111111111111', 'CUKUR DEWASA', 'Cukuran klasik dan modern dengan presisi tinggi', 40000, 45, true),
  ('s2222222-2222-2222-2222-222222222222', 'CUKUR ANAK', 'Potong rambut ramah anak dengan hasil rapi', 25000, 30, true),
  ('s3333333-3333-3333-3333-333333333333', 'KERAMAS & MASSAGE', 'Cuci rambut relaxing, pijat kepala & hair tonic', 20000, 20, true),
  ('s4444444-4444-4444-4444-444444444444', 'HAIR COLORING', 'Pewarnaan rambut trendi dan bleaching berkualitas', 100000, 120, true),
  ('s5555555-5555-5555-5555-555555555555', 'PERM TEXTURE', 'Keriting texture pria modern gaya Korea/Jepang', 150000, 180, true);

-- Insert Sample Bookings
INSERT INTO bookings (id, customer_name, customer_phone, barber_id, barber_name, service_name, booking_date, start_time, end_time, booking_status, payment_method, payment_status, total_price) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Rian Saputra', '081234567890', 'a1111111-1111-1111-1111-111111111111', 'Reza', 'CUKUR DEWASA', CURRENT_DATE, '10:00:00', '10:45:00', 'CONFIRMED', 'Tunai', 'UNPAID', 40000),
  ('b2222222-2222-2222-2222-222222222222', 'Fajar Nugraha', '081987654321', 'a2222222-2222-2222-2222-222222222222', 'Bima', 'HAIR COLORING', CURRENT_DATE + INTERVAL '1 day', '13:00:00', '15:00:00', 'COMPLETED', 'QRIS', 'PAID', 100000);
