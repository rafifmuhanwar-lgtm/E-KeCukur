import { getSupabaseAdmin } from '../supabaseAdmin.js';

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
    const supabase = getSupabaseAdmin();
    // 1. Cek tabel qris_payments
    const { data: qrisRow, error: paymentError } = await supabase
      .from('qris_payments')
      .select('status, paid_at, total_amount, type, booking_id')
      .eq('reference_id', refId)
      .maybeSingle();
    if (paymentError) throw paymentError;

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

    // 2. Fallback cek ke tabel bookings
    const { data: bookingRow, error: bookingError } = await supabase
      .from('bookings')
      .select('payment_status, booking_status, total_price')
      .eq('id', refId)
      .maybeSingle();
    if (bookingError) throw bookingError;

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

    // Default response jika belum ditemukan
    return res.status(200).json({
      success: true,
      status: 'PENDING',
      message: 'Menunggu notifikasi pembayaran masuk'
    });
  } catch (err) {
    const statusCode = err.code === 'SUPABASE_SERVER_CONFIG' ? 503 : 500;
    return res.status(statusCode).json({ success: false, message: 'Status pembayaran gagal diperiksa.' });
  }
}

