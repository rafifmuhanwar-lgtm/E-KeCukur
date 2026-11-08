import { createClient } from '@supabase/supabase-js';

const DEFAULT_BOT_TOKEN = '9097305625:AAErXwtUFsUDMyEtgNOWkocERssk3_kKFLw';
const DEFAULT_ADMIN_IDS = ['8633836292', '7937839852'];
const DEFAULT_GROUP_ID = '-1004385368403';

function getBotToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
}

function getAdminIds() {
  const envAdmins = process.env.TELEGRAM_ADMIN_IDS;
  if (!envAdmins) return DEFAULT_ADMIN_IDS;
  return envAdmins.split(',').map((id) => id.trim()).filter(Boolean);
}

function getGroupId() {
  return (process.env.TELEGRAM_GROUP_ID || DEFAULT_GROUP_ID).trim();
}

function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://natgqaksuousldfxydnr.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function sendTelegramMessage(chatId, text, parseMode = '') {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text
  };
  if (parseMode) {
    body.parse_mode = parseMode;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram Webhook] Failed to send message:', err);
    return null;
  }
}

function jakartaDateRange() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const [year, month, day] = date.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { date, start: start.toISOString(), end: end.toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // ─── 1. SETUP / STATUS VIA GET REQUEST ───
  if (req.method === 'GET') {
    const action = req.query.action;
    const token = getBotToken();

    if (action === 'set') {
      const webhookUrl = `https://ecukur.biz.id/api/telegram/webhook`;
      const tgRes = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      const data = await tgRes.json();
      return res.status(200).json({
        success: data.ok,
        message: data.description || 'Webhook set result',
        webhookUrl,
        telegramResponse: data
      });
    }

    if (action === 'info') {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = await tgRes.json();
      return res.status(200).json(data);
    }

    return res.status(200).json({
      status: 'active',
      service: 'ecukur-telegram-webhook',
      mode: 'Vercel Serverless (24/7 Always ON)'
    });
  }

  // ─── 2. HANDLE TELEGRAM UPDATE VIA POST ───
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let update = req.body;
  if (typeof update === 'string') {
    try {
      update = JSON.parse(update);
    } catch {
      return res.status(400).send('Invalid JSON');
    }
  }

  const message = update?.message || update?.edited_message || update?.channel_post;
  if (!message || !message.text) {
    // Akui update non-pesan agar Telegram tidak retry
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const fromUser = message.from;
  const fromUserId = fromUser ? String(fromUser.id) : '';
  const adminIds = getAdminIds();
  const isAdmin = adminIds.includes(fromUserId);
  const text = message.text.trim();

  // Pisahkan perintah dan argumen
  const parts = text.split(/\s+/);
  const command = (parts[0] || '').toLowerCase().replace(/@.+$/, ''); // hilangkan @botusername
  const arg1 = parts[1] || '';

  // ─── /start & /help (Dapat diakses siapa saja) ───
  if (command === '/start' || command === '/help') {
    const helpMsg = 
      `💈 <b>ecukur Payment Monitor Bot</b> (Serverless 24/7)\n\n` +
      `Bot monitoring pembayaran QRIS otomatis E-CUKUR siap digunakan.\n\n` +
      `<b>Daftar Perintah Admin:</b>\n` +
      `• <code>/status</code> - Status koneksi bot & backend\n` +
      `• <code>/today</code> - Ringkasan transaksi QRIS hari ini\n` +
      `• <code>/pending</code> - Daftar pembayaran pending\n` +
      `• <code>/failed</code> - Daftar transaksi gagal / expired\n` +
      `• <code>/transactions</code> - 10 riwayat transaksi terbaru\n` +
      `• <code>/details &lt;REF&gt;</code> - Cek detail pembayaran spesifik\n` +
      `• <code>/groupid</code> - Menampilkan ID chat / grup Telegram saat ini\n` +
      `• <code>/testgroup</code> - Kirim pesan uji coba ke grup alert\n` +
      `• <code>/help</code> - Menampilkan panduan ini`;
    
    await sendTelegramMessage(chatId, helpMsg, 'HTML');
    return res.status(200).json({ ok: true });
  }

  // ─── /groupid ───
  if (command === '/groupid') {
    await sendTelegramMessage(chatId, `📍 Chat ID ini adalah: <code>${chatId}</code>`, 'HTML');
    return res.status(200).json({ ok: true });
  }

  // Validasi Admin untuk perintah sensitif lainnya
  if (!isAdmin) {
    await sendTelegramMessage(
      chatId,
      `⚠️ Perintah ini hanya dapat diakses oleh Admin resmi ecukur.\nID Telegram kamu: <code>${fromUserId || 'Tidak terdeteksi'}</code>`,
      'HTML'
    );
    return res.status(200).json({ ok: true });
  }

  const supabase = makeSupabaseClient();

  // ─── /status ───
  if (command === '/status' || command === '/health') {
    let supabaseStatus = 'DISCONNECTED';
    if (supabase) {
      try {
        const { error } = await supabase
          .from('qris_payments')
          .select('reference_id', { head: true, count: 'exact' })
          .limit(1);
        supabaseStatus = error ? 'ERROR' : 'CONNECTED';
      } catch {
        supabaseStatus = 'ERROR';
      }
    }

    const groupId = getGroupId();
    const statusMsg = 
      `📊 <b>STATUS SISTEM E-CUKUR</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `• <b>Telegram Bot:</b> ONLINE (Vercel Serverless 24/7)\n` +
      `• <b>Backend API:</b> ONLINE (https://ecukur.biz.id)\n` +
      `• <b>Supabase DB:</b> ${supabaseStatus}\n` +
      `• <b>Target Alert Grup:</b> <code>${groupId}</code>\n` +
      `• <b>Payment Monitoring:</b> AKTIF\n` +
      `• <b>Jam Server:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    await sendTelegramMessage(chatId, statusMsg, 'HTML');
    return res.status(200).json({ ok: true });
  }

  // ─── /testgroup ───
  if (command === '/testgroup') {
    const groupId = getGroupId();
    if (!groupId) {
      await sendTelegramMessage(chatId, '❌ TELEGRAM_GROUP_ID belum dikonfigurasi.');
      return res.status(200).json({ ok: true });
    }

    const testRes = await sendTelegramMessage(
      groupId,
      `🔔 <b>[TEST NOTIFIKASI]</b>\nKoneksi bot E-CUKUR ke grup alert Telegram berhasil berfungsi normal!`,
      'HTML'
    );

    if (testRes?.ok) {
      await sendTelegramMessage(chatId, `✓ Pesan tes berhasil dikirim ke grup (ID: ${groupId})`);
    } else {
      await sendTelegramMessage(chatId, `❌ Gagal mengirim ke grup: ${testRes?.description || 'Pastikan bot sudah dimasukkan ke grup!'}`);
    }
    return res.status(200).json({ ok: true });
  }

  // ─── /today ───
  if (command === '/today') {
    if (!supabase) {
      await sendTelegramMessage(chatId, '❌ Supabase belum terkonfigurasi.');
      return res.status(200).json({ ok: true });
    }

    const range = jakartaDateRange();
    const statuses = ['PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED'];

    try {
      const counts = await Promise.all(
        statuses.map(async (st) => {
          const { count } = await supabase
            .from('qris_payments')
            .select('reference_id', { count: 'exact', head: true })
            .eq('status', st)
            .gte('created_at', range.start)
            .lt('created_at', range.end);
          return [st, count || 0];
        })
      );
      const countMap = Object.fromEntries(counts);

      const todayMsg =
        `📅 <b>Ringkasan Transaksi Hari Ini (${range.date})</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `✅ <b>LUNAS (PAID):</b> ${countMap.PAID || 0}\n` +
        `⏳ <b>PENDING:</b> ${countMap.PENDING || 0}\n` +
        `❌ <b>EXPIRED / GAGAL:</b> ${(countMap.EXPIRED || 0) + (countMap.FAILED || 0) + (countMap.CANCELLED || 0)}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Ketik <code>/pending</code> untuk daftar antrean belum bayar.`;

      await sendTelegramMessage(chatId, todayMsg, 'HTML');
    } catch (e) {
      await sendTelegramMessage(chatId, `❌ Gagal memuat data transaksi hari ini: ${e.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // ─── /pending ───
  if (command === '/pending') {
    if (!supabase) {
      await sendTelegramMessage(chatId, '❌ Supabase belum terkonfigurasi.');
      return res.status(200).json({ ok: true });
    }

    try {
      const { data, error } = await supabase
        .from('qris_payments')
        .select('reference_id,total_amount,created_at,type')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        await sendTelegramMessage(chatId, '✓ Tidak ada tagihan QRIS yang berstatus PENDING saat ini.');
        return res.status(200).json({ ok: true });
      }

      let msg = `⏳ <b>DAFTAR PEMBAYARAN PENDING (${data.length}):</b>\n━━━━━━━━━━━━━━━━━━━\n`;
      data.forEach((item, idx) => {
        const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
        msg += `${idx + 1}. <code>${item.reference_id}</code>\n   💰 Rp ${(item.total_amount || 0).toLocaleString('id-ID')} | 🕒 ${timeStr} WIB\n`;
      });
      msg += `\nKetik <code>/details &lt;REF&gt;</code> untuk rincian lengkap.`;

      await sendTelegramMessage(chatId, msg, 'HTML');
    } catch (e) {
      await sendTelegramMessage(chatId, `❌ Gagal mengambil daftar pending: ${e.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // ─── /transactions ───
  if (command === '/transactions') {
    if (!supabase) {
      await sendTelegramMessage(chatId, '❌ Supabase belum terkonfigurasi.');
      return res.status(200).json({ ok: true });
    }

    try {
      const { data, error } = await supabase
        .from('qris_payments')
        .select('reference_id,total_amount,status,created_at,type')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        await sendTelegramMessage(chatId, 'Belum ada riwayat transaksi QRIS.');
        return res.status(200).json({ ok: true });
      }

      let msg = `📜 <b>10 TRANSAKSI TERBARU:</b>\n━━━━━━━━━━━━━━━━━━━\n`;
      data.forEach((item, idx) => {
        const badge = item.status === 'PAID' ? '✅' : item.status === 'PENDING' ? '⏳' : '❌';
        msg += `${idx + 1}. ${badge} <code>${item.reference_id}</code>\n   Rp ${(item.total_amount || 0).toLocaleString('id-ID')} [${item.status}]\n`;
      });

      await sendTelegramMessage(chatId, msg, 'HTML');
    } catch (e) {
      await sendTelegramMessage(chatId, `❌ Gagal mengambil riwayat transaksi: ${e.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // ─── /details <REF> ───
  if (command === '/details') {
    if (!arg1) {
      await sendTelegramMessage(chatId, 'ℹ️ Format salah. Contoh: <code>/details ECK-Q-123456</code>', 'HTML');
      return res.status(200).json({ ok: true });
    }

    if (!supabase) {
      await sendTelegramMessage(chatId, '❌ Supabase belum terkonfigurasi.');
      return res.status(200).json({ ok: true });
    }

    try {
      const { data, error } = await supabase
        .from('qris_payments')
        .select('reference_id,total_amount,status,created_at,paid_at,type,booking_id')
        .eq('reference_id', arg1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await sendTelegramMessage(chatId, `❌ Transaksi dengan reference <code>${arg1}</code> tidak ditemukan.`, 'HTML');
        return res.status(200).json({ ok: true });
      }

      const createdTime = new Date(data.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const paidTime = data.paid_at ? new Date(data.paid_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';

      const detailMsg =
        `🔍 <b>DETAIL PEMBAYARAN</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `• <b>Reference:</b> <code>${data.reference_id}</code>\n` +
        `• <b>Status:</b> ${data.status === 'PAID' ? '✅ LUNAS (PAID)' : data.status}\n` +
        `• <b>Nominal:</b> Rp ${(data.total_amount || 0).toLocaleString('id-ID')}\n` +
        `• <b>Tipe:</b> ${data.type || 'BOOKING'}\n` +
        `• <b>Dibuat:</b> ${createdTime} WIB\n` +
        `• <b>Lunas Pada:</b> ${paidTime} WIB\n`;

      await sendTelegramMessage(chatId, detailMsg, 'HTML');
    } catch (e) {
      await sendTelegramMessage(chatId, `❌ Gagal mencari detail pembayaran: ${e.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // Perintah tidak dikenal
  await sendTelegramMessage(
    chatId,
    `Perintah tidak dikenal. Ketik <code>/help</code> untuk melihat daftar perintah.`,
    'HTML'
  );

  return res.status(200).json({ ok: true });
}
