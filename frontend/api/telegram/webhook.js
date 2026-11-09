import { createClient } from '@supabase/supabase-js';

const DEFAULT_ADMIN_IDS = ['8633836292', '7937839852'];
const DEFAULT_GROUP_ID = '-1004385368403';

function getBotToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
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

const inlineKeyboardMain = {
  inline_keyboard: [
    [
      { text: '📊 Transaksi Hari Ini', callback_data: 'cb_today' },
      { text: '⏳ Antrean Pending', callback_data: 'cb_pending' }
    ],
    [
      { text: '📜 10 Transaksi Baru', callback_data: 'cb_transactions' },
      { text: '💸 Penarikan Saldo', callback_data: 'cb_withdrawals' }
    ],
    [
      { text: '🔄 Cek Status Server', callback_data: 'cb_status' },
      { text: '🌐 Dashboard Admin', url: 'https://ecukur.biz.id/admin/dashboard' }
    ]
  ]
};

async function sendTelegramMessage(chatId, text, parseMode = 'HTML', replyMarkup = null) {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text
  };
  if (parseMode) body.parse_mode = parseMode;
  if (replyMarkup) body.reply_markup = replyMarkup;

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

async function answerCallbackQuery(callbackQueryId, text = '') {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text
      })
    });
  } catch {}
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

// ─── QUERY HELPERS ───

async function getTodaySummaryText(supabase) {
  if (!supabase) return '❌ Database Supabase belum terhubung.';
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

    return (
      `📅 <b>Ringkasan Transaksi Hari Ini (${range.date})</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `✅ <b>LUNAS (PAID):</b> ${countMap.PAID || 0}\n` +
      `⏳ <b>PENDING:</b> ${countMap.PENDING || 0}\n` +
      `❌ <b>EXPIRED / GAGAL:</b> ${(countMap.EXPIRED || 0) + (countMap.FAILED || 0) + (countMap.CANCELLED || 0)}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `Ketik <code>/pending</code> atau tap tombol untuk rincian.`
    );
  } catch (e) {
    return `❌ Gagal memuat data hari ini: ${e.message}`;
  }
}

async function getPendingPaymentsText(supabase) {
  if (!supabase) return '❌ Database Supabase belum terhubung.';
  try {
    const { data, error } = await supabase
      .from('qris_payments')
      .select('reference_id,total_amount,created_at,type')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) {
      return '✓ Tidak ada tagihan QRIS yang berstatus PENDING saat ini.';
    }

    let msg = `⏳ <b>DAFTAR PEMBAYARAN PENDING (${data.length}):</b>\n━━━━━━━━━━━━━━━━━━━\n`;
    data.forEach((item, idx) => {
      const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit'
      });
      msg += `${idx + 1}. <code>${item.reference_id}</code>\n   💰 Rp ${(item.total_amount || 0).toLocaleString('id-ID')} | 🕒 ${timeStr} WIB\n`;
    });
    msg += `\nKetik <code>/details &lt;REF&gt;</code> untuk rincian lengkap.`;
    return msg;
  } catch (e) {
    return `❌ Gagal memuat daftar pending: ${e.message}`;
  }
}

async function getRecentTransactionsText(supabase) {
  if (!supabase) return '❌ Database Supabase belum terhubung.';
  try {
    const { data, error } = await supabase
      .from('qris_payments')
      .select('reference_id,total_amount,status,created_at,type')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) {
      return 'Belum ada riwayat transaksi QRIS.';
    }

    let msg = `📜 <b>10 TRANSAKSI TERBARU:</b>\n━━━━━━━━━━━━━━━━━━━\n`;
    data.forEach((item, idx) => {
      const badge = item.status === 'PAID' ? '✅' : item.status === 'PENDING' ? '⏳' : '❌';
      msg += `${idx + 1}. ${badge} <code>${item.reference_id}</code>\n   Rp ${(item.total_amount || 0).toLocaleString('id-ID')} [${item.status}]\n`;
    });
    return msg;
  } catch (e) {
    return `❌ Gagal memuat riwayat transaksi: ${e.message}`;
  }
}

