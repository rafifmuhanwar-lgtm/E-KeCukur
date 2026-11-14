-- Additive booking tracking migration.
-- Review and apply in a non-production Supabase project first.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_source TEXT,
  ADD COLUMN IF NOT EXISTS ticket_token_hash TEXT;

UPDATE public.bookings
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN booking_source SET DEFAULT 'ONLINE';

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_status_check
  CHECK (
    booking_status IS NULL OR booking_status IN (
      'PENDING_CONFIRMATION',
      'PENDING_PAYMENT',
      'CONFIRMED',
      'WAITING',
      'ARRIVED',
      'IN_SERVICE',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED'
    )
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_source_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_source_check
  CHECK (booking_source IS NULL OR booking_source IN ('ONLINE', 'WALK_IN'));

CREATE UNIQUE INDEX IF NOT EXISTS bookings_ticket_token_hash_uidx
  ON public.bookings (ticket_token_hash)
  WHERE ticket_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_barber_schedule_idx
  ON public.bookings (barber_id, booking_date, start_time);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_status_history_booking_changed_idx
  ON public.booking_status_history (booking_id, changed_at DESC);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_booking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_updated_at();

CREATE OR REPLACE FUNCTION public.capture_booking_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.booking_status IS NOT NULL THEN
    INSERT INTO public.booking_status_history (
      booking_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    VALUES (
      NEW.id,
      NULL,
      NEW.booking_status,
      (SELECT u.id FROM public.users AS u WHERE u.id = auth.uid()),
      'Status awal'
    );
  ELSIF TG_OP = 'UPDATE'
    AND NEW.booking_status IS DISTINCT FROM OLD.booking_status
    AND NEW.booking_status IS NOT NULL THEN
    INSERT INTO public.booking_status_history (
      booking_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    VALUES (
      NEW.id,
      OLD.booking_status,
      NEW.booking_status,
      (SELECT u.id FROM public.users AS u WHERE u.id = auth.uid()),
      NULLIF(current_setting('app.booking_status_note', TRUE), '')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_capture_status_history ON public.bookings;
CREATE TRIGGER bookings_capture_status_history
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.capture_booking_status_history();

INSERT INTO public.booking_status_history (
  booking_id,
  previous_status,
  new_status,
  changed_by,
  notes,
  changed_at
)
SELECT
  b.id,
  NULL,
  b.booking_status,
  NULL,
  'Status saat tracking diaktifkan',
  COALESCE(b.created_at, NOW())
FROM public.bookings AS b
WHERE b.booking_status IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.booking_status_history AS h
    WHERE h.booking_id = b.id
  );

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
  v_duration_minutes INTEGER;
  v_end_time TIME;
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

  IF p_service_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_service_id := p_service_id::UUID;
    SELECT duration_minutes
    INTO v_duration_minutes
    FROM public.services
    WHERE id = v_service_id
      AND is_active = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected service is unavailable' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_duration_minutes := 45;
  END IF;

  IF v_duration_minutes IS NULL OR v_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Selected service has an invalid duration' USING ERRCODE = '22023';
  END IF;

  v_end_time := p_start_time + MAKE_INTERVAL(mins => v_duration_minutes);
  IF v_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Booking cannot end on the following day' USING ERRCODE = '22023';
  END IF;

  IF p_barber_id IS NOT NULL THEN
    PERFORM 1
    FROM public.barbers
    WHERE id = p_barber_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected barbershop is not available' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bookings AS existing
    WHERE existing.barber_id IS NOT DISTINCT FROM p_barber_id
      AND LOWER(BTRIM(COALESCE(existing.barber_name, ''))) =
          LOWER(BTRIM(COALESCE(p_barber_name, '')))
      AND existing.booking_date = p_booking_date
      AND COALESCE(existing.booking_status, 'CONFIRMED') NOT IN (
        'CANCELLED',
        'EXPIRED',
        'COMPLETED'
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
    NULLIF(BTRIM(p_barber_name), ''),
    v_service_id,
    NULLIF(BTRIM(p_service_name), ''),
    p_booking_date,
    p_start_time,
    v_end_time,
    CASE WHEN p_payment_method = 'QRIS' THEN 'PENDING_PAYMENT' ELSE 'CONFIRMED' END,
    p_payment_method,
    'UNPAID',
    p_total_price,
    'ONLINE',
    ENCODE(DIGEST(CONVERT_TO(p_ticket_token, 'UTF8'), 'sha256'), 'hex')
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

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
      OR (
        b.ticket_token_hash IS NULL
        AND p_ticket_token IS NULL
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
  v_actor UUID := auth.uid();
  v_actor_role TEXT;
  v_booking public.bookings%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT UPPER(role)
  INTO v_actor_role
  FROM public.users
  WHERE id = v_actor;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Account role could not be verified' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_actor_role = 'BARBER' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.barbers
      WHERE id = v_booking.barber_id
        AND user_id = v_actor
    ) THEN
      RAISE EXCEPTION 'Not authorized for this booking' USING ERRCODE = '42501';
    END IF;
  ELSIF v_actor_role NOT IN ('STAFF', 'ADMIN') THEN
    RAISE EXCEPTION 'Not authorized to update booking status' USING ERRCODE = '42501';
  END IF;

  v_allowed := CASE v_booking.booking_status
    WHEN 'PENDING_PAYMENT' THEN p_new_status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED')
    WHEN 'PENDING_CONFIRMATION' THEN p_new_status IN ('CONFIRMED', 'CANCELLED', 'EXPIRED')
    WHEN 'CONFIRMED' THEN p_new_status IN ('WAITING', 'ARRIVED', 'IN_SERVICE', 'CANCELLED')
    WHEN 'WAITING' THEN p_new_status IN ('IN_SERVICE', 'CANCELLED')
    WHEN 'ARRIVED' THEN p_new_status IN ('IN_SERVICE', 'CANCELLED')
    WHEN 'IN_SERVICE' THEN p_new_status = 'COMPLETED'
    ELSE FALSE
  END;

  IF v_allowed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Invalid booking status transition' USING ERRCODE = '22023';
  END IF;

  IF p_new_status IS NULL THEN
    RAISE EXCEPTION 'Booking status is required' USING ERRCODE = '22023';
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

REVOKE ALL ON FUNCTION public.create_guest_booking_with_ticket(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_booking_with_ticket(
  TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, DATE, TIME, TEXT, NUMERIC, TEXT
) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_booking_tracking(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_tracking(UUID, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_booking_tracking_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking_tracking_status(UUID, TEXT, TEXT) TO authenticated;

COMMIT;
