export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const defaultGroupId = (process.env.TELEGRAM_GROUP_ID || '-1004385368403').trim();

  if (!token) {
    return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured on server' });
  }

  try {
    const { message, chatId, type, barberName, amount, bankName, accountNumber, accountHolder, referenceId } = req.body || {};
    const targetChatId = chatId || defaultGroupId;

    let textToSend = message;

    if (!textToSend && type === 'WITHDRAWAL') {
      const nowStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
      textToSend = 
        `💸 <b>[PENARIKAN SALDO CAPSTER]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💈 <b>Barber:</b> ${barberName || 'Capster E-CUKUR'}\n` +
        `💰 <b>Nominal:</b> Rp ${Number(amount || 0).toLocaleString('id-ID')}\n` +
        `🏦 <b>Rekening:</b> ${bankName || 'BCA'} ${accountNumber || ''} (a.n ${accountHolder || ''})\n` +
        `🔖 <b>Ref:</b> <code>${referenceId || 'N/A'}</code>\n` +
        `🕒 <b>Waktu:</b> ${nowStr} WIB\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Pencairan saldo telah tercatat di sistem.</i>`;
    }

    if (!textToSend) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
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
