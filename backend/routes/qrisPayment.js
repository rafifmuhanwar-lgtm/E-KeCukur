import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { supabase } from '../supabase.js';

const router = express.Router();

function isValidWebhookSecret(providedSecret, expectedSecret) {
  if (typeof providedSecret !== 'string' || providedSecret.length === 0) {
    return false;
  }

  if (typeof expectedSecret !== 'string' || expectedSecret.length === 0) return false;

  const provided = Buffer.from(providedSecret, 'utf8');
  const expected = Buffer.from(expectedSecret, 'utf8');
  if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
    return true;
  }
  return false;
}

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

const ALLOWED_TRANSACTION_TYPES = new Set([
  'BOOKING',
  'TIP',
  'PLAN_BARBER',
  'PLAN_CAPSTER',
  'PLAN_PRO'
]);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. POST /api/payment/qris/create - Buat Tagihan QRIS Baru
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.post('/create', async (req, res) => {
  try {
    const {
      type = 'BOOKING',
      amount = null,
      bookingId = null,
      barberId = null,
      customerName = 'Pelanggan E-CUKUR',
      customerPhone = '',
      qrisImageUrl = null
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

      if (bookingData.payment_status === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'Tagihan booking ini sudah lunas sebelumnya.'
        });
      }

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

      baseAmount = officialPrice;
      resolvedCustomerName = bookingData.customer_name || resolvedCustomerName;
      resolvedCustomerPhone = bookingData.customer_phone || resolvedCustomerPhone;
      resolvedBarberId = bookingData.barber_id || resolvedBarberId;
    } else if (type === 'PLAN_BARBER') {
      baseAmount = 99000;
    } else if (type === 'PLAN_CAPSTER' || type === 'PLAN_PRO') {
      baseAmount = 49000;
    } else if (type === 'TIP') {
      const tipNum = Number(amount);
      if (!Number.isSafeInteger(tipNum) || tipNum < 5000 || tipNum > 10000000) {
        return res.status(400).json({
          success: false,
          message: 'Nominal tip minimal Rp 5.000 dan maksimal Rp 10.000.000 (harus berupa bilangan bulat).'
        });
      }
      baseAmount = tipNum;
    }

    if (!Number.isSafeInteger(baseAmount) || baseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nominal transaksi tidak valid.'
      });
    }

    const uniqueCode = generateUniqueCode(baseAmount);
    if (!uniqueCode) {
      return res.status(503).json({
        success: false,
        message: 'Gagal menghasilkan kode unik transaksi karena kepadatan transaksi saat ini.'
      });
    }

    const totalAmount = baseAmount + uniqueCode;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 Menit
    const referenceId = `ECK-Q-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`;

    const paymentRecord = {
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
      qrisImageUrl: qrisImageUrl || null,
      status: 'PENDING',
      rawNotification: null,
      paidAt: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Simpan ke Supabase (Fail-Closed: Gagal simpan DB = Tolak terbitkan QRIS)
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
      qris_image_url: qrisImageUrl,
      status: 'PENDING',
      expires_at: expiresAt.toISOString()
    });

    if (insertErr) {
      console.error('[SEC-001 DB Error]: Express qris_payments table insert failed:', insertErr.message);
      return res.status(500).json({
        success: false,
        message: 'Gagal mencatat transaksi pembayaran ke database. Instruksi QRIS dibatalkan demi keamanan transaksi.'
      });
    }

    // Cache di memori sebagai pelengkap pencarian cepat
    memoryPayments.set(referenceId, paymentRecord);

    return res.status(201).json({
      success: true,
      payment: paymentRecord
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
    const secretKey = process.env.QRIS_WEBHOOK_SECRET || '';
    if (!secretKey) {
      return res.status(503).json({ success: false, message: 'Webhook secret belum dikonfigurasi di server' });
    }

    const authorization = req.headers.authorization;
    const bearerSecret = typeof authorization === 'string'
      ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]
      : undefined;

    const rawPayload = req.body || {};
    const providedSecret = (
      req.headers['x-api-key'] ||
      req.headers['x-webhook-secret'] ||
      bearerSecret ||
      ''
    ).trim();

    if (!isValidWebhookSecret(providedSecret, secretKey)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
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

    console.log(`[QRIS Webhook Received]: Parsed Amount = ${targetAmount}`);

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
            baseAmount: Number(data.base_amount),
            uniqueCode: Number(data.unique_code),
            type: data.type,
            status: data.status,
            expiresAt: data.expires_at
          };
        }
      } catch (e) {}
    }

    // Jika tagihan ditemukan dan cocok!
    if (matchedPayment) {
      // Jika ini adalah pembayaran booking, validasi ketat status & cross-check harga
      if (matchedPayment.bookingId) {
        const { data: bData, error: bErr } = await supabase
          .from('bookings')
          .select('id, total_price, booking_status, payment_status')
          .eq('id', matchedPayment.bookingId)
          .maybeSingle();

        if (bErr || !bData) {
          console.error(`[SEC-001 Error] Data booking ${matchedPayment.bookingId} tidak ditemukan:`, bErr?.message);
          matchedPayment.status = 'REVIEW_REQUIRED';
          memoryPayments.set(matchedPayment.referenceId, matchedPayment);
          await supabase.from('qris_payments').update({
            status: 'REVIEW_REQUIRED',
            raw_notification: JSON.stringify(rawPayload)
          }).eq('reference_id', matchedPayment.referenceId);

          return res.status(200).json({
            success: true,
            matched: false,
            reviewRequired: true,
            message: 'Data booking tidak ditemukan. Tagihan ditandai REVIEW_REQUIRED.'
          });
        }

        if (bData.payment_status === 'PAID') {
          console.warn(`[SEC-001 Warning] Booking ${matchedPayment.bookingId} sudah berstatus PAID sebelumnya.`);
          matchedPayment.status = 'DUPLICATE_PAYMENT';
          memoryPayments.set(matchedPayment.referenceId, matchedPayment);
          await supabase.from('qris_payments').update({
            status: 'DUPLICATE_PAYMENT',
            raw_notification: JSON.stringify(rawPayload)
          }).eq('reference_id', matchedPayment.referenceId);

          return res.status(200).json({
            success: true,
            matched: false,
            duplicate: true,
            message: 'Booking sudah lunas sebelumnya. Pembayaran ditandai DUPLICATE_PAYMENT.'
          });
        }

        const paidBase = Number(matchedPayment.baseAmount) || (Number(matchedPayment.totalAmount) - (Number(matchedPayment.uniqueCode) || 0));
        const requiredPrice = Number(bData.total_price || 0);

        if (requiredPrice <= 0 || paidBase < requiredPrice) {
          console.warn(`[SECURITY ALERT] Pembayaran kurang untuk booking ${matchedPayment.bookingId}: Dibayar dasar Rp ${paidBase}, Tagihan resmi Rp ${requiredPrice}`);
          matchedPayment.status = 'UNDERPAID';
          memoryPayments.set(matchedPayment.referenceId, matchedPayment);
          await supabase.from('qris_payments').update({
            status: 'UNDERPAID',
            raw_notification: JSON.stringify(rawPayload)
          }).eq('reference_id', matchedPayment.referenceId);

          return res.status(200).json({
            success: true,
            matched: false,
            underpaid: true,
            message: `Nominal pembayaran tidak mencukupi harga resmi booking (Rp ${paidBase} < Rp ${requiredPrice}). Tagihan ditandai UNDERPAID.`
          });
        }

        // Update status booking terlebih dahulu (Fail-Closed)
        const { error: bUpdateErr } = await supabase.from('bookings').update({
          booking_status: 'CONFIRMED',
          payment_status: 'PAID',
          payment_method: 'QRIS'
        }).eq('id', matchedPayment.bookingId);

        if (bUpdateErr) {
          console.error(`[SEC-001 Error] Gagal konfirmasi booking ${matchedPayment.bookingId}:`, bUpdateErr.message);
          matchedPayment.status = 'REVIEW_REQUIRED';
          memoryPayments.set(matchedPayment.referenceId, matchedPayment);
          await supabase.from('qris_payments').update({
            status: 'REVIEW_REQUIRED',
            raw_notification: JSON.stringify(rawPayload)
          }).eq('reference_id', matchedPayment.referenceId);

          return res.status(500).json({
            success: false,
            message: 'Gagal memperbarui status booking ke database. Transaksi ditandai REVIEW_REQUIRED.'
          });
        }
      }

      matchedPayment.status = 'PAID';
      matchedPayment.paidAt = now.toISOString();
      matchedPayment.rawNotification = JSON.stringify(rawPayload);
      memoryPayments.set(matchedPayment.referenceId, matchedPayment);

      // Update tabel Supabase qris_payments
      await supabase.from('qris_payments')
        .update({
          status: 'PAID',
          paid_at: matchedPayment.paidAt,
          raw_notification: matchedPayment.rawNotification
        })
        .eq('reference_id', matchedPayment.referenceId);

      // Jika ini adalah pembayaran upgrade paket berlangganan barber
      if (matchedPayment.type?.startsWith('PLAN_') && matchedPayment.barberId) {
        try {
          const targetPlan = matchedPayment.type === 'PLAN_BARBER' ? 'barber' : 'capster';
          await supabase.from('barbers').update({
            plan: targetPlan
          }).eq('id', matchedPayment.barberId);
          console.log(`[QRIS] Barber ${matchedPayment.barberId} berhasil di-upgrade ke paket ${targetPlan}!`);
        } catch (err) {
          console.warn('[QRIS Barber Plan Update Warning]:', err.message);
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

    // Anti-Replay: Periksa apakah ada pembayaran PAID dalam 15 menit terakhir
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    try {
      const { data: recentPaid } = await supabase
        .from('qris_payments')
        .select('*')
        .eq('status', 'PAID')
        .eq('total_amount', targetAmount)
        .gte('paid_at', fifteenMinutesAgo)
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentPaid) {
        return res.status(200).json({
          success: true,
          matched: true,
          duplicate: true,
          referenceId: recentPaid.reference_id,
          message: `Notifikasi pembayaran untuk nominal Rp ${targetAmount.toLocaleString('id-ID')} sudah diproses sebelumnya (idempotent).`
        });
      }
    } catch (e) {}

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
router.post('/simulate', (_req, res) => {
  return res.status(404).json({ success: false, message: 'Not Found' });
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
    requiredHeader: 'x-api-key',
    secretConfiguration: 'Set QRIS_WEBHOOK_SECRET in the server environment and configure its value privately on the device.',
    macroDroidConfig: {
      trigger: 'Notification Received -> Pilih Aplikasi Merchant/Bank (BCA/GoBiz/DANA/dsb)',
      action: 'HTTP Request',
      method: 'POST',
      url: webhookUrl,
      headers: {
        'Content-Type': 'application/json'
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
