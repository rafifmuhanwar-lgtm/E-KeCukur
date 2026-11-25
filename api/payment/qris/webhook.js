import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdGdxYWtzdW91c2xkZnh5ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjUxMjAsImV4cCI6MjEwNzMwMTEyMH0.09noBpwZ6jHYeJJV-3rprhUtqPk8XvBRTLTJKCEJHA8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CONFIGURED_SECRET = (process.env.QRIS_WEBHOOK_SECRET || '').trim();
const EXPECTED_SECRET = CONFIGURED_SECRET;

function isValidWebhookSecret(providedSecret, expectedSecret) {
  if (typeof providedSecret !== 'string' || providedSecret.length === 0) {
    return false;
  }
  if (!expectedSecret || typeof expectedSecret !== 'string') {
    return false;
  }

  const provided = Buffer.from(providedSecret, 'utf8');
  const expected = Buffer.from(expectedSecret, 'utf8');
  if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
    return true;
  }
  return false;
}

function parseNotificationAmount(input) {
  if (typeof input === 'number') return Math.round(input);
  if (!input || typeof input !== 'string') return 0;

  const cleaned = input.replace(/\s+/g, ' ');

  // 1. Format dengan Rp atau IDR (e.g. Rp 50.123, Rp50.123,00, IDR 50.123)
  let match = cleaned.match(/(?:rp\.?|idr)\s*([0-9.,]+)/i);
  if (match) {
    let numStr = match[1].trim();
    if (/[.,]\d{2}$/.test(numStr)) numStr = numStr.slice(0, -3);
    const val = parseInt(numStr.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 2. Format ribuan bertitik/koma (e.g. 50.123 atau 50,123)
  match = cleaned.match(/\b([0-9]{1,3}(?:[.,][0-9]{3})+)(?:[.,]\d{2})?\b/);
  if (match) {
    const val = parseInt(match[1].replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 3. Digit murni 4-9 digit (e.g. 50123)
  match = cleaned.match(/\b([0-9]{4,9})\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return 0;
}

async function sendTelegramPaymentNotification(payment, targetAmount) {
  try {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const groupId = (process.env.TELEGRAM_GROUP_ID || '-1004385368403').trim();
    if (!token || !groupId) return;

    const isPlan = payment?.type?.startsWith('PLAN_');
    const isTip = payment?.type === 'TIP' || payment?.coffeeLabel;
    let typeLabel = '💈 BOOKING CUKUR';
    if (isPlan) {
      const planName = payment.type === 'PLAN_BARBER' ? 'PAKET BARBER STUDIO (Rp 99K)' : 'PAKET CAPSTER PRO (Rp 49K)';
      typeLabel = `💎 UPGRADE ${planName}`;
    } else if (isTip) {
      typeLabel = '☕ TIP KOPI CAPSTER';
    }
    const customer = payment?.customer_name || payment?.customerName || 'Pelanggan E-CUKUR';
    const amountVal = targetAmount || payment?.total_amount || payment?.total_price || 0;
    const formattedAmount = Number(amountVal).toLocaleString('id-ID');
    const ref = payment?.reference_id || payment?.id || 'ECK-' + Date.now().toString().slice(-6);
    const service = payment?.service_name || payment?.serviceName || '';
    const barber = payment?.barber_name || payment?.barberName || '';
    const nowStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

    let text = 
      `💸 <b>[PEMBAYARAN QRIS DITERIMA]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ <b>Tipe:</b> ${typeLabel}\n` +
      `👤 <b>Pelanggan:</b> ${customer}\n`;

    if (barber) {
      text += `💈 <b>Barber:</b> ${barber}\n`;
    }
    if (service) {
      text += `✂️ <b>Layanan:</b> ${service}\n`;
    }

    text += 
      `💰 <b>Total Lunas:</b> Rp ${formattedAmount}\n` +
      `🔖 <b>Ref:</b> <code>${ref}</code>\n` +
      `🕒 <b>Waktu:</b> ${nowStr} WIB\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `✅ Status: <b>LUNAS OTOMATIS</b>\n` +
      `<i>Jadwal & mutasi telah diperbarui ke sistem.</i>`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.warn('[Telegram Alert Failed]:', err.message);
  }
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
      requiredHeader: 'x-api-key',
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

    const authorization = req.headers.authorization;
    const bearerSecret = typeof authorization === 'string'
      ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]
      : undefined;

    // Keamanan: Hanya izinkan autentikasi webhook melalui HTTP Header (X-API-KEY / Bearer / X-Webhook-Secret)
    // Jangan izinkan secret melalui query string atau payload body karena rentan terekspos log/browser history
    const providedSecret = (
      req.headers['x-api-key'] ||
      req.headers['x-webhook-secret'] ||
      bearerSecret ||
      ''
    ).trim();

    if (!EXPECTED_SECRET) {
      return res.status(503).json({ success: false, message: 'Webhook secret belum dikonfigurasi di server' });
    }

    if (!providedSecret || !isValidWebhookSecret(providedSecret, EXPECTED_SECRET)) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Secret key header tidak valid atau tidak disertakan' });
    }

    // Tangani Test Connection / Ping dari aplikasi seperti Payhook
    if (payload.test || payload.ping || payload.action === 'test' || payload.event === 'ping' || payload.type === 'test') {
      return res.status(200).json({
        success: true,
        message: 'Koneksi Payhook berhasil terhubung ke server E-CUKUR!',
        service: 'E-CUKUR QRIS Webhook'
      });
    }

    let targetAmount = 0;

    const rawAmt = payload.amount ?? payload.nominal ?? payload.total ?? payload.value ?? payload.data?.amount ?? payload.data?.nominal ?? payload.data?.transaction?.amount;
    if (rawAmt !== undefined && rawAmt !== null) {
      targetAmount = parseNotificationAmount(rawAmt);
    }

    // Gabungkan seluruh kemungkinan field teks notifikasi dari Payhook / Android listener
    if (!targetAmount) {
      const combinedText = [
        payload.title,
        payload.text,
        payload.content,
        payload.subtext,
        payload.big_text,
        payload.notification,
        payload.message,
        payload.body,
        payload.raw_text,
        payload.description,
        payload.desc,
        payload.keterangan,
        payload.sender,
        typeof payload.data === 'string' ? payload.data : ''
      ].filter(Boolean).join(' ');

      targetAmount = parseNotificationAmount(combinedText);
    }

    console.log('[Vercel QRIS Webhook] Parsed Amount:', targetAmount);

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        matched: false,
        message: 'Tidak ada nominal pembayaran yang valid pada notifikasi.'
      });
    }

    const now = new Date();
    let matched = false;
    let matchDetails = null;

    // 1. Cek tabel qris_payments di Supabase
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
        // Validasi kedaluwarsa tagihan PENDING
        if (qrisRow.expires_at && new Date(qrisRow.expires_at).getTime() < now.getTime()) {
          console.warn(`[SEC-001 Warning] Pembayaran diterima untuk transaksi kedaluwarsa: Ref ${qrisRow.reference_id}`);
          await supabase
            .from('qris_payments')
            .update({
              status: 'EXPIRED',
              raw_notification: JSON.stringify(payload)
            })
            .eq('reference_id', qrisRow.reference_id);

          return res.status(200).json({
            success: true,
            matched: false,
            expired: true,
            referenceId: qrisRow.reference_id,
            message: `Tagihan pembayaran sudah kedaluwarsa. Transaksi ditandai EXPIRED untuk peninjauan manual.`
          });
        }

        // Jika transaksi terikat dengan bookingId, lakukan cross-check ketat
        if (qrisRow.booking_id) {
          const { data: bData, error: bErr } = await supabase
            .from('bookings')
            .select('id, total_price, booking_status, payment_status')
            .eq('id', qrisRow.booking_id)
            .maybeSingle();

          if (bErr || !bData) {
            console.error(`[SEC-001 Error] Data booking ${qrisRow.booking_id} tidak ditemukan atau gagal di-query:`, bErr?.message);
            await supabase.from('qris_payments').update({
              status: 'REVIEW_REQUIRED',
              raw_notification: JSON.stringify(payload)
            }).eq('reference_id', qrisRow.reference_id);

            return res.status(200).json({
              success: true,
              matched: false,
              reviewRequired: true,
              message: 'Data booking tidak ditemukan. Tagihan ditandai REVIEW_REQUIRED.'
            });
          }

          if (bData.payment_status === 'PAID') {
            console.warn(`[SEC-001 Warning] Booking ${qrisRow.booking_id} sudah berstatus PAID sebelumnya.`);
            await supabase.from('qris_payments').update({
              status: 'DUPLICATE_PAYMENT',
              raw_notification: JSON.stringify(payload)
            }).eq('reference_id', qrisRow.reference_id);

            return res.status(200).json({
              success: true,
              matched: false,
              duplicate: true,
              message: 'Booking sudah lunas sebelumnya. Pembayaran baru ditandai DUPLICATE_PAYMENT.'
            });
          }

          const paidBase = Number(qrisRow.base_amount) || (Number(qrisRow.total_amount) - (Number(qrisRow.unique_code) || 0));
          const requiredPrice = Number(bData.total_price || 0);

          if (requiredPrice <= 0 || paidBase < requiredPrice) {
            console.warn(`[SECURITY ALERT] Pembayaran kurang untuk booking ${qrisRow.booking_id}: Dibayar dasar Rp ${paidBase}, Tagihan resmi Rp ${requiredPrice}`);
            await supabase.from('qris_payments').update({
              status: 'UNDERPAID',
              raw_notification: JSON.stringify(payload)
            }).eq('reference_id', qrisRow.reference_id);

            return res.status(200).json({
              success: true,
              matched: false,
              underpaid: true,
              message: `Nominal pembayaran tidak mencukupi harga resmi booking (Rp ${paidBase} < Rp ${requiredPrice}). Tagihan ditandai UNDERPAID.`
            });
          }

          // Update booking terlebih dahulu (Fail-Closed)
          const { error: bUpdateErr } = await supabase.from('bookings').update({
            booking_status: 'CONFIRMED',
            payment_status: 'PAID',
            payment_method: 'QRIS'
          }).eq('id', qrisRow.booking_id);

          if (bUpdateErr) {
            console.error(`[SEC-001 Error] Gagal update status booking ${qrisRow.booking_id}:`, bUpdateErr.message);
            await supabase.from('qris_payments').update({
              status: 'REVIEW_REQUIRED',
              raw_notification: JSON.stringify(payload)
            }).eq('reference_id', qrisRow.reference_id);

            return res.status(500).json({
              success: false,
              message: 'Gagal memperbarui status booking ke database. Transaksi ditandai REVIEW_REQUIRED.'
            });
          }
        }

        // Update qris_payments menjadi PAID
        await supabase
          .from('qris_payments')
          .update({
            status: 'PAID',
            paid_at: now.toISOString(),
            raw_notification: JSON.stringify(payload)
          })
          .eq('reference_id', qrisRow.reference_id);

        matched = true;
        matchDetails = qrisRow;

        // Jika tipe TIP dan ada barber_id, update tip barber
        if (qrisRow.type === 'TIP' && qrisRow.barber_id) {
          try {
            const { data: bData } = await supabase
              .from('barbers')
              .select('id, tip_balance, tips_history')
              .eq('id', qrisRow.barber_id)
              .maybeSingle();

            if (bData) {
              const currentBal = Number(bData.tip_balance) || 0;
              const history = Array.isArray(bData.tips_history) ? bData.tips_history : [];
              const cleanAmount = Number(qrisRow.base_amount) || (Number(qrisRow.total_amount) - (Number(qrisRow.unique_code) || 0)) || Number(qrisRow.total_amount);
              const newTipItem = {
                id: `tip-${Date.now()}`,
                date: now.toISOString(),
                customerName: qrisRow.customer_name || 'Pelanggan Setia',
                amount: cleanAmount,
                coffeeLabel: 'Kopi',
                message: 'Tip masuk via QRIS Listener',
                method: 'Payment Gateway QRIS'
              };
              await supabase.from('barbers').update({
                tip_balance: currentBal + cleanAmount,
                tips_history: [newTipItem, ...history]
              }).eq('id', bData.id);
            }
          } catch (tipErr) {
            console.warn('Tip balance update notice:', tipErr.message);
          }
        }

        // Jika tipe PLAN upgrade dan ada barber_id, update plan barber otomatis
        if (qrisRow.type?.startsWith('PLAN_') && qrisRow.barber_id) {
          try {
            const targetPlan = qrisRow.type.replace('PLAN_', '').toLowerCase() === 'barber' ? 'barber' : 'capster';
            let durationMonths = 1;
            const baseAmt = Number(qrisRow.base_amount) || (Number(qrisRow.total_amount) - (Number(qrisRow.unique_code) || 0)) || 0;
            if (targetPlan === 'barber') {
              if (baseAmt === 282000) durationMonths = 3;
              else if (baseAmt === 535000) durationMonths = 6;
              else if (baseAmt === 1009000) durationMonths = 12;
              else if (baseAmt === 267000) durationMonths = 3;
              else if (baseAmt === 534000) durationMonths = 6;
              else if (baseAmt === 1068000) durationMonths = 12;
            } else {
              if (baseAmt === 139000) durationMonths = 3;
              else if (baseAmt === 265000) durationMonths = 6;
              else if (baseAmt === 499000) durationMonths = 12;
              else if (baseAmt === 117000) durationMonths = 3;
              else if (baseAmt === 234000) durationMonths = 6;
              else if (baseAmt === 468000) durationMonths = 12;
            }

            // Hitung masa aktif baru (akumulatif jika langganan saat ini masih aktif)
            const { data: currentB } = await supabase
              .from('barbers')
              .select('id, plan, plan_expires_at, features')
              .eq('id', qrisRow.barber_id)
              .maybeSingle();

            const currentExp = currentB?.plan_expires_at || currentB?.features?.planExpiresAt;
            const isStillActive = currentExp && new Date(currentExp).getTime() > Date.now();
            const baseDate = isStillActive ? new Date(currentExp) : new Date();
            baseDate.setMonth(baseDate.getMonth() + durationMonths);
            const newExpiresAt = baseDate.toISOString();

            await supabase.from('barbers').update({
              plan: targetPlan,
              profile_type: targetPlan === 'barber' ? 'barbershop' : 'barber',
              plan_expires_at: newExpiresAt,
              features: {
                ...(currentB?.features || {}),
                plan: targetPlan,
                planExpiresAt: newExpiresAt,
                team: targetPlan === 'barber'
              }
            }).eq('id', qrisRow.barber_id);
            console.log(`[QRIS Webhook] Barber ${qrisRow.barber_id} berhasil di-upgrade ke ${targetPlan} selama ${durationMonths} bulan (berakhir ${newExpiresAt})!`);
          } catch (planErr) {
            console.warn('Plan upgrade update notice:', planErr.message);
          }
        }
      } else {
        // Anti-Replay: Periksa apakah notifikasi ini merupakan replay / duplikat dari pembayaran yang baru saja PAID
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
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
      }
    } catch (e) {
      console.error('[QRIS Webhook Table Error]:', e.message);
    }

    if (matched && matchDetails) {
      // Trigger notifikasi instan ke Grup Telegram
      sendTelegramPaymentNotification(matchDetails, targetAmount).catch(() => {});
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
