-- ========================================================================
-- RETENSI CHAT 24 JAM (AUTOMATIC DISAPPEARING CHAT CLEANUP)
-- E-KeCukur Chat Management
--
-- File: backend/chat_retention_24h.sql
-- Tujuan: Menghapus secara otomatis pesan & obrolan yang sudah lewat 24 jam (1 hari)
--         agar database Supabase tidak pernah kepenuhan (hemat kuota & ruang penyimpanan).
-- ========================================================================

-- 1. Buat index tambahan agar query pencarian & penghapusan data kadaluarsa berjalan secepat kilat (sub-milidetik)
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
  ON public.conversations (last_message_at);

CREATE INDEX IF NOT EXISTS conversations_created_at_idx
  ON public.conversations (created_at);


-- 2. Fungsi pembersihan chat yang kadaluarsa (> 1 hari / 24 jam)
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

  -- A. Hapus semua pesan yang dibuat lebih dari 24 jam lalu
  WITH del_m AS (
    DELETE FROM public.messages
    WHERE created_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_messages FROM del_m;

  -- B. Hapus percakapan yang sudah lebih dari 24 jam tidak ada pesan baru,
  --    atau percakapan baru yang tidak ada aktivitas pesan dalam 24 jam.
  --    (Catatan: Jika ada percakapan dihapus, relasi ON DELETE CASCADE akan membersihkan sisa pesan terkait secara otomatis)
  WITH del_c AS (
    DELETE FROM public.conversations
    WHERE (
      last_message_at < v_cutoff
      OR (last_message_at IS NULL AND created_at < v_cutoff)
    )
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_conversations FROM del_c;

  -- C. Hapus akun tamu anonim (is_anonymous = true) yang dibuat lebih dari 24 jam lalu
  --    agar tabel auth.users Supabase tetap bersih tanpa penumpukan ID tamu lama.
  --    Relasi ON DELETE CASCADE juga otomatis menyapu sisa data relasinya jika ada.
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


-- 3. Shortcut RPC function yang dapat dipanggil langsung dari client / frontend / cron
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.cleanup_expired_chat_messages(INTERVAL '1 day');
$$;


-- 4. Berikan izin eksekusi kepada authenticated user & anon
REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat() TO authenticated, anon;


-- 5. Perbarui trigger agar setiap ada pesan baru atau aksi baca, sistem secara oportunitis
--    membersihkan chat kadaluarsa di latar belakang (tanpa membebani performa)
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

  -- Opportunistic cleanup: bersihkan pesan & percakapan > 24 jam jika ada
  BEGIN
    PERFORM public.cleanup_expired_chat_messages(INTERVAL '1 day');
  EXCEPTION WHEN OTHERS THEN
    -- Jangan gagalkan insert pesan jika cleanup menemui kendala
    NULL;
  END;

  RETURN NEW;
END;
$$;


-- 6. Setup Background Scheduled Job menggunakan ekstensi pg_cron (didukung Supabase)
--    Menjalankan pembersihan otomatis setiap 1 jam, bahkan jika tidak ada pengguna yang sedang online.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) OR EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

      -- Hapus schedule lama jika ada untuk mencegah duplikasi
      IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto_cleanup_expired_chat_hourly') THEN
        PERFORM cron.unschedule('auto_cleanup_expired_chat_hourly');
      END IF;

      -- Jadwalkan cleanup setiap jam (menit ke-0)
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

-- 7. Perbaikan Bug Nama Pelanggan: Pastikan trigger membaca langsung dari auth.users
--    (bukan dari stale JWT) dan menerima customer_name dari client saat pertama konsultasi
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
  IF public.is_valid_chat_display_name(NEW.customer_name) THEN
    v_customer_name := NEW.customer_name;
  END IF;

  -- 2. Jika belum valid, ambil langsung dari tabel auth.users (raw_user_meta_data)
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

  -- 5. Jika masih kosong, beri fallback aman
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

-- 8. Fungsi pembaruan nama display pelanggan: mengupdate conversations DAN auth.users
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

  IF NOT public.is_valid_chat_display_name(v_name) THEN
    RAISE EXCEPTION 'Display name must be 2–60 characters and cannot contain numbers or inappropriate language.';
  END IF;

  -- Update nama pelanggan di tabel conversations
  UPDATE public.conversations
  SET customer_name = v_name
  WHERE customer_id = auth.uid();

  -- Update juga di auth.users raw_user_meta_data agar sinkron
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{name}',
    to_jsonb(v_name)
  )
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_chat_display_name(TEXT) TO authenticated;
GRANT INSERT (customer_id, barber_id, customer_name) ON public.conversations TO authenticated;
GRANT UPDATE (customer_name) ON public.conversations TO authenticated;

-- Perbaiki otomatis semua percakapan yang saat ini masih bertuliskan 'Pelanggan' atau kosong
UPDATE public.conversations c
SET customer_name = u.raw_user_meta_data->>'name'
FROM auth.users u
WHERE c.customer_id = u.id
  AND (c.customer_name = '' OR c.customer_name = 'Pelanggan' OR c.customer_name IS NULL)
  AND u.raw_user_meta_data->>'name' IS NOT NULL
  AND u.raw_user_meta_data->>'name' <> ''
  AND u.raw_user_meta_data->>'name' <> 'Pelanggan';

NOTIFY pgrst, 'reload schema';
