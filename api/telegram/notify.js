export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const defaultGroupId = (process.env.TELEGRAM_GROUP_ID || '-1004385368403').trim();
  const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '8633836292,7937839852')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token) {
    return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured on server' });
  }

  try {
    const { message, chatId, type, barberName, amount, bankName, accountNumber, accountHolder, referenceId } = req.body || {};

    // 1. Keamanan Chat ID: Hanya izinkan pengiriman ke Group ID resmi atau ID Admin resmi
    const allowedChatIds = new Set([defaultGroupId, ...adminIds]);
    const requestedChatId = chatId ? String(chatId).trim() : defaultGroupId;

    if (!allowedChatIds.has(requestedChatId)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Target chatId tidak diizinkan' });
    }

    let textToSend = '';

    // 2. Format template terstruktur (Withdrawal)
    if (type === 'WITHDRAWAL') {
      const cleanAmt = Number(amount) || 0;
      if (cleanAmt <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid withdrawal amount' });
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
      textToSend = 
        `💸 <b>[PENARIKAN SALDO CAPSTER]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💈 <b>Barber:</b> ${barberName || 'Capster E-CUKUR'}\n` +
        `💰 <b>Nominal:</b> Rp ${cleanAmt.toLocaleString('id-ID')}\n` +
        `🏦 <b>Rekening:</b> ${bankName || 'BCA'} ${accountNumber || ''} (a.n ${accountHolder || ''})\n` +
        `🔖 <b>Ref:</b> <code>${referenceId || 'N/A'}</code>\n` +
        `🕒 <b>Waktu:</b> ${nowStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Pencairan saldo telah tercatat di sistem.</i>`;
    } else if (message && typeof message === 'string') {
      // Jika pesan custom dikirim, wajibkan API Key internal untuk mencegah pembajakan pesan
      const authHeader = req.headers['x-api-key'] || req.headers.authorization;
      const expectedSecret = process.env.QRIS_WEBHOOK_SECRET || process.env.ADMIN_SECRET_KEY;
      if (expectedSecret && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Custom message requires authorization' });
      }
      textToSend = message.slice(0, 1000);
    } else {
      return res.status(400).json({ success: false, error: 'Valid notification type is required' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: requestedChatId,
        text: textToSend,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return res.status(response.ok ? 200 : 400).json({ success: response.ok, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

