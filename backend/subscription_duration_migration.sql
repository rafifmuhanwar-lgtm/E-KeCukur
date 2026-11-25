-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION: DUKUNGAN DURASI LANGGANAN & MASA AKTIF EXPIRY E-CUKUR
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Tambah kolom plan_expires_at di tabel barbers jika belum ada
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Index untuk query pengecekan status kedaluwarsa cepat
CREATE INDEX IF NOT EXISTS idx_barbers_plan_expiry 
ON public.barbers(plan, plan_expires_at);

-- 3. Catatan:
-- Sistem E-CUKUR secara otomatis mendukung masa aktif langganan:
-- 1 Bulan (Normal)
-- 3 Bulan (Hemat Rp 30.000 / Rp 10.000 per bulan)
-- 6 Bulan (Hemat Rp 60.000 / Rp 10.000 per bulan)
-- 12 Bulan / 1 Tahun (Hemat Rp 120.000 / Rp 10.000 per bulan)
