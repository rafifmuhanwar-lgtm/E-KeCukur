import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_QRIS_STATIC = '00020101021126610014COM.GO-JEK.WWW01189360091433186083620210G3186083620303UMI51440014ID.CO.QRIS.WWW0215ID10264903050790303UMI5204899953033605802ID5925BAYAR VIA QRIS, Digital &6006BEKASI61051732062070703A01630454CF';

function crc16ccitt(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    crc ^= (c << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}

function generateDynamicQris(amount, staticQris = MASTER_QRIS_STATIC) {
  let base = (staticQris || MASTER_QRIS_STATIC).trim();
  const crcIdx = base.lastIndexOf('6304');
  if (crcIdx !== -1) base = base.slice(0, crcIdx);
  base = base.replace('010211', '010212');

  const cleanAmt = Math.round(Number(amount) || 0);
  const amtStr = String(cleanAmt);
  const amtLen = amtStr.length < 10 ? '0' + amtStr.length : String(amtStr.length);
  const tag54 = '54' + amtLen + amtStr;

  const idx58 = base.indexOf('5802ID');
  if (idx58 !== -1) {
    base = base.slice(0, idx58) + tag54 + base.slice(idx58);
  } else {
    base = base + tag54;
  }

  const toSign = base + '6304';
  return toSign + crc16ccitt(toSign);
}

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
    const {
      type = 'BOOKING',
      amount = 0,
      bookingId = null,
      barberId = null,
      customerName = 'Pelanggan',
      customerPhone = '',
      qrisImageUrl = null
    } = req.body || {};

    const baseAmount = Number(amount) || 0;

    // Cegah tabrakan nominal jika ada transaksi bersamaan: cari kode unik yang belum dipakai
    let occupiedTotals = new Set();
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: pendingRows } = await supabase
        .from('qris_payments')
        .select('total_amount')
        .eq('status', 'PENDING')
        .gte('created_at', fifteenMinsAgo);

      if (pendingRows && pendingRows.length > 0) {
        pendingRows.forEach(r => occupiedTotals.add(Number(r.total_amount)));
      }
    } catch {}

    // Cari kode unik acak yang belum ada di transaksi PENDING lainnya
    let uniqueCode = Math.floor(100 + Math.random() * 899);
    for (let attempt = 0; attempt < 50; attempt++) {
      if (!occupiedTotals.has(baseAmount + uniqueCode)) {
        break;
      }
      uniqueCode = Math.floor(100 + Math.random() * 899);
    }

    const totalAmount = baseAmount + uniqueCode;
    const referenceId = `ECK-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`;
    const dynamicQrisStr = generateDynamicQris(totalAmount);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(dynamicQrisStr)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const payment = {
      referenceId,
      type,
      bookingId,
      barberId,
      customerName,
      customerPhone,
      baseAmount,
      uniqueCode,
      totalAmount,
      formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
      qrisString: dynamicQrisStr,
      qrisImageUrl: qrImageUrl,
      status: 'PENDING',
      expiresAt
    };

    // Simpan ke Supabase jika tabel qris_payments tersedia
    try {
      await supabase.from('qris_payments').insert({
        reference_id: referenceId,
        type,
        booking_id: bookingId ? String(bookingId) : null,
        barber_id: barberId ? String(barberId) : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        base_amount: baseAmount,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        qris_image_url: qrImageUrl,
        status: 'PENDING',
        expires_at: expiresAt
      });
    } catch (dbErr) {
      console.warn('Note: qris_payments table insert failed (fallback to client flow):', dbErr.message);
    }

    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

