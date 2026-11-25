/**
 * QRIS Payment Gateway Client Helper & Dynamic QRIS Generator
 * Hardened for SEC-001: No local fake payment generation, strictly server-driven.
 */

export const MASTER_QRIS_STATIC = '00020101021126570011ID.DANA.WWW011893600915303714994002090371499400303UMI51440014ID.CO.QRIS.WWW0215ID10266433150900303UMI5204481453033605802ID5922Bayar Via Qris, Konter6006Bekasi6105173206304E9AE';

const API_BASE = '/api/payment/qris';

/**
 * Standard CRC16-CCITT calculation for EMVCo / ASPI QRIS
 */
export function crc16ccitt(str) {
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

/**
 * Convert Static QRIS String to Dynamic QRIS with exact amount (Tag 54)
 */
export function generateDynamicQris(amount, staticQris = MASTER_QRIS_STATIC) {
  if (!staticQris || typeof staticQris !== 'string') {
    staticQris = MASTER_QRIS_STATIC;
  }

  // Potong tag CRC 63 lama (8 karakter terakhir: 6304XXXX)
  let base = staticQris.trim();
  const crcIdx = base.lastIndexOf('6304');
  if (crcIdx !== -1) {
    base = base.slice(0, crcIdx);
  }

  // Ubah tipe 010211 (Statis) menjadi 010212 (Dinamis)
  base = base.replace('010211', '010212');

  // Format Tag 54 (Nominal Transaksi)
  const cleanAmt = Math.round(Number(amount) || 0);
  const amtStr = String(cleanAmt);
  const amtLen = amtStr.length < 10 ? '0' + amtStr.length : String(amtStr.length);
  const tag54 = '54' + amtLen + amtStr;

  // Sisipkan Tag 54 sebelum Tag 58 (5802ID)
  const idx58 = base.indexOf('5802ID');
  if (idx58 !== -1) {
    base = base.slice(0, idx58) + tag54 + base.slice(idx58);
  } else {
    base = base + tag54;
  }

  // Hitung ulang checksum CRC16-CCITT resmi
  const toSign = base + '6304';
  const newCrc = crc16ccitt(toSign);
  return toSign + newCrc;
}

/**
 * Dapatkan URL gambar QR code dinamis siap render di tag <img>
 */
export function getDynamicQrisImageUrl(amount, staticQris = MASTER_QRIS_STATIC) {
  const dynamicPayload = generateDynamicQris(amount, staticQris);
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(dynamicPayload)}`;
}

/**
 * Buat tagihan QRIS baru resmi melalui Backend Serverless / Express
 * SEC-001: Seluruh transaksi WAJIB dicatat oleh backend. Tidak ada fallback lokal.
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.success && data?.payment) {
        return data;
      }
      return {
        success: false,
        error: 'Respons server tidak mengembalikan instruksi pembayaran yang valid.'
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData?.message || errData?.error || `Gagal membuat tagihan QRIS (HTTP ${res.status}).`
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error('[QRIS Gateway Client Error]:', err.message);
    return {
      success: false,
      error: isTimeout
        ? 'Permintaan pembuatan tagihan QRIS melebihi batas waktu (timeout). Silakan periksa koneksi Anda dan coba lagi.'
        : 'Tidak dapat terhubung ke server pembayaran. Silakan periksa koneksi internet Anda dan coba lagi.'
    };
  }
}

/**
 * Cek status tagihan QRIS (Polling terpusat ke backend)
 */
export async function checkQrisPaymentStatus(referenceId) {
  if (!referenceId) {
    return { success: false, error: 'Reference ID diperlukan', status: 'PENDING' };
  }

  try {
    const res = await fetch(`${API_BASE}/status/${encodeURIComponent(referenceId)}`);
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData?.message || 'Gagal memeriksa status pembayaran',
      status: 'PENDING'
    };
  } catch (err) {
    console.error('[QRIS Polling Error]:', err.message);
    return { success: false, error: err.message, status: 'PENDING' };
  }
}

// Endpoint simulasi dinonaktifkan untuk mode produksi
export async function simulateQrisPayment() {
  return {
    success: false,
    status: 'FORBIDDEN',
    message: 'Fitur simulasi pembayaran telah dinonaktifkan di lingkungan produksi.'
  };
}
