-- Restrict direct booking-table access while preserving ticket and staff flows.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_booking_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
      'rafif.muh.anwar@gmail.com',
      'shvadiaz38@gmail.com'
    )
    OR EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = auth.uid()
        AND UPPER(BTRIM(u.role)) IN ('STAFF', 'ADMIN')
    );
$$;

REVOKE ALL ON FUNCTION public.is_booking_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_booking_staff() TO authenticated;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
  LOOP
    EXECUTE FORMAT('DROP POLICY %I ON public.bookings', v_policy.policyname);
  END LOOP;
END;
$$;

REVOKE ALL ON TABLE public.bookings FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bookings FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.bookings TO authenticated;

CREATE POLICY "Bookings are readable by owner and staff"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR public.is_booking_staff()
  OR EXISTS (
    SELECT 1
    FROM public.barbers AS b
    WHERE b.id = bookings.barber_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Bookings are deletable by staff"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.is_booking_staff());

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.booking_status_history FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_booking_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  IF NEW.booking_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL
    OR NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Invalid booking schedule' USING ERRCODE = '22023';
  END IF;

  v_lock_key := hashtextextended(
    COALESCE(NEW.barber_id::TEXT, '') || '|' ||
    LOWER(BTRIM(COALESCE(NEW.barber_name, ''))) || '|' ||
    NEW.booking_date::TEXT,
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1
    FROM public.bookings AS existing
    WHERE existing.barber_id IS NOT DISTINCT FROM NEW.barber_id
      AND LOWER(BTRIM(COALESCE(existing.barber_name, ''))) =
          LOWER(BTRIM(COALESCE(NEW.barber_name, '')))
      AND existing.booking_date = NEW.booking_date
      AND UPPER(COALESCE(existing.booking_status, 'CONFIRMED')) NOT IN (
        'CANCELLED', 'EXPIRED', 'COMPLETED'
      )
      AND NEW.start_time < COALESCE(existing.end_time, existing.start_time + INTERVAL '45 minutes')
      AND NEW.end_time > existing.start_time
  ) THEN
    RAISE EXCEPTION 'Selected capster slot is no longer available' USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_reserve_slot ON public.bookings;
CREATE TRIGGER bookings_reserve_slot
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.reserve_booking_slot();

CREATE OR REPLACE FUNCTION public.get_public_booking_availability(
  p_barber_id UUID,
  p_booking_date DATE,
  p_barber_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  barber_id UUID,
  barber_name TEXT,
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  booking_status TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    b.barber_id,
    b.barber_name,
    b.booking_date,
    b.start_time,
    b.end_time,
    b.booking_status
  FROM public.bookings AS b
  WHERE b.barber_id IS NOT DISTINCT FROM p_barber_id
    AND b.booking_date = p_booking_date
    AND (
      p_barber_name IS NULL
      OR LOWER(BTRIM(COALESCE(b.barber_name, ''))) = LOWER(BTRIM(p_barber_name))
    )
    AND UPPER(COALESCE(b.booking_status, 'CONFIRMED')) NOT IN (
      'CANCELLED', 'EXPIRED', 'COMPLETED'
    );
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_availability(UUID, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_availability(UUID, DATE, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_booking_tracking(
  p_booking_id UUID,
  p_ticket_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'booking',
    JSONB_BUILD_OBJECT(
      'id', b.id,
      'customerName', b.customer_name,
      'customerPhone', b.customer_phone,
      'barberId', b.barber_id,
      'barberName', b.barber_name,
      'serviceName', b.service_name,
      'date', b.booking_date,
      'startTime', b.start_time,
      'endTime', b.end_time,
      'status', b.booking_status,
      'paymentMethod', b.payment_method,
      'paymentStatus', b.payment_status,
      'price', b.total_price,
      'createdAt', b.created_at,
      'updatedAt', b.updated_at
    ),
    'history',
    COALESCE((
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'previousStatus', h.previous_status,
          'newStatus', h.new_status,
          'changedAt', h.changed_at,
          'notes', h.notes
        )
        ORDER BY h.changed_at ASC
      )
      FROM public.booking_status_history AS h
      WHERE h.booking_id = b.id
    ), '[]'::JSONB)
  )
  INTO v_result
  FROM public.bookings AS b
  WHERE b.id = p_booking_id
    AND (
      (
        b.ticket_token_hash IS NOT NULL
        AND p_ticket_token IS NOT NULL
        AND b.ticket_token_hash = ENCODE(
          DIGEST(CONVERT_TO(p_ticket_token, 'UTF8'), 'sha256'),
          'hex'
        )
      )
      OR public.is_booking_staff()
      OR b.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.barbers AS barber
        WHERE barber.id = b.barber_id
          AND barber.user_id = auth.uid()
      )
    );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_booking_tracking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_allowed BOOLEAN;
  v_barber_owner BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.barbers
    WHERE id = v_booking.barber_id
      AND user_id = auth.uid()
  )
  INTO v_barber_owner;

  IF NOT public.is_booking_staff() AND NOT v_barber_owner THEN
    RAISE EXCEPTION 'Not authorized to update booking status' USING ERRCODE = '42501';
  END IF;

  IF p_new_status IS NULL THEN
    RAISE EXCEPTION 'Booking status is required' USING ERRCODE = '22023';
  END IF;

  v_allowed := CASE v_booking.booking_status
    WHEN 'PENDING_PAYMENT' THEN p_new_status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED')
    WHEN 'PENDING_CONFIRMATION' THEN p_new_status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED')
    WHEN 'CONFIRMED' THEN p_new_status IN ('COMPLETED', 'CANCELLED')
    WHEN 'WAITING' THEN p_new_status IN ('IN_SERVICE', 'COMPLETED', 'CANCELLED')
    WHEN 'ARRIVED' THEN p_new_status IN ('IN_SERVICE', 'COMPLETED', 'CANCELLED')
    WHEN 'IN_SERVICE' THEN p_new_status = 'COMPLETED'
    ELSE FALSE
  END;

  IF v_allowed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Invalid booking status transition' USING ERRCODE = '22023';
  END IF;

  IF v_booking.booking_status IN ('PENDING_PAYMENT', 'PENDING_CONFIRMATION')
    AND p_new_status = 'CONFIRMED'
    AND v_booking.payment_method = 'QRIS'
    AND v_booking.payment_status IS DISTINCT FROM 'PAID' THEN
    RAISE EXCEPTION 'QRIS payment must be verified before confirmation' USING ERRCODE = '42501';
  END IF;

  PERFORM SET_CONFIG(
    'app.booking_status_note',
    COALESCE(NULLIF(BTRIM(p_notes), ''), ''),
    TRUE
  );

  UPDATE public.bookings
  SET booking_status = p_new_status
  WHERE id = p_booking_id;

  RETURN p_new_status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_tracking(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_tracking(UUID, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.update_booking_tracking_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_tracking_status(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_guest_booking_with_ticket(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_barber_id UUID,
  p_barber_name TEXT,
  p_service_id TEXT,
  p_service_name TEXT,
  p_booking_date DATE,
  p_start_time TIME,
  p_payment_method TEXT,
  p_total_price NUMERIC,
  p_ticket_token TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_booking_id UUID;
  v_service_id UUID;
  v_service_name TEXT;
  v_service_price NUMERIC;
  v_duration_minutes INTEGER;
  v_end_time TIME;
  v_barber_name TEXT;
  v_barber_services JSONB;
  v_profile_service JSONB;
  v_lock_key BIGINT;
  v_price_difference NUMERIC;
BEGIN
  IF NULLIF(BTRIM(p_customer_name), '') IS NULL
    OR NULLIF(BTRIM(p_customer_phone), '') IS NULL
    OR p_booking_date IS NULL
    OR p_start_time IS NULL
    OR p_total_price IS NULL
    OR p_total_price <= 0
    OR p_payment_method IS NULL
    OR p_payment_method NOT IN ('CASH', 'QRIS', 'Tunai')
    OR p_ticket_token IS NULL
    OR LENGTH(p_ticket_token) < 32 THEN
    RAISE EXCEPTION 'Invalid booking details' USING ERRCODE = '22023';
  END IF;

  IF p_booking_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE
    OR (
      p_booking_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::DATE
      AND p_start_time <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::TIME
    ) THEN
    RAISE EXCEPTION 'Booking time must be in the future' USING ERRCODE = '22023';
  END IF;

  IF p_barber_id IS NOT NULL THEN
    SELECT name, services
    INTO v_barber_name, v_barber_services
    FROM public.barbers
    WHERE id = p_barber_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected barbershop is not available' USING ERRCODE = '22023';
    END IF;

    SELECT service.value
    INTO v_profile_service
    FROM JSONB_ARRAY_ELEMENTS(
      CASE
        WHEN JSONB_TYPEOF(v_barber_services) = 'array' THEN v_barber_services
        ELSE '[]'::JSONB
      END
    ) AS service(value)
    WHERE service.value ->> 'id' = p_service_id
      AND COALESCE(
        NULLIF(service.value ->> 'is_active', '')::BOOLEAN,
        NULLIF(service.value ->> 'active', '')::BOOLEAN,
        TRUE
      )
    LIMIT 1;

    IF v_profile_service IS NULL THEN
      RAISE EXCEPTION 'Selected service is not offered by this barbershop' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_service_id IS NOT NULL
    AND p_service_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_service_id := p_service_id::UUID;
    SELECT name, price, duration_minutes
    INTO v_service_name, v_service_price, v_duration_minutes
    FROM public.services
    WHERE id = v_service_id
      AND is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected service is unavailable' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_service_price IS NULL
    AND v_profile_service IS NOT NULL
    AND NOT COALESCE(
      p_service_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      FALSE
    ) THEN
    v_service_name := NULLIF(BTRIM(v_profile_service ->> 'name'), '');
    v_service_price := NULLIF(v_profile_service ->> 'price', '')::NUMERIC;
    IF COALESCE(v_profile_service ->> 'duration_minutes', '') ~ '^[0-9]+$' THEN
      v_duration_minutes := (v_profile_service ->> 'duration_minutes')::INTEGER;
    ELSIF REGEXP_REPLACE(COALESCE(v_profile_service ->> 'duration', ''), '[^0-9]', '', 'g') <> '' THEN
      v_duration_minutes := REGEXP_REPLACE(v_profile_service ->> 'duration', '[^0-9]', '', 'g')::INTEGER;
    END IF;
  END IF;

  IF v_service_name IS NULL OR v_service_price IS NULL
    OR v_duration_minutes IS NULL OR v_duration_minutes <= 0
    OR v_service_price <= 0 THEN
    RAISE EXCEPTION 'Selected service is unavailable or invalid' USING ERRCODE = '22023';
  END IF;

  v_price_difference := p_total_price - v_service_price;
  IF (p_payment_method IN ('CASH', 'Tunai') AND v_price_difference <> 0)
    OR (p_payment_method = 'QRIS' AND (
      v_price_difference < 0
      OR (v_price_difference <> 0 AND v_price_difference NOT BETWEEN 100 AND 998)
    )) THEN
    RAISE EXCEPTION 'Booking total does not match the selected service price' USING ERRCODE = '22023';
  END IF;

  v_end_time := p_start_time + MAKE_INTERVAL(mins => v_duration_minutes);
  IF v_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Booking cannot end on the following day' USING ERRCODE = '22023';
  END IF;

  v_barber_name := COALESCE(NULLIF(BTRIM(v_barber_name), ''), NULLIF(BTRIM(p_barber_name), ''));
  v_lock_key := HASHTEXTEXTENDED(
    COALESCE(p_barber_id::TEXT, '') || '|' ||
    LOWER(BTRIM(COALESCE(v_barber_name, ''))) || '|' ||
    p_booking_date::TEXT,
    0
  );
  PERFORM PG_ADVISORY_XACT_LOCK(v_lock_key);

  IF EXISTS (
    SELECT 1
    FROM public.bookings AS existing
    WHERE existing.barber_id IS NOT DISTINCT FROM p_barber_id
      AND LOWER(BTRIM(COALESCE(existing.barber_name, ''))) =
          LOWER(BTRIM(COALESCE(v_barber_name, '')))
      AND existing.booking_date = p_booking_date
      AND UPPER(COALESCE(existing.booking_status, 'CONFIRMED')) NOT IN (
        'CANCELLED', 'EXPIRED', 'COMPLETED'
      )
      AND p_start_time < COALESCE(
        existing.end_time,
        existing.start_time + MAKE_INTERVAL(mins => 45)
      )
      AND v_end_time > existing.start_time
  ) THEN
    RAISE EXCEPTION 'Selected capster slot is no longer available' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.bookings (
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    barber_id,
    barber_name,
    service_id,
    service_name,
    booking_date,
    start_time,
    end_time,
    booking_status,
    payment_method,
    payment_status,
    total_price,
    booking_source,
    ticket_token_hash
  )
  VALUES (
    (SELECT u.id FROM public.users AS u WHERE u.id = auth.uid()),
    BTRIM(p_customer_name),
    BTRIM(p_customer_phone),
    NULLIF(BTRIM(p_customer_email), ''),
    p_barber_id,
    v_barber_name,
    v_service_id,
    v_service_name,
    p_booking_date,
    p_start_time,
    v_end_time,
    CASE WHEN p_payment_method = 'QRIS' THEN 'PENDING_PAYMENT' ELSE 'CONFIRMED' END,
    CASE WHEN p_payment_method = 'QRIS' THEN 'QRIS' ELSE 'CASH' END,
    'UNPAID',
    p_total_price,
    'ONLINE',
    ENCODE(DIGEST(CONVERT_TO(p_ticket_token, 'UTF8'), 'sha256'), 'hex')
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_booking_with_ticket(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guest_booking_with_ticket(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT
) TO anon, authenticated;

COMMIT;
