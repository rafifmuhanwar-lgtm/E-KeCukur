BEGIN;

ALTER TABLE public.qris_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select qris_payments" ON public.qris_payments;
DROP POLICY IF EXISTS "Allow public insert qris_payments" ON public.qris_payments;
DROP POLICY IF EXISTS "Allow public update qris_payments" ON public.qris_payments;

REVOKE ALL ON TABLE public.qris_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.qris_payments TO authenticated;

CREATE POLICY "Staff can read QRIS payment logs"
  ON public.qris_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users AS u
      WHERE u.id = auth.uid()
        AND UPPER(u.role) IN ('STAFF', 'ADMIN')
    )
  );

UPDATE public.qris_payments
SET status = 'EXPIRED',
    updated_at = NOW()
WHERE status = 'PENDING'
  AND (expires_at IS NULL OR expires_at <= NOW());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.qris_payments
    WHERE status = 'PENDING'
    GROUP BY total_amount
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Resolve duplicate pending qris_payments.total_amount rows before applying the unique index';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS qris_payments_pending_total_amount_uidx
  ON public.qris_payments (total_amount)
  WHERE status = 'PENDING';

CREATE OR REPLACE FUNCTION public.process_qris_payment_webhook(
  p_total_amount NUMERIC,
  p_raw_notification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.qris_payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_barber_id UUID;
  v_tip_item JSONB;
  v_booking_count INTEGER;
BEGIN
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.qris_payments
  WHERE status = 'PENDING'
    AND total_amount = p_total_amount
    AND expires_at > NOW()
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE public.qris_payments
    SET status = 'PAID',
        paid_at = NOW(),
        raw_notification = LEFT(p_raw_notification, 4000),
        updated_at = NOW()
    WHERE id = v_payment.id
    RETURNING * INTO v_payment;

    IF v_payment.booking_id IS NOT NULL THEN
      IF v_payment.booking_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid booking reference on QRIS payment' USING ERRCODE = '22023';
      END IF;

      UPDATE public.bookings
      SET booking_status = 'CONFIRMED',
          payment_status = 'PAID',
          payment_method = 'QRIS'
      WHERE id = v_payment.booking_id::UUID
        AND booking_status = 'PENDING_PAYMENT';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking is no longer pending payment' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF v_payment.type = 'TIP'
      AND v_payment.barber_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_barber_id := v_payment.barber_id::UUID;
      v_tip_item := JSONB_BUILD_OBJECT(
        'id', 'tip-' || v_payment.id::TEXT,
        'date', NOW(),
        'customerName', COALESCE(v_payment.customer_name, 'Pelanggan Setia'),
        'amount', COALESCE(v_payment.base_amount, v_payment.total_amount),
        'coffeeLabel', 'Kopi',
        'message', 'Tip masuk via QRIS Listener',
        'method', 'Payment Gateway QRIS'
      );

      UPDATE public.barbers
      SET tip_balance = COALESCE(tip_balance, 0) + COALESCE(v_payment.base_amount, v_payment.total_amount),
          tips_history = JSONB_BUILD_ARRAY(v_tip_item) || COALESCE(tips_history, '[]'::JSONB)
      WHERE id = v_barber_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Tip recipient was not found' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
      'source', 'QRIS_PAYMENT',
      'payment', TO_JSONB(v_payment)
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.qris_payments
    WHERE total_amount = p_total_amount
      AND status IN ('PENDING', 'PAID')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
  INTO v_booking_count
  FROM public.bookings
  WHERE booking_status = 'PENDING_PAYMENT'
    AND payment_method = 'QRIS'
    AND total_price = p_total_amount;

  IF v_booking_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE booking_status = 'PENDING_PAYMENT'
    AND payment_method = 'QRIS'
    AND total_price = p_total_amount
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.bookings
  SET booking_status = 'CONFIRMED',
      payment_status = 'PAID',
      payment_method = 'QRIS'
  WHERE id = v_booking.id
    AND booking_status = 'PENDING_PAYMENT';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'source', 'LEGACY_BOOKING',
    'booking', JSONB_BUILD_OBJECT(
      'id', v_booking.id,
      'customer_name', v_booking.customer_name,
      'barber_name', v_booking.barber_name,
      'service_name', v_booking.service_name,
      'total_price', v_booking.total_price
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_qris_payment_webhook(NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_qris_payment_webhook(NUMERIC, TEXT)
  TO service_role;

COMMIT;
