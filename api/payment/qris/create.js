import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_QRIS_STATIC = '00020101021126570011ID.DANA.WWW011893600915303714994002090371499400303UMI51440014ID.CO.QRIS.WWW0215ID10266433150900303UMI5204481453033605802ID5922Bayar Via Qris, Konter6006Bekasi6105173206304E9AE';

const ALLOWED_TRANSACTION_TYPES = new Set([
  'BOOKING',
  'TIP',
  'PLAN_BARBER',
  'PLAN_CAPSTER',
  'PLAN_PRO'
]);

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
      amount = null,
      bookingId = null,
      barberId = null,
      customerName = 'Pelanggan',
      customerPhone = '',
      _qrisImageUrl = null
    } = req.body || {};

    // 1. Validasi Tipe Transaksi (Whitelist Fail-Closed)
    if (!type || !ALLOWED_TRANSACTION_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: `Tipe transaksi "${type}" tidak dikenal atau tidak didukung.`
      });
    }

    let baseAmount = 0;
    let resolvedCustomerName = customerName;
    let resolvedCustomerPhone = customerPhone;
    let resolvedBarberId = barberId;

    // 2. Validasi & Pengambilan Harga Resmi Berdasarkan Tipe
    if (type === 'BOOKING') {
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'bookingId wajib disertakan untuk pembayaran booking.'
        });
      }

      // Ambil data resmi langsung dari database bookings
      const { data: bookingData, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, total_price, booking_status, payment_status, customer_name, customer_phone, barber_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (bookingErr) {
        console.error('[SEC-001 DB Error]: Failed to query booking:', bookingErr.message);
        return res.status(500).json({
          success: false,
          message: `Gagal memverifikasi data booking dari database: ${bookingErr.message}`
        });
      }

      if (!bookingData) {
        return res.status(404).json({
          success: false,
          message: 'Data booking tidak ditemukan di sistem.'
        });
      }

      // Verifikasi status pembayaran
      if (bookingData.payment_status === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'Tagihan booking ini sudah lunas sebelumnya.'
        });
      }

      // Verifikasi status booking
      const status = (bookingData.booking_status || '').trim();
      if (status === 'CANCELLED' || status === 'Dibatalkan') {
        return res.status(400).json({
          success: false,
          message: 'Booking telah dibatalkan dan tidak dapat dibayar.'
        });
      }
      if (status === 'EXPIRED' || status === 'Kedaluwarsa') {
        return res.status(400).json({
          success: false,
          message: 'Booking telah kedaluwarsa dan tidak dapat dibayar.'
        });
      }
      if (status === 'COMPLETED' || status === 'Selesai') {
        return res.status(400).json({
          success: false,
          message: 'Booking sudah selesai.'
        });
      }

      const validBookingStatuses = new Set(['PENDING_PAYMENT', 'Menunggu Pembayaran']);
      if (!validBookingStatuses.has(status)) {
        return res.status(400).json({
          success: false,
          message: `Status booking (${status}) tidak memenuhi syarat untuk pembayaran.`
        });
      }

      const officialPrice = Number(bookingData.total_price);
      if (!Number.isSafeInteger(officialPrice) || officialPrice <= 0) {
        return res.status(500).json({
          success: false,
          message: 'Harga resmi booking pada database tidak valid.'
        });
      }

      // Kunci nominal dasar ke harga resmi database (abaikan input harga dari frontend)
      baseAmount = officialPrice;
      resolvedCustomerName = bookingData.customer_name || resolvedCustomerName;
      resolvedCustomerPhone = bookingData.customer_phone || resolvedCustomerPhone;
      resolvedBarberId = bookingData.barber_id || resolvedBarberId;
    } else if (type === 'PLAN_BARBER') {
      // Paket Langganan Barber Studio Resmi Rp 99.000
      baseAmount = 99000;
    } else if (type === 'PLAN_CAPSTER' || type === 'PLAN_PRO') {
      // Paket Langganan Capster Pro Resmi Rp 49.000
      baseAmount = 49000;
    } else if (type === 'TIP') {
      // Batas TIP sukarela: minimal Rp 5.000 dan maksimal Rp 10.000.000
      const tipNum = Number(amount);
      if (!Number.isSafeInteger(tipNum) || tipNum < 5000 || tipNum > 10000000) {
        return res.status(400).json({
          success: false,
          message: 'Nominal tip minimal Rp 5.000 dan maksimal Rp 10.000.000 (harus berupa bilangan bulat).'
        });
      }
      baseAmount = tipNum;
    }

    // 3. Validasi Keamanan Angka Nominal (Safe Positive Integer)
    if (!Number.isSafeInteger(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal transaksi tidak valid.'
      });
    }

    // 4. Pencegahan Tabrakan Kode Unik (Anti-Collision 15 Menit)
    let occupiedTotals = new Set();
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: pendingRows, error: pendingErr } = await supabase
        .from('qris_payments')
        .select('total_amount')
        .eq('status', 'PENDING')
        .gte('created_at', fifteenMinsAgo);

      if (pendingErr) {
        console.warn('[QRIS Warning]: Failed to fetch pending total amounts:', pendingErr.message);
      } else if (pendingRows && pendingRows.length > 0) {
        pendingRows.forEach((r) => occupiedTotals.add(Number(r.total_amount)));
      }
    } catch (collErr) {
      console.warn('[QRIS Warning]: Anti-collision check exception:', collErr.message);
    }

    // Cari kode unik acak (100 - 998) yang belum terpakai pada nominal dasar yang sama
    let uniqueCode = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidateCode = Math.floor(100 + Math.random() * 899);
      if (!occupiedTotals.has(baseAmount + candidateCode)) {
        uniqueCode = candidateCode;
        break;
      }
    }

    if (!uniqueCode) {
      return res.status(503).json({
        success: false,
        message: 'Gagal menghasilkan kode unik transaksi karena kepadatan transaksi saat ini. Silakan coba kembali beberapa saat lagi.'
      });
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
      barberId: resolvedBarberId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      baseAmount,
      uniqueCode,
      totalAmount,
      formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
      qrisString: dynamicQrisStr,
      qrisImageUrl: qrImageUrl,
      status: 'PENDING',
      expiresAt
    };

    // 5. Pencatatan Transaksi ke Database (Fail-Closed: QRIS TIDAK DITERBITKAN jika insert gagal)
    const { error: insertErr } = await supabase.from('qris_payments').insert({
      reference_id: referenceId,
      type,
      booking_id: bookingId ? String(bookingId) : null,
      barber_id: resolvedBarberId ? String(resolvedBarberId) : null,
      customer_name: resolvedCustomerName,
      customer_phone: resolvedCustomerPhone,
      base_amount: baseAmount,
      unique_code: uniqueCode,
      total_amount: totalAmount,
      qris_image_url: qrImageUrl,
      status: 'PENDING',
      expires_at: expiresAt
    });

    if (insertErr) {
      console.error('[SEC-001 DB Error]: qris_payments table insert failed:', insertErr.message);
      return res.status(500).json({
        success: false,
        message: 'Gagal mencatat transaksi pembayaran ke database. Instruksi QRIS dibatalkan demi keamanan transaksi.'
      });
    }

    return res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error('[SEC-001 Fatal Error]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
