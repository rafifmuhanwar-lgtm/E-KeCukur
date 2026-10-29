-- ========================================================================
-- E-KeCukur: SISTEM RETENSI CHAT 24 JAM & SINKRONISASI NAMA PELANGGAN
-- File: backend/chat_retention_24h.sql
--
-- Kode ini 100% MANDIRI (Self-contained). Aman dijalankan kapan saja di
-- Supabase SQL Editor tanpa error "function does not exist".
-- ========================================================================

-- 1. Pastikan tabel chat sudah ada
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_photo TEXT NOT NULL DEFAULT '',
  barber_name TEXT NOT NULL DEFAULT '',
  barber_photo TEXT NOT NULL DEFAULT '',
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ,
  customer_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (customer_unread_count >= 0),
  barber_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (barber_unread_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_distinct_participants CHECK (customer_id <> barber_id),
  CONSTRAINT conversations_customer_barber_unique UNIQUE (customer_id, barber_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Buat index cepat untuk performa tinggi & pencarian waktu
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
  ON public.conversations (last_message_at);

CREATE INDEX IF NOT EXISTS conversations_created_at_idx
  ON public.conversations (created_at);

-- 3. Fungsi validasi & peran chat (Mencegah error 'function does not exist')
CREATE OR REPLACE FUNCTION public.is_valid_chat_display_name(display_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT := regexp_replace(btrim(COALESCE(display_name, '')), '\s+', ' ', 'g');
BEGIN
  IF char_length(v_name) < 2 OR char_length(v_name) > 60 THEN
    RETURN FALSE;
  END IF;
  IF lower(v_name) IN ('pelanggan', 'admin', 'anonymous', 'null', 'undefined') THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_chat_customer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(auth.jwt()->>'is_anonymous', 'false') = 'true'
    OR (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'CUSTOMER'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.barbers b
        WHERE b.user_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_barber()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.barbers b
    JOIN public.users u ON u.id = b.user_id
    WHERE b.user_id = auth.uid()
      AND u.role = 'BARBER'
  );
$$;

-- 4. Fungsi Pembersihan Otomatis 24 Jam (Pesan, Obrolan, & Akun Tamu Anonim)
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_messages(
  p_retention_interval INTERVAL DEFAULT INTERVAL '1 day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_deleted_messages INT := 0;
  v_deleted_conversations INT := 0;
  v_deleted_users INT := 0;
  v_cutoff TIMESTAMPTZ;
BEGIN
  v_cutoff := NOW() - p_retention_interval;

  -- A. Hapus pesan yang sudah lebih dari 24 jam
  WITH del_m AS (
    DELETE FROM public.messages
    WHERE created_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_messages FROM del_m;

  -- B. Hapus percakapan yang sudah lebih dari 24 jam tidak ada aktivitas
  WITH del_c AS (
    DELETE FROM public.conversations
    WHERE (
      last_message_at < v_cutoff
      OR (last_message_at IS NULL AND created_at < v_cutoff)
    )
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_conversations FROM del_c;

  -- C. Hapus akun tamu anonim (is_anonymous = true) yang dibuat > 24 jam lalu
  BEGIN
    WITH del_u AS (
      DELETE FROM auth.users
      WHERE is_anonymous = true
        AND created_at < v_cutoff
      RETURNING id
    )
    SELECT count(*) INTO v_deleted_users FROM del_u;
  EXCEPTION WHEN OTHERS THEN
    v_deleted_users := 0;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_messages', v_deleted_messages,
    'deleted_conversations', v_deleted_conversations,
    'deleted_anonymous_users', v_deleted_users,
    'retention_interval', p_retention_interval::TEXT,
    'cutoff_time', v_cutoff,
    'executed_at', NOW()
  );
END;
$$;

-- 5. Shortcut RPC function
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.cleanup_expired_chat_messages(INTERVAL '1 day');
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat() TO authenticated, anon;

-- 6. Trigger pembersihan otomatis setiap ada pesan baru
CREATE OR REPLACE FUNCTION public.update_conversation_after_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = LEFT(NEW.body, 160),
      last_message_at = NEW.created_at,
      customer_unread_count = customer_unread_count
        + CASE WHEN NEW.sender_id <> customer_id THEN 1 ELSE 0 END,
      barber_unread_count = barber_unread_count
        + CASE WHEN NEW.sender_id <> barber_id THEN 1 ELSE 0 END
  WHERE id = NEW.conversation_id;

  BEGIN
    PERFORM public.cleanup_expired_chat_messages(INTERVAL '1 day');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_conversation_after_message ON public.messages;
CREATE TRIGGER update_conversation_after_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_after_message();

-- 7. Trigger penentu identitas percakapan (Menyimpan Nama Pelanggan Asli Secara Akurat)
CREATE OR REPLACE FUNCTION public.set_conversation_participant_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  IF NEW.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'A customer can only create a conversation for their own account.';
  END IF;

  IF NOT public.is_chat_customer() THEN
    RAISE EXCEPTION 'Only customer accounts can start a consultation.';
  END IF;

  -- 1. Utamakan customer_name yang dikirim saat INSERT jika valid
  IF NEW.customer_name IS NOT NULL
     AND btrim(NEW.customer_name) <> ''
     AND lower(btrim(NEW.customer_name)) <> 'pelanggan' THEN
    v_customer_name := NEW.customer_name;
  END IF;

  -- 2. Jika belum ada, ambil langsung dari tabel auth.users (raw_user_meta_data)
  IF v_customer_name IS NULL OR v_customer_name = '' OR v_customer_name = 'Pelanggan' THEN
    SELECT COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name')
    INTO v_customer_name
    FROM auth.users
    WHERE id = NEW.customer_id;
  END IF;

  -- 3. Jika bukan anonim dan masih kosong, cek ke public.users
  IF (v_customer_name IS NULL OR v_customer_name = '' OR v_customer_name = 'Pelanggan')
     AND COALESCE(auth.jwt()->>'is_anonymous', 'false') <> 'true' THEN
    SELECT u.name
    INTO v_customer_name
    FROM public.users u
    WHERE u.id = NEW.customer_id AND u.role = 'CUSTOMER';
  END IF;

  -- 4. Fallback ke auth.jwt
  IF v_customer_name IS NULL OR v_customer_name = '' OR v_customer_name = 'Pelanggan' THEN
    v_customer_name := auth.jwt()->'user_metadata'->>'name';
  END IF;

  IF v_customer_name IS NULL OR v_customer_name = '' THEN
    v_customer_name := 'Pelanggan';
  END IF;

  NEW.customer_name := regexp_replace(btrim(v_customer_name), '\s+', ' ', 'g');

  SELECT b.name, COALESCE(b.profile_photo, '')
  INTO NEW.barber_name, NEW.barber_photo
  FROM public.barbers b
  JOIN public.users u ON u.id = b.user_id
  WHERE b.user_id = NEW.barber_id
    AND b.account_status = 'ACTIVE'
    AND u.role = 'BARBER';

  IF NEW.barber_name IS NULL THEN
    RAISE EXCEPTION 'The selected barber account is not active or connected.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_conversation_participant_details ON public.conversations;
CREATE TRIGGER set_conversation_participant_details
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_participant_details();

-- 8. Fungsi pembaruan nama display pelanggan
CREATE OR REPLACE FUNCTION public.update_my_chat_display_name(display_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_name TEXT := regexp_replace(btrim(COALESCE(display_name, '')), '\s+', ' ', 'g');
BEGIN
  IF NOT public.is_chat_customer() THEN
    RAISE EXCEPTION 'Only customers can update their consultation display name.';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 60 OR lower(v_name) = 'pelanggan' THEN
    RAISE EXCEPTION 'Display name must be 2–60 characters.';
  END IF;

  UPDATE public.conversations
  SET customer_name = v_name
  WHERE customer_id = auth.uid();

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{name}',
    to_jsonb(v_name)
  )
  WHERE id = auth.uid();
END;
$$;

-- 9. Izin Akses (Permissions & RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.conversations TO authenticated;
GRANT INSERT (customer_id, barber_id, customer_name) ON public.conversations TO authenticated;
GRANT UPDATE (customer_name) ON public.conversations TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT INSERT (conversation_id, sender_id, body) ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_chat_display_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_barber() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_chat_display_name(TEXT) TO authenticated, anon;

-- 10. Perbaiki otomatis semua obrolan yang sempat tertulis 'Pelanggan' atau kosong
UPDATE public.conversations c
SET customer_name = u.raw_user_meta_data->>'name'
FROM auth.users u
WHERE c.customer_id = u.id
  AND (c.customer_name = '' OR c.customer_name = 'Pelanggan' OR c.customer_name IS NULL)
  AND u.raw_user_meta_data->>'name' IS NOT NULL
  AND u.raw_user_meta_data->>'name' <> ''
  AND u.raw_user_meta_data->>'name' <> 'Pelanggan';

-- 11. Setup Background Scheduled Job menggunakan ekstensi pg_cron (didukung Supabase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) OR EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_cleanup_expired_chat_hourly') THEN
        PERFORM cron.unschedule('auto_cleanup_expired_chat_hourly');
      END IF;

      PERFORM cron.schedule(
        'auto_cleanup_expired_chat_hourly',
        '0 * * * *',
        'SELECT public.cleanup_expired_chat_messages(INTERVAL ''1 day'');'
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron auto schedule notice: %', SQLERRM;
    END;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
