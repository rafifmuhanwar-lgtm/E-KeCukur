-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- E-CUKUR SUPABASE DATABASE & STORAGE INITIAL SETUP
-- Jalankan skrip ini di SQL Editor Supabase Anda:
-- https://supabase.com/dashboard/project/natgqaksuousldfxydnr/sql/new
--
-- Fitur yang diaktifkan oleh skrip ini:
-- 1. Penyesuaian kolom tabel barbers (slug, whatsapp, schedule, theme, dll)
-- 2. Penyesuaian constraint roles agar mendukung role 'BARBER'
-- 3. Izin RLS penuh untuk publik (anon & authenticated)
-- 4. Storage Bucket 'avatars' untuk upload foto profil asli
-- 5. Trigger otomatis auto-create profil ketika login / register via Email atau GOOGLE OAUTH
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Pastikan kolom pendukung di tabel barbers tersedia
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS schedule TEXT DEFAULT '';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS working_hours TEXT DEFAULT '';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS open_days TEXT DEFAULT '';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'forest';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS button_style TEXT DEFAULT 'rounded';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS tiktok TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'barber';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'capster';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"booking":true,"services":true,"lookbook":true,"team":false,"location":true,"tipping":true}'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS tipping_config JSONB;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS tip_balance NUMERIC DEFAULT 0;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS tips_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS withdrawals_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS payout_account JSONB;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS lookbook JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS banner_image TEXT;
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS banner_tagline TEXT DEFAULT 'Gaya Rambut Bukan Sekadar Penampilan';
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS location_city TEXT DEFAULT '';

-- Update slug & whatsapp default untuk data lama jika ada
UPDATE public.barbers SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) WHERE slug IS NULL;
UPDATE public.barbers SET whatsapp = phone WHERE whatsapp IS NULL;

-- 2. Pastikan tabel users mendukung role 'BARBER' & constraint email unik
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER', 'STAFF', 'BARBER', 'ADMIN'));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE UNIQUE INDEX IF NOT EXISTS barbers_email_idx ON public.barbers (email);

-- 3. Berikan hak akses penuh ke tabel bookings, barbers, services, dan users untuk anon & authenticated
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy untuk Bookings
DROP POLICY IF EXISTS "Public can do all on bookings" ON public.bookings;
CREATE POLICY "Public can do all on bookings"
ON public.bookings FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- Policy untuk Barbers
DROP POLICY IF EXISTS "Public can do all on barbers" ON public.barbers;
CREATE POLICY "Public can do all on barbers"
ON public.barbers FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- Policy untuk Services
DROP POLICY IF EXISTS "Public can do all on services" ON public.services;
CREATE POLICY "Public can do all on services"
ON public.services FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- Policy untuk Users
DROP POLICY IF EXISTS "Public can do all on users" ON public.users;
CREATE POLICY "Public can do all on users"
ON public.users FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

-- 4. Buat Storage Bucket 'avatars' untuk upload foto profil asli
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy Storage agar foto bisa diupload & dilihat publik
DROP POLICY IF EXISTS "Public Avatar Read Access" ON storage.objects;
CREATE POLICY "Public Avatar Read Access"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Avatar Upload Access" ON storage.objects;
CREATE POLICY "Public Avatar Upload Access"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Avatar Update Access" ON storage.objects;
CREATE POLICY "Public Avatar Update Access"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public Avatar Delete Access" ON storage.objects;
CREATE POLICY "Public Avatar Delete Access"
ON storage.objects FOR DELETE TO anon, authenticated
USING (bucket_id = 'avatars');

-- 5. Trigger auto-create barber & user profil saat register via Email atau Google OAuth
-- (Akun baru mulai 100% KOSONG / POLOS agar barber bebas mengisi dari nol)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_name text;
  v_phone text;
  v_role text;
  v_slug text;
  v_photo text;
BEGIN
  BEGIN
    -- Ambil nama dari metadata email atau Google OAuth
    v_name := COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    );
    v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'barber');
    
    -- Buat slug bio unik
    v_slug := COALESCE(
      new.raw_user_meta_data->>'slug',
      LOWER(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9]', '', 'g'))
    );
    IF v_slug IS NULL OR v_slug = '' THEN
      v_slug := 'barber-' || SUBSTRING(new.id::text, 1, 6);
    END IF;

    -- Jika slug sudah dipakai oleh barber lain, tambahkan akhiran unik
    IF EXISTS (SELECT 1 FROM public.barbers WHERE slug = v_slug AND email <> new.email) THEN
      v_slug := v_slug || '-' || SUBSTRING(new.id::text, 1, 4);
    END IF;

    v_photo := COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      ''
    );

    -- Insert / Update ke tabel users
    INSERT INTO public.users (id, email, name, role, phone)
    VALUES (new.id, new.email, v_name, UPPER(v_role), v_phone)
    ON CONFLICT (email) DO UPDATE SET 
      name = COALESCE(public.users.name, v_name),
      phone = COALESCE(public.users.phone, v_phone);

    -- Insert / Update ke tabel barbers jika role = barber
    IF LOWER(v_role) = 'barber' THEN
      INSERT INTO public.barbers (
        user_id, name, email, phone, whatsapp, slug, specialty, bio, profile_photo, availability_status, account_status
      )
      VALUES (
        new.id,
        v_name,
        new.email,
        v_phone,
        v_phone,
        v_slug,
        '',
        '',
        v_photo,
        'AVAILABLE',
        'ACTIVE'
      )
      ON CONFLICT (email) DO UPDATE SET 
        user_id = new.id, 
        slug = COALESCE(public.barbers.slug, v_slug),
        profile_photo = COALESCE(public.barbers.profile_photo, v_photo);
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user warning: %', SQLERRM;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Bersihkan sisa data dummy lama jika ada akun sebelumnya yang pernah auto-terisi
UPDATE public.barbers 
SET 
  bio = '',
  specialty = '',
  address = '',
  schedule = ''
WHERE 
  bio LIKE '%Siap melayani potongan rambut%' 
  OR specialty LIKE '%Classic Cut%' 
  OR specialty LIKE '%Grooming Specialist%'
  OR address LIKE '%Bekasi Selatan%'
  OR schedule LIKE '%Buka 10:00 - 21:00 • Siap Terima Booking%';
