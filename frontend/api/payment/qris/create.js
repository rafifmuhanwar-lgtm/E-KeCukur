import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from './supabaseAdmin.js';


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
      customerPhone = ''
    } = req.body || {};

    const paymentType = String(type).toUpperCase();
    const baseAmount = Number(amount);
    if (!['BOOKING', 'TIP'].includes(paymentType) || !Number.isSafeInteger(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Tipe atau nominal pembayaran tidak valid.' });
    }

    const supabase = getSupabaseAdmin();
    let resolvedBarberId = barberId ? String(barberId) : null;
    const resolvedBookingId = bookingId ? String(bookingId) : null;
    if (paymentType === 'BOOKING') {
      if (!resolvedBookingId) {
        return res.status(400).json({ success: false, message: 'ID booking diperlukan untuk pembayaran booking.' });
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, total_price, booking_status, payment_status')
        .eq('id', resolvedBookingId)
        .maybeSingle();
      if (bookingError) throw bookingError;
      if (!booking) return res.status(404).json({ success: false, message: 'Booking tidak ditemukan.' });
      if (Number(booking.total_price) !== baseAmount) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran tidak sesuai booking.' });
      }
      if (booking.booking_status !== 'PENDING_PAYMENT' || booking.payment_status === 'PAID') {
        return res.status(409).json({ success: false, message: 'Booking tidak menunggu pembayaran.' });
      }
    }
    if (paymentType === 'TIP') {
      if (!resolvedBarberId) {
        return res.status(400).json({ success: false, message: 'ID barber diperlukan untuk pembayaran tip.' });
      }

      const { data: barber, error: barberError } = await supabase
        .from('barbers')
        .select('id')
        .eq('id', resolvedBarberId)
        .maybeSingle();
      if (barberError) throw barberError;
      if (!barber) return res.status(404).json({ success: false, message: 'Barber penerima tip tidak ditemukan.' });
      resolvedBarberId = barber.id;
    }

    // Cegah tabrakan nominal jika ada transaksi bersamaan: cari kode unik yang belum dipakai
    const now = new Date();
    const { error: expireError } = await supabase
      .from('qris_payments')
      .update({ status: 'EXPIRED', updated_at: now.toISOString() })
      .eq('status', 'PENDING')
      .lte('expires_at', now.toISOString());
    if (expireError) throw expireError;
    const { error: missingExpiryError } = await supabase
      .from('qris_payments')
      .update({ status: 'EXPIRED', updated_at: now.toISOString() })
      .eq('status', 'PENDING')
      .is('expires_at', null);
    if (missingExpiryError) throw missingExpiryError;

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: pendingRows, error: pendingError } = await supabase
      .from('qris_payments')
      .select('total_amount')
      .eq('status', 'PENDING')
      .gte('created_at', fifteenMinsAgo);
    if (pendingError) throw pendingError;

    const occupiedTotals = new Set((pendingRows || []).map((row) => Number(row.total_amount)));
    let payment = null;
    for (let attempt = 0; attempt < 899; attempt += 1) {
      const uniqueCode = 100 + Math.floor(Math.random() * 899);
      const totalAmount = baseAmount + uniqueCode;
      if (occupiedTotals.has(totalAmount)) continue;

      const referenceId = `ECK-${randomUUID().toUpperCase()}`;
      const dynamicQrisStr = generateDynamicQris(totalAmount);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(dynamicQrisStr)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase.from('qris_payments').insert({
        reference_id: referenceId,
        type: paymentType,
        booking_id: resolvedBookingId,
        barber_id: resolvedBarberId,
        customer_name: String(customerName || 'Pelanggan').slice(0, 120),
        customer_phone: String(customerPhone || '').slice(0, 40),
        base_amount: baseAmount,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        qris_image_url: qrImageUrl,
        status: 'PENDING',
        expires_at: expiresAt
      });

      if (insertError?.code === '23505') {
        occupiedTotals.add(totalAmount);
        continue;
      }
      if (insertError) throw insertError;

      payment = {
        referenceId,
        type: paymentType,
        bookingId: resolvedBookingId,
        barberId: resolvedBarberId,
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
      break;
    }

    if (!payment) {
      return res.status(503).json({ success: false, message: 'Slot nominal QRIS sedang penuh. Coba lagi sebentar.' });
    }

    return res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error('QRIS payment creation failed:', err);
    const statusCode = err.code === 'SUPABASE_SERVER_CONFIG' ? 503 : 500;
    return res.status(statusCode).json({ success: false, message: 'Tagihan QRIS gagal dibuat.' });
  }
}

