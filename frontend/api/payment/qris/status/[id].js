import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const refId = req.query.id || req.query.referenceId;
  if (!refId) {
    return res.status(400).json({ success: false, message: 'Missing reference ID' });
  }

  try {
    // 1. Cek tabel qris_payments
    try {
      const { data: qrisRow } = await supabase
        .from('qris_payments')
        .select('*')
        .eq('reference_id', refId)
        .maybeSingle();

      if (qrisRow) {
        return res.status(200).json({
          success: true,
          status: qrisRow.status,
          paidAt: qrisRow.paid_at,
          totalAmount: qrisRow.total_amount,
          type: qrisRow.type,
          bookingId: qrisRow.booking_id
        });
      }
    } catch (e) {
      // qris_payments table may not exist yet
    }

    // 2. Fallback cek ke tabel bookings
    try {
      const { data: bookingRow } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', refId)
        .maybeSingle();

      if (bookingRow) {
        const isPaid = bookingRow.payment_status === 'PAID';
        return res.status(200).json({
          success: true,
          status: isPaid ? 'PAID' : 'PENDING',
          paymentStatus: bookingRow.payment_status,
          bookingStatus: bookingRow.booking_status,
          totalPrice: bookingRow.total_price
        });
      }
    } catch (e) {}

    // Default response jika belum ditemukan
    return res.status(200).json({
      success: true,
      status: 'PENDING',
      message: 'Menunggu notifikasi pembayaran masuk'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

