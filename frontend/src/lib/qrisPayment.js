/**
 * QRIS Listener Payment Gateway Client Helper
 */

const API_BASE = '/api/payment/qris';

/**
 * Buat tagihan QRIS baru dengan kode unik acak 3 digit
 */
export async function createQrisPayment({
  type = 'BOOKING',
  amount,
  bookingId = null,
  barberId = null,
  customerName = 'Pelanggan',
  customerPhone = '',
  qrisImageUrl = null
}) {
  try {
    const res = await fetch(`${API_BASE}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount: Number(amount) || 0,
        bookingId,
        barberId,
        customerName,
        customerPhone,
        qrisImageUrl
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('createQrisPayment error:', err);
    // Fallback jika backend offline: kalkulasi kode unik lokal
    const uniqueCode = Math.floor(100 + Math.random() * 899);
    const totalAmount = Number(amount) + uniqueCode;
    return {
      success: true,
      payment: {
        referenceId: `LOCAL-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`,
        baseAmount: Number(amount),
        uniqueCode,
        totalAmount,
        formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    };
  }
}

/**
 * Cek status tagihan QRIS (Polling)
 */
export async function checkQrisPaymentStatus(referenceId) {
  if (!referenceId || referenceId.startsWith('LOCAL-')) {
    return { success: true, status: 'PENDING' };
  }
  try {
    const res = await fetch(`${API_BASE}/status/${encodeURIComponent(referenceId)}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Simulasi webhook pembayaran (untuk testing dev tanpa uang asli)
 */
export async function simulateQrisPayment(referenceId, amount) {
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceId, amount })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