async function getWithdrawalsText(supabase) {
  if (!supabase) return '❌ Database belum terhubung.';
  try {
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select('id, name, withdrawals_history, payout_account')
      .limit(50);

    if (error) throw error;

    let allWithdrawals = [];
    (barbers || []).forEach((b) => {
      const list = Array.isArray(b.withdrawals_history) ? b.withdrawals_history : [];
      list.forEach((w) => {
        allWithdrawals.push({
          ...w,
          barberName: b.name
        });
      });
    });

    allWithdrawals.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (allWithdrawals.length === 0) {
      return '✓ Belum ada riwayat penarikan saldo dari capster.';
    }

    let msg = `💸 <b>RIWAYAT PENARIKAN SALDO CAPSTER:</b>\n━━━━━━━━━━━━━━━━━━━\n`;
    allWithdrawals.slice(0, 10).forEach((w, idx) => {
      const dateStr = w.date
        ? new Date(w.date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
        : '-';
      const statusIcon = (w.status || '').toLowerCase().includes('berhasil') ? '✅' : '⏳';
      msg += `${idx + 1}. ${statusIcon} <b>${w.barberName}</b>\n`;
      msg += `   💰 Rp ${(Number(w.amount) || 0).toLocaleString('id-ID')} | 🏦 ${w.bankName || 'BCA'} ${w.accountNumber || ''} (a.n ${w.accountHolder || '-'})\n`;
      msg += `   📅 ${dateStr} • Status: <i>${w.status || 'Diproses'}</i>\n`;
    });
    return msg;
  } catch (e) {
    return `❌ Gagal memuat data penarikan: ${e.message}`;
  }
}

async function searchCustomerText(supabase, keyword) {
  if (!supabase) return '❌ Database belum terhubung.';
  if (!keyword || keyword.trim().length < 2) {
    return 'ℹ️ Masukkan kata kunci pencarian minimal 2 karakter.\nContoh: <code>/cari 0812</code> atau <code>/cari Dimas</code>';
  }

  const cleanKw = keyword.trim();
  try {
    // 1. Cari di tabel bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, customer_name, customer_phone, service_name, barber_name, date, time, total_price, booking_status, payment_status')
      .or(`customer_name.ilike.%${cleanKw}%,customer_phone.ilike.%${cleanKw}%,id.ilike.%${cleanKw}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (bookings && bookings.length > 0) {
      let msg = `🔎 <b>HASIL PENCARIAN PELANGGAN ("${cleanKw}"):</b>\n━━━━━━━━━━━━━━━━━━━\n`;
      bookings.forEach((b, idx) => {
        const lunas = b.payment_status === 'PAID' ? '✅ Lunas (QRIS)' : '⏳ Belum Bayar';
        msg += `<b>${idx + 1}. ${b.customer_name || 'Pelanggan'}</b> (<code>${b.customer_phone || '-'}</code>)\n`;
        msg += `   💈 Barber: ${b.barber_name || '-'}\n`;
        msg += `   ✂️ Layanan: ${b.service_name || '-'}\n`;
        msg += `   📅 Jadwal: ${b.date || '-'} jam ${b.time || '-'} WIB\n`;
        msg += `   💰 Rp ${(Number(b.total_price) || 0).toLocaleString('id-ID')} [${lunas}]\n`;
        msg += `   📌 Status Booking: <b>${b.booking_status || 'CONFIRMED'}</b>\n\n`;
      });
      return msg;
    }

    // 2. Fallback: Cari di tabel qris_payments
    const { data: qrisList } = await supabase
      .from('qris_payments')
      .select('reference_id, customer_name, total_amount, status, created_at')
      .or(`customer_name.ilike.%${cleanKw}%,reference_id.ilike.%${cleanKw}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (qrisList && qrisList.length > 0) {
      let msg = `🔎 <b>HASIL DITEMUKAN PADA TAGIHAN QRIS ("${cleanKw}"):</b>\n━━━━━━━━━━━━━━━━━━━\n`;
      qrisList.forEach((q, idx) => {
        msg += `<b>${idx + 1}. ${q.customer_name || 'Pelanggan'}</b>\n`;
        msg += `   🔖 Ref: <code>${q.reference_id}</code>\n`;
        msg += `   💰 Rp ${(Number(q.total_amount) || 0).toLocaleString('id-ID')}\n`;
        msg += `   📌 Status: <b>${q.status}</b>\n\n`;
      });
      return msg;
    }

    return `🔍 Tidak ditemukan data booking atau pembayaran dengan kata kunci <b>"${cleanKw}"</b>.`;
  } catch (e) {
    return `❌ Gagal mencari data: ${e.message}`;
  }
}

async function getStatusText(supabase) {
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
  return (
    `📊 <b>STATUS SISTEM E-CUKUR</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `• <b>Telegram Bot:</b> ONLINE (Vercel Serverless 24/7)\n` +
    `• <b>Backend API:</b> ONLINE (https://ecukur.biz.id)\n` +
    `• <b>Supabase DB:</b> ${supabaseStatus}\n` +
    `• <b>Target Alert Grup:</b> <code>${groupId}</code>\n` +
    `• <b>Payment Monitoring:</b> AKTIF\n` +
    `• <b>Jam Server:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`
  );
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

  const supabase = makeSupabaseClient();
  const adminIds = getAdminIds();

  // ─── A. INTERCEPT INLINE KEYBOARD CALLBACK QUERIES (FITUR #2) ───
  if (update?.callback_query) {
    const cb = update.callback_query;
    const fromId = String(cb.from?.id || '');
    const chatId = cb.message?.chat?.id || fromId;
    const data = cb.data;

    await answerCallbackQuery(cb.id);

    if (!adminIds.includes(fromId)) {
      await sendTelegramMessage(chatId, '⚠️ Hanya admin yang dapat menggunakan menu ini.');
      return res.status(200).json({ ok: true });
    }

    if (data === 'cb_today') {
      const text = await getTodaySummaryText(supabase);
      await sendTelegramMessage(chatId, text, 'HTML', inlineKeyboardMain);
      return res.status(200).json({ ok: true });
    }

    if (data === 'cb_pending') {
      const text = await getPendingPaymentsText(supabase);
      await sendTelegramMessage(chatId, text, 'HTML', inlineKeyboardMain);
      return res.status(200).json({ ok: true });
    }

    if (data === 'cb_transactions') {
      const text = await getRecentTransactionsText(supabase);
      await sendTelegramMessage(chatId, text, 'HTML', inlineKeyboardMain);
      return res.status(200).json({ ok: true });
    }

    if (data === 'cb_withdrawals') {
      const text = await getWithdrawalsText(supabase);
      await sendTelegramMessage(chatId, text, 'HTML', inlineKeyboardMain);
      return res.status(200).json({ ok: true });
    }

    if (data === 'cb_status') {
      const text = await getStatusText(supabase);
      await sendTelegramMessage(chatId, text, 'HTML', inlineKeyboardMain);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  }

  // ─── B. HANDLE REGULAR TEXT MESSAGES ───
  const message = update?.message || update?.edited_message || update?.channel_post;
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const fromUser = message.from;
  const fromUserId = fromUser ? String(fromUser.id) : '';
  const isAdmin = adminIds.includes(fromUserId);
  const text = message.text.trim();

  // Pisahkan perintah dan argumen
  const parts = text.split(/\s+/);
  const command = (parts[0] || '').toLowerCase().replace(/@.+$/, '');
  const args = parts.slice(1).join(' ').trim();
  const arg1 = parts[1] || '';

  // ─── /start & /help ───
  if (command === '/start' || command === '/help' || command === '/menu') {
    const helpMsg = 
      `💈 <b>ecukur Payment Monitor Bot</b> (Serverless 24/7)\n\n` +
      `Bot monitoring pembayaran QRIS otomatis E-CUKUR siap digunakan.\n\n` +
      `<b>Fitur & Perintah Cepat:</b>\n` +
      `• <code>/today</code> - Ringkasan transaksi QRIS hari ini\n` +
      `• <code>/pending</code> - Daftar pembayaran pending\n` +
      `• <code>/transactions</code> - 10 riwayat transaksi terbaru\n` +
      `• <code>/withdrawals</code> - Cek riwayat penarikan saldo capster\n` +
      `• <code>/cari &lt;no hp/nama&gt;</code> - Cari riwayat booking pelanggan\n` +
      `• <code>/status</code> - Kondisi server & database\n` +
      `• <code>/details &lt;REF&gt;</code> - Cek detail pembayaran spesifik\n` +
      `• <code>/testgroup</code> - Kirim notifikasi uji coba ke grup alert\n\n` +
      `<i>Pilih menu di bawah untuk akses cepat:</i>`;
    
    await sendTelegramMessage(chatId, helpMsg, 'HTML', inlineKeyboardMain);
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

  // ─── /status ───
  if (command === '/status' || command === '/health') {
    const statusMsg = await getStatusText(supabase);
    await sendTelegramMessage(chatId, statusMsg, 'HTML', inlineKeyboardMain);
    return res.status(200).json({ ok: true });
  }

  // ─── /today ───
  if (command === '/today') {
    const todayMsg = await getTodaySummaryText(supabase);
    await sendTelegramMessage(chatId, todayMsg, 'HTML', inlineKeyboardMain);
    return res.status(200).json({ ok: true });
  }

  // ─── /pending ───
  if (command === '/pending') {
    const pendingMsg = await getPendingPaymentsText(supabase);
    await sendTelegramMessage(chatId, pendingMsg, 'HTML', inlineKeyboardMain);
    return res.status(200).json({ ok: true });
  }

  // ─── /transactions ───
  if (command === '/transactions') {
    const txMsg = await getRecentTransactionsText(supabase);
    await sendTelegramMessage(chatId, txMsg, 'HTML', inlineKeyboardMain);
    return res.status(200).json({ ok: true });
  }

  // ─── /withdrawals & /tarik (FITUR #4) ───
  if (command === '/withdrawals' || command === '/tarik') {
    const wdMsg = await getWithdrawalsText(supabase);
    await sendTelegramMessage(chatId, wdMsg, 'HTML', inlineKeyboardMain);
    return res.status(200).json({ ok: true });
  }

  // ─── /cari (FITUR #5) ───
  if (command === '/cari' || command === '/search') {
    if (!args) {
      await sendTelegramMessage(
        chatId,
        'ℹ️ Masukkan nomor HP atau nama pelanggan yang ingin dicari.\nContoh: <code>/cari 08123456789</code> atau <code>/cari Dimas</code>',
        'HTML'
      );
      return res.status(200).json({ ok: true });
    }

    const searchMsg = await searchCustomerText(supabase, args);
    await sendTelegramMessage(chatId, searchMsg, 'HTML', inlineKeyboardMain);
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

      await sendTelegramMessage(chatId, detailMsg, 'HTML', inlineKeyboardMain);
    } catch (e) {
      await sendTelegramMessage(chatId, `❌ Gagal mencari detail pembayaran: ${e.message}`);
    }
    return res.status(200).json({ ok: true });
  }

  // Perintah tidak dikenal
  await sendTelegramMessage(
    chatId,
    `Perintah tidak dikenal. Ketik <code>/help</code> atau pilih menu di bawah.`,
    'HTML',
    inlineKeyboardMain
  );

  return res.status(200).json({ ok: true });
}
