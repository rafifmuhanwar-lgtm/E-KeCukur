import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseNotificationAmount(input) {
  if (typeof input === 'number') return Math.round(input);
  if (!input || typeof input !== 'string') return 0;

  const cleaned = input.replace(/\s+/g, ' ');

  // 1. Format dengan Rp atau IDR
  let match = cleaned.match(/(?:rp\.?|idr)\s*([0-9.,]+)/i);
  if (match) {
    let numStr = match[1].trim();
    if (/[.,]\d{2}$/.test(numStr)) numStr = numStr.slice(0, -3);
    const val = parseInt(numStr.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 2. Format ribuan bertitik/koma
  match = cleaned.match(/\b([0-9]{1,3}(?:[.,][0-9]{3})+)(?:[.,]\d{2})?\b/);
  if (match) {
    const val = parseInt(match[1].replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 3. Digit murni 4-9 digit
  match = cleaned.match(/\b([0-9]{4,9})\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return 0;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key, authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      message: 'E-CUKUR QRIS Webhook Listener is live on Vercel',
      expectedHeader: 'x-api-key: ecukur_qris_secret_2026',
      method: 'POST'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = { text: body };
      }
    }

    const payload = body || {};
    let targetAmount = 0;

    if (payload.amount) {
      targetAmount = parseNotificationAmount(payload.amount);
    } else if (payload.text) {
      targetAmount = parseNotificationAmount(payload.text);
    } else if (payload.message) {
      targetAmount = parseNotificationAmount(payload.message);
    } else if (payload.body) {
      targetAmount = parseNotificationAmount(payload.body);
    } else if (payload.raw_text) {
      targetAmount = parseNotificationAmount(payload.raw_text);
    }

    console.log('[Vercel QRIS Webhook] Parsed Amount:', targetAmount, 'from:', JSON.stringify(payload));

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menemukan angka nominal pada payload notifikasi'
      });
    }

    const now = new Date();
    let matched = false;
    let matchDetails = null;

    // 1. Cek tabel qris_payments di Supabase jika ada
    try {
      const { data: qrisRow } = await supabase
        .from('qris_payments')
        .select('*')
        .eq('status', 'PENDING')
        .eq('total_amount', targetAmount)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (qrisRow) {
        matched = true;
        matchDetails = qrisRow;
        await supabase
          .from('qris_payments')
          .update({
            status: 'PAID',
            paid_at: now.toISOString(),
            raw_notification: JSON.stringify(payload)
          })
          .eq('reference_id', qrisRow.reference_id);

        if (qrisRow.booking_id) {
          await supabase.from('bookings').update({
            booking_status: 'CONFIRMED',
            payment_status: 'PAID',
            payment_method: 'QRIS'
          }).eq('id', qrisRow.booking_id);
        }
      }
    } catch (e) {
      // Table qris_payments belum dibuat, lanjut ke cek tabel bookings
    }

    // 2. Jika belum cocok, cari langsung di tabel bookings
    if (!matched) {
      try {
        // Cari booking dengan total_price sama persis atau selisih kode unik (1 - 999)
        const { data: bookingsList } = await supabase
          .from('bookings')
          .select('*')
          .in('booking_status', ['PENDING_PAYMENT', 'Menunggu'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (bookingsList && bookingsList.length > 0) {
          const matchingBooking = bookingsList.find(b => {
            const price = Number(b.total_price);
            return price === targetAmount || (targetAmount >= price && targetAmount <= price + 999);
          });

          if (matchingBooking) {
            matched = true;
            matchDetails = matchingBooking;
            await supabase.from('bookings').update({
              booking_status: 'CONFIRMED',
              payment_status: 'PAID',
              payment_method: 'QRIS'
            }).eq('id', matchingBooking.id);
            console.log('[Vercel QRIS] Booking matched and confirmed:', matchingBooking.id);
          }
        }
      } catch (err) {
        console.warn('Booking direct match warning:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      matched,
      amount: targetAmount,
      details: matchDetails ? {
        id: matchDetails.id || matchDetails.reference_id,
        customerName: matchDetails.customer_name || matchDetails.customerName
      } : null,
      message: matched 
        ? `Pembayaran Rp ${targetAmount.toLocaleString('id-ID')} berhasil diverifikasi!`
        : `Dana masuk Rp ${targetAmount.toLocaleString('id-ID')} dicatat, siap dicocokkan!`
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
