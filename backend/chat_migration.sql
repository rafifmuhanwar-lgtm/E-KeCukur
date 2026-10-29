-- Persistent consultation chat for authenticated customers and barber/capster accounts.
-- Apply after the existing Supabase schema setup.

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

CREATE INDEX IF NOT EXISTS conversations_customer_recent_idx
  ON public.conversations (customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_barber_recent_idx
  ON public.conversations (barber_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx
  ON public.conversations (last_message_at);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx
  ON public.conversations (created_at);
CREATE INDEX IF NOT EXISTS messages_conversation_recent_idx
  ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_created_at_idx
  ON public.messages (created_at);

-- Keep anonymous Supabase auth sessions as guest customers, never as barbers.
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
    v_name := COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      CASE WHEN new.is_anonymous THEN 'Pelanggan' ELSE 'Barber E-Cukur' END
    );
    v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
    v_role := CASE
      WHEN new.is_anonymous THEN 'customer'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'barber')
    END;

    v_slug := COALESCE(
      new.raw_user_meta_data->>'slug',
      LOWER(REGEXP_REPLACE(v_name, '[^a-zA-Z0-9]', '', 'g'))
    );
    IF v_slug IS NULL OR v_slug = '' THEN
      v_slug := 'barber-' || SUBSTRING(new.id::text, 1, 6);
    END IF;

    IF EXISTS (SELECT 1 FROM public.barbers WHERE slug = v_slug AND email <> new.email) THEN
      v_slug := v_slug || '-' || SUBSTRING(new.id::text, 1, 4);
    END IF;

    v_photo := COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      ''
    );

    IF NOT new.is_anonymous THEN
      INSERT INTO public.users (id, email, name, role, phone)
      VALUES (new.id, new.email, v_name, UPPER(v_role), v_phone)
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(public.users.name, v_name),
        phone = COALESCE(public.users.phone, v_phone);
    END IF;

    IF LOWER(v_role) = 'barber' AND NOT new.is_anonymous THEN
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

UPDATE public.barbers b
SET user_id = u.id
FROM public.users u
WHERE b.user_id IS NULL
  AND LOWER(b.email) = LOWER(u.email)
  AND u.role = 'BARBER';

CREATE OR REPLACE FUNCTION public.is_chat_customer()
RETURNS BOOLEAN
LANGUAGE SQL
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
LANGUAGE SQL
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

CREATE OR REPLACE FUNCTION public.is_valid_chat_display_name(display_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT := regexp_replace(btrim(COALESCE(display_name, '')), '\s+', ' ', 'g');
  v_name_words TEXT[];
  v_compact_name TEXT;
BEGIN
  IF char_length(v_name) < 2
    OR char_length(v_name) > 60
    OR v_name !~ '^[[:alpha:]][[:alpha:][:space:].''-]*$'
  THEN
    RETURN FALSE;
  END IF;

  SELECT ARRAY_AGG(
    regexp_replace(
      translate(lower(token), '013457@$!', 'oieastasi'),
      '[^[:alnum:]]',
      '',
      'g'
    )
  )
  INTO v_name_words
  FROM unnest(regexp_split_to_array(lower(v_name), '\s+')) AS words(token);
  v_compact_name := array_to_string(v_name_words, '');

  IF v_name_words && ARRAY[
    'abc', 'admin', 'anjing', 'anonymous', 'apple', 'asdf', 'ayam', 'bakso',
    'bantal', 'batu', 'benda', 'besi', 'bird', 'book', 'botol', 'bowl', 'chair',
    'charger', 'chicken', 'coba', 'computer', 'cow', 'cup', 'dog', 'fish', 'gelas',
    'goat', 'handphone', 'hello', 'ikan', 'kambing', 'kayu', 'keyboard', 'kelinci',
    'kertas', 'kursi', 'kucing', 'lampu', 'laptop', 'meja', 'mie', 'monitor',
    'monyet', 'mouse', 'mobil', 'motor', 'nasi', 'nama', 'orang', 'panda',
    'pelanggan', 'pintu', 'piring', 'plastik', 'phone', 'qwerty', 'rabbit', 'random',
    'roti', 'sapi', 'sendok', 'sepatu', 'table', 'tas', 'telur', 'test', 'testing',
    'tiger', 'tikus', 'wkwk'
  ]::TEXT[] THEN
    RETURN FALSE;
  END IF;

  IF v_name_words && ARRAY[
    'ass', 'arse', 'asshole', 'bastard', 'bitch', 'bitches', 'bullshit', 'cock',
    'cocksucker', 'crap', 'cunt', 'dick', 'dicks', 'dickhead', 'fuck', 'fucker',
    'fucking', 'motherfucker', 'piss', 'pussy', 'shit', 'shitty', 'slut', 'whore',
    'wtf', 'stfu', 'gtfo', 'lmfao', 'fml', 'ffs', 'bullsh', 'mofo', 'mf', 'smd',
    'kys', 'pos', 'sob', 'ajg', 'anjg', 'asu', 'bajingan', 'bangsat', 'bgsat',
    'bngst', 'brengsek', 'gblk', 'goblok', 'janc', 'jancuk', 'jancok', 'kampret',
    'keparat', 'kntl', 'kontl', 'kontol', 'memek', 'memk', 'mmk', 'ngewe', 'ngentot',
    'ngntd', 'ngntt', 'tai', 'tahi', 'tll', 'tolol'
  ]::TEXT[] THEN
    RETURN FALSE;
  END IF;

  IF v_compact_name = ANY(ARRAY[
    'fuckyou', 'fuckoff', 'fucky', 'shithead', 'bullshit', 'wtf', 'stfu', 'gtfo'
  ]::TEXT[]) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_name_words) AS words(word)
    WHERE char_length(word) >= 3 AND word !~ '[aeiouy]'
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM unnest(v_name_words) AS words(word)
    WHERE word ~ '^(.{2,})\1+$'
       OR word ~ '(qwerty|asdf|zxcv|hjkl|poiuy|lkjhg)'
  )
  AND regexp_replace(v_name, '\s', '', 'g') !~ '^(.)\1{2,}$';
