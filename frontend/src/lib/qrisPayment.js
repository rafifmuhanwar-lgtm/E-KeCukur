/**
 * QRIS Listener Payment Gateway Client Helper & Dynamic QRIS Generator
 */

export const MASTER_QRIS_STATIC = '00020101021126610014COM.GO-JEK.WWW01189360091433186083620210G3186083620303UMI51440014ID.CO.QRIS.WWW0215ID10264903050790303UMI5204899953033605802ID5925BAYAR VIA QRIS, Digital &6006BEKASI61051732062070703A01630454CF';

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
    // Fallback jika backend offline: kalkulasi kode unik lokal
    const uniqueCode = Math.floor(100 + Math.random() * 899);
    const totalAmount = Number(amount) + uniqueCode;
    const dynamicQrisStr = generateDynamicQris(totalAmount);
    const dynamicQrImg = getDynamicQrisImageUrl(totalAmount);

    return {
      success: true,
      payment: {
        referenceId: `LOCAL-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`,
        baseAmount: Number(amount),
        uniqueCode,
        totalAmount,
        formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
        qrisString: dynamicQrisStr,
        qrisImageUrl: dynamicQrImg,
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
  if (!referenceId) {
    return { success: false, error: 'Reference ID diperlukan' };
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
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'ecukur_qris_secret_2026'
      },
      body: JSON.stringify({ referenceId, amount: Number(amount) || 0 })
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
