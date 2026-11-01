import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { referenceId, amount } = req.body || {};
    const now = new Date().toISOString();
    let updated = false;

    // 1. Update qris_payments jika referenceId ada
    if (referenceId) {
      try {
        const { data } = await supabase
          .from('qris_payments')
          .update({
            status: 'PAID',
            paid_at: now,
            raw_notification: JSON.stringify({ simulated: true, simulatedAt: now })
          })
          .eq('reference_id', referenceId)
          .select();

        if (data && data.length > 0) {
          updated = true;
          const qrisRow = data[0];
          if (qrisRow.booking_id) {
            await supabase.from('bookings').update({
              booking_status: 'CONFIRMED',
              payment_status: 'PAID',
              payment_method: 'QRIS'
            }).eq('id', qrisRow.booking_id);
          }
        }
      } catch (e) {}
    }

    // 2. Jika ada amount, cari di bookings
    if (!updated && amount) {
      try {
        const numAmount = Number(amount);
        const { data: bookingsList } = await supabase
          .from('bookings')
          .select('*')
          .eq('booking_status', 'PENDING_PAYMENT')
          .eq('total_price', numAmount)
          .limit(1);

        if (bookingsList && bookingsList.length > 0) {
          await supabase.from('bookings').update({
            booking_status: 'CONFIRMED',
            payment_status: 'PAID',
            payment_method: 'QRIS'
          }).eq('id', bookingsList[0].id);
          updated = true;
        }
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      simulated: true,
      updated,
      message: updated 
        ? 'Simulasi berhasil: status pembayaran diupdate ke PAID!' 
        : 'Simulasi diterima (tidak ada data booking/tagihan yang cocok langsung).'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

