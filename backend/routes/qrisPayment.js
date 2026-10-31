import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// Memory store fallback (agar pembayaran tetap berjalan mulus meskipun tabel Supabase belum dimigrasi)
const memoryPayments = new Map();

/**
 * Helper: Parse nominal uang dari teks notifikasi push Android
 * Contoh input:
 * - "Pembayaran QRIS Rp 50.142 dari GO-PAY berhasil" -> 50142
 * - "Dana masuk IDR 50,142.00" -> 50142
 * - 50142 -> 50142
 */
export function parseNotificationAmount(input) {
  if (typeof input === 'number') return Math.round(input);
  if (!input || typeof input !== 'string') return 0;

  const cleaned = input.replace(/\s+/g, ' ');

  // 1. Nominal dengan awalan Rp atau IDR
  let match = cleaned.match(/(?:rp\.?|idr)\s*([0-9.,]+)/i);
  if (match) {
    let numStr = match[1].trim();
    if (/[.,]\d{2}$/.test(numStr)) numStr = numStr.slice(0, -3);
    const val = parseInt(numStr.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 2. Format ribuan bertitik/koma: misal 50.142 atau 150.000
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

/**
 * Generate 3-digit kode unik (100 - 999) yang belum terpakai untuk nominal yang sama
 */
function generateUniqueCode(baseAmount) {
  const now = Date.now();
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = Math.floor(100 + Math.random() * 899); // 100 - 998
    const candidateTotal = baseAmount + code;

    // Cek apakah ada transaksi pending dengan totalAmount yang sama dalam 15 menit terakhir
    let isCollision = false;
    for (const p of memoryPayments.values()) {
      if (
        p.status === 'PENDING' &&
        p.totalAmount === candidateTotal &&
        new Date(p.expiresAt).getTime() > now
      ) {
        isCollision = true;
        break;
      }
    }

    if (!isCollision) {
      return code;
    }
  }
  return Math.floor(100 + Math.random() * 899);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. POST /api/payment/qris/create - Buat Tagihan QRIS Baru
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/create', async (req, res) => {
  try {
    const {
      type = 'BOOKING',
      amount,
      bookingId = null,
      barberId = null,
      customerName = 'Pelanggan E-CUKUR',
      customerPhone = '',
      qrisImageUrl = null
    } = req.body;

    const baseAmount = parseInt(amount, 10);
    if (isNaN(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal amount tidak valid' });
    }

    const uniqueCode = generateUniqueCode(baseAmount);
    const totalAmount = baseAmount + uniqueCode;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 Menit

    const referenceId = `ECK-Q-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`;

    const paymentRecord = {
      referenceId,
      type,
      bookingId,
      barberId,
      customerName,
      customerPhone,
      baseAmount,
      uniqueCode,
      totalAmount,
      qrisImageUrl: qrisImageUrl || null,
      status: 'PENDING',
      rawNotification: null,
      paidAt: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Simpan ke memori
    memoryPayments.set(referenceId, paymentRecord);

    // Coba simpan ke Supabase jika tabel qris_payments tersedia
    try {
      await supabase.from('qris_payments').insert({
        reference_id: referenceId,
        type,
        booking_id: bookingId,
        barber_id: barberId,
        customer_name: customerName,
        customer_phone: customerPhone,
        base_amount: baseAmount,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        qris_image_url: qrisImageUrl,
        status: 'PENDING',
        expires_at: expiresAt.toISOString()
      });
    } catch (e) {
      // Abaikan jika tabel belum dibuat di Supabase
    }

    return res.status(201).json({
      success: true,
      payment: {
        referenceId,
        type,
        bookingId,
        baseAmount,
        uniqueCode,
        totalAmount,
        formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
        qrisImageUrl,
        status: 'PENDING',
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: 900
      }
    });
  } catch (err) {
    console.error('[QRIS Create Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. GET /api/payment/qris/status/:referenceId - Polling Status Pembayaran
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/status/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    let payment = memoryPayments.get(referenceId);

    // Coba ambil dari Supabase jika di memori tidak ada
    if (!payment) {
      try {
        const { data } = await supabase
          .from('qris_payments')
          .select('*')
          .eq('reference_id', referenceId)
          .single();
        if (data) {
          payment = {
            referenceId: data.reference_id,
            bookingId: data.booking_id,
            totalAmount: Number(data.total_amount),
            status: data.status,
            paidAt: data.paid_at,
            expiresAt: data.expires_at
          };
          memoryPayments.set(referenceId, payment);
        }
      } catch (e) {}
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Tagihan pembayaran tidak ditemukan' });
    }

    // Cek kadaluarsa
    if (payment.status === 'PENDING' && new Date(payment.expiresAt).getTime() < Date.now()) {
      payment.status = 'EXPIRED';
      memoryPayments.set(referenceId, payment);
      supabase.from('qris_payments').update({ status: 'EXPIRED' }).eq('reference_id', referenceId).then(() => {}).catch(() => {});
    }

    return res.json({
      success: true,
      referenceId: payment.referenceId,
      bookingId: payment.bookingId,
      status: payment.status,
      paidAt: payment.paidAt,
      totalAmount: payment.totalAmount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. POST /api/payment/qris/webhook - Endpoint Listener HP Android
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/webhook', async (req, res) => {
  try {
    const secretKey = process.env.QRIS_WEBHOOK_SECRET || 'ecukur_qris_secret_2026';
    const providedKey = req.headers['x-api-key'] || req.headers['authorization'] || req.query.key;

    // Optional API Key check: jika ada env key yang diset ketat
    if (process.env.STRICT_WEBHOOK_KEY === 'true' && providedKey !== secretKey) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
    }

    // Ekstraksi nominal dari berbagai variasi payload (MacroDroid / Tasker / Custom JSON)
    const rawPayload = req.body || {};
    let targetAmount = 0;

    if (rawPayload.amount) {
      targetAmount = parseNotificationAmount(rawPayload.amount);
    } else if (rawPayload.text) {
      targetAmount = parseNotificationAmount(rawPayload.text);
    } else if (rawPayload.message) {
      targetAmount = parseNotificationAmount(rawPayload.message);
    } else if (rawPayload.body) {
      targetAmount = parseNotificationAmount(rawPayload.body);
    } else if (rawPayload.raw_text) {
      targetAmount = parseNotificationAmount(rawPayload.raw_text);
    }

    console.log(`[QRIS Webhook Received]: Parsed Amount = ${targetAmount} | Raw =`, JSON.stringify(rawPayload));

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menemukan angka nominal pada payload notifikasi'
      });
    }

    const now = new Date();
    let matchedPayment = null;

    // 1. Cari di memori
    for (const p of memoryPayments.values()) {
      if (
        p.status === 'PENDING' &&
        p.totalAmount === targetAmount &&
        new Date(p.expiresAt).getTime() > now.getTime()
      ) {
        matchedPayment = p;
        break;
      }
    }

    // 2. Jika tidak ada di memori, coba cari di Supabase
    if (!matchedPayment) {
      try {
        const { data } = await supabase
          .from('qris_payments')
          .select('*')
          .eq('status', 'PENDING')
          .eq('total_amount', targetAmount)
          .gt('expires_at', now.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          matchedPayment = {
            referenceId: data.reference_id,
            bookingId: data.booking_id,
            barberId: data.barber_id,
            customerName: data.customer_name,
            totalAmount: Number(data.total_amount),
            type: data.type,
            status: data.status,
            expiresAt: data.expires_at
          };
        }
      } catch (e) {}
    }

    // Jika tagihan ditemukan dan cocok!
    if (matchedPayment) {
      matchedPayment.status = 'PAID';
      matchedPayment.paidAt = now.toISOString();
      matchedPayment.rawNotification = JSON.stringify(rawPayload);
      memoryPayments.set(matchedPayment.referenceId, matchedPayment);

      // Update tabel Supabase qris_payments jika ada
      supabase.from('qris_payments')
        .update({
          status: 'PAID',
          paid_at: matchedPayment.paidAt,
          raw_notification: matchedPayment.rawNotification
        })
        .eq('reference_id', matchedPayment.referenceId)
        .then(() => {})
        .catch(() => {});

      // Jika ini adalah pembayaran booking, update tabel bookings di Supabase!
      if (matchedPayment.bookingId) {
        try {
          await supabase.from('bookings').update({
            booking_status: 'CONFIRMED',
            payment_status: 'PAID',
            payment_method: 'QRIS'
          }).eq('id', matchedPayment.bookingId);
          console.log(`[QRIS] Booking ${matchedPayment.bookingId} berhasil dikonfirmasi via QRIS!`);
        } catch (err) {
          console.warn('[QRIS Booking Update Warning]:', err.message);
        }
      }

      return res.json({
        success: true,
        matched: true,
        referenceId: matchedPayment.referenceId,
        bookingId: matchedPayment.bookingId,
        customerName: matchedPayment.customerName,
        amount: targetAmount,
        message: `Pembayaran Rp ${targetAmount.toLocaleString('id-ID')} berhasil diverifikasi!`
      });
    }

    // Jika tidak ada tagihan pending yang cocok
    return res.json({
      success: true,
      matched: false,
      amount: targetAmount,
      message: `Dana masuk Rp ${targetAmount.toLocaleString('id-ID')} dicatat, tetapi tidak ada tagihan PENDING yang cocok.`
    });
  } catch (err) {
    console.error('[QRIS Webhook Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. POST /api/payment/qris/simulate - Simulasi Pembayaran (Untuk Testing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/simulate', async (req, res) => {
  const { amount, referenceId } = req.body;
  let targetAmount = amount;

  if (referenceId && !targetAmount) {
    const p = memoryPayments.get(referenceId);
    if (p) targetAmount = p.totalAmount;
  }

  if (!targetAmount) {
    return res.status(400).json({ success: false, message: 'Harap sertakan amount atau referenceId yang valid' });
  }

  // Tembak ke webhook handler internal
  req.body = {
    amount: targetAmount,
    raw_text: `[SIMULASI DEV] Pembayaran QRIS Rp ${targetAmount} berhasil diterima`
  };
  return router.handle(req, res);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. GET /api/payment/qris/instructions - Panduan Konfigurasi MacroDroid
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get('/instructions', (req, res) => {
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  const webhookUrl = `${protocol}://${host}/api/payment/qris/webhook`;

  res.json({
    success: true,
    webhookUrl,
    apiKey: process.env.QRIS_WEBHOOK_SECRET || 'ecukur_qris_secret_2026',
    macroDroidConfig: {
      trigger: 'Notification Received -> Pilih Aplikasi Merchant/Bank (BCA/GoBiz/DANA/dsb)',
      action: 'HTTP Request',
      method: 'POST',
      url: webhookUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.QRIS_WEBHOOK_SECRET || 'ecukur_qris_secret_2026'
      },
      body: JSON.stringify({
        text: '{not_text}',
        title: '{not_title}',
        app: '{not_app_name}'
      })
    }
  });
});

export default router;

