-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MIGRATION: QRIS LISTENER PAYMENT GATEWAY UNTUK E-CUKUR
-- Jalankan query ini di SQL Editor dashboard Supabase Anda.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.qris_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'BOOKING' CHECK (type IN ('BOOKING', 'TIP')),
  booking_id TEXT,
  barber_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  base_amount NUMERIC NOT NULL,
  unique_code INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL,
  qris_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  raw_notification TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pencarian cepat saat webhook listener notifikasi masuk
CREATE INDEX IF NOT EXISTS idx_qris_payments_amount_status 
ON public.qris_payments(total_amount, status);

CREATE INDEX IF NOT EXISTS idx_qris_payments_ref 
ON public.qris_payments(reference_id);

-- Enable RLS (Row Level Security) jika diperlukan
ALTER TABLE public.qris_payments ENABLE ROW LEVEL SECURITY;

-- Policy publik agar API backend & frontend anonim dapat membaca & membuat tagihan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qris_payments' AND policyname = 'Allow public select qris_payments'
  ) THEN
    CREATE POLICY "Allow public select qris_payments" 
    ON public.qris_payments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qris_payments' AND policyname = 'Allow public insert qris_payments'
  ) THEN
    CREATE POLICY "Allow public insert qris_payments" 
    ON public.qris_payments FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'qris_payments' AND policyname = 'Allow public update qris_payments'
  ) THEN
    CREATE POLICY "Allow public update qris_payments" 
    ON public.qris_payments FOR UPDATE USING (true);
  END IF;
END $$;