END;
$$;

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

  -- Pembersihan berkala otomatis (retensi 24 jam / 1 hari)
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

CREATE OR REPLACE FUNCTION public.mark_conversation_read(conversation_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_barber_id UUID;
BEGIN
  SELECT customer_id, barber_id
  INTO v_customer_id, v_barber_id
  FROM public.conversations
  WHERE id = conversation_uuid;

  IF NOT FOUND OR auth.uid() NOT IN (v_customer_id, v_barber_id) THEN
    RAISE EXCEPTION 'Conversation not found or access denied.';
  END IF;

  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = conversation_uuid
    AND sender_id <> auth.uid()
    AND read_at IS NULL;

  UPDATE public.conversations
  SET customer_unread_count = CASE WHEN customer_id = auth.uid() THEN 0 ELSE customer_unread_count END,
      barber_unread_count = CASE WHEN barber_id = auth.uid() THEN 0 ELSE barber_unread_count END
  WHERE id = conversation_uuid;
END;
$$;

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

-- Pembersihan otomatis pesan & obrolan kadaluarsa (> 1 hari / 24 jam)
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

  -- 1. Hapus pesan yang sudah lebih dari 24 jam
  WITH del_m AS (
    DELETE FROM public.messages
    WHERE created_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_messages FROM del_m;

  -- 2. Hapus percakapan yang sudah lebih dari 24 jam tidak ada aktivitas pesan baru
  WITH del_c AS (
    DELETE FROM public.conversations
    WHERE (
      last_message_at < v_cutoff
      OR (last_message_at IS NULL AND created_at < v_cutoff)
    )
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_conversations FROM del_c;

  -- 3. Hapus akun tamu anonim (is_anonymous = true) yang dibuat lebih dari 24 jam lalu
  --    agar tabel auth.users Supabase tetap bersih tanpa penumpukan ID tamu lama.
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

CREATE OR REPLACE FUNCTION public.cleanup_expired_chat()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.cleanup_expired_chat_messages(INTERVAL '1 day');
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can read conversations" ON public.conversations;
CREATE POLICY "Chat participants can read conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    (customer_id = auth.uid() AND public.is_chat_customer())
    OR (barber_id = auth.uid() AND public.is_chat_barber())
  );

DROP POLICY IF EXISTS "Customers can create their own conversations" ON public.conversations;
CREATE POLICY "Customers can create their own conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND public.is_chat_customer()
    AND EXISTS (
      SELECT 1
      FROM public.barbers b
      JOIN public.users u ON u.id = b.user_id
      WHERE b.user_id = barber_id
        AND b.account_status = 'ACTIVE'
        AND u.role = 'BARBER'
    )
  );

DROP POLICY IF EXISTS "Chat participants can read messages" ON public.messages;
CREATE POLICY "Chat participants can read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (c.customer_id = auth.uid() AND public.is_chat_customer())
          OR (c.barber_id = auth.uid() AND public.is_chat_barber())
        )
    )
  );

DROP POLICY IF EXISTS "Participants can send messages as themselves" ON public.messages;
CREATE POLICY "Participants can send messages as themselves"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (c.customer_id = auth.uid() AND public.is_chat_customer())
          OR (c.barber_id = auth.uid() AND public.is_chat_barber())
        )
    )
  );

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.customer_id = auth.uid() OR c.barber_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.customer_id = auth.uid() OR c.barber_id = auth.uid())
    )
  );

-- A previous setup policy granted anonymous and authenticated users unrestricted
-- writes to barber identities. Keep public profile reads but protect user_id links.
DROP POLICY IF EXISTS "Public can do all on barbers" ON public.barbers;
DROP POLICY IF EXISTS "Public can view active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Public can view barbers" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can create their own profile" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can update their own profile" ON public.barbers;
DROP POLICY IF EXISTS "Barbers can delete their own profile" ON public.barbers;
CREATE POLICY "Public can view barbers"
  ON public.barbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Barbers can create their own profile"
  ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'BARBER'
    )
  );
CREATE POLICY "Barbers can update their own profile"
  ON public.barbers FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'BARBER')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'BARBER')
  );
CREATE POLICY "Barbers can delete their own profile"
  ON public.barbers FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'BARBER')
  );

-- The auth trigger owns public.users writes; callers may still read profile rows
-- for existing booking screens, but cannot change the role used by chat policies.
DROP POLICY IF EXISTS "Public can do all on users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
CREATE POLICY "Authenticated users can read users"
  ON public.users FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.users FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.conversations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.conversations TO authenticated;
GRANT INSERT (customer_id, barber_id, customer_name) ON public.conversations TO authenticated;
GRANT UPDATE (customer_name) ON public.conversations TO authenticated;
REVOKE ALL ON public.messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT INSERT (conversation_id, sender_id, body) ON public.messages TO authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
REVOKE ALL ON FUNCTION public.is_chat_customer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_chat_barber() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_valid_chat_display_name(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_barber() TO authenticated;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.update_my_chat_display_name(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_chat_display_name(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_chat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat_messages(INTERVAL) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_chat() TO authenticated, anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END;
$$;

-- Setup pembersihan otomatis per jam jika ekstensi pg_cron tersedia
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

-- Dukungan fitur media, voice note, quote reply, dan emoji reactions
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_body_check;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration NUMERIC;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
