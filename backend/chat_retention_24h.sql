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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_messages INT := 0;
  v_deleted_conversations INT := 0;
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

  RETURN jsonb_build_object(
    'success', true,
    'deleted_messages', v_deleted_messages,
    'deleted_conversations', v_deleted_conversations,
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

NOTIFY pgrst, 'reload schema';
