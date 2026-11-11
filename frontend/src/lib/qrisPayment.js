/**
 * QRIS Listener Payment Gateway Client Helper & Dynamic QRIS Generator
 */
import { isSupabaseConfigured, supabase } from './supabase';

export const MASTER_QRIS_STATIC = '00020101021126610014COM.GO-JEK.WWW01189360091433186083620210G3186083620303UMI51440014ID.CO.QRIS.WWW0215ID10264903050790303UMI5204899953033605802ID5925BAYAR VIA QRIS, Digital &6006BEKASI61051732062070703A01630454CF';

const API_BASE = '/api/payment/qris';

// Memory & session store untuk fallback offline / local testing
const localPayments = new Map();

function saveLocalPayment(payment) {
  if (!payment?.referenceId) return;
  localPayments.set(payment.referenceId, payment);
  try {
    sessionStorage.setItem(`qris_${payment.referenceId}`, JSON.stringify(payment));
  } catch {}
}

function getLocalPayment(referenceId) {
  if (!referenceId) return null;
  if (localPayments.has(referenceId)) return localPayments.get(referenceId);
  try {
    const raw = sessionStorage.getItem(`qris_${referenceId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      localPayments.set(referenceId, parsed);
      return parsed;
    }
  } catch {}
  return null;
}

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
  // 1. Coba hubungi backend API (Production / Vercel Serverless / Active Backend)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

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
      const data = await res.json();
      if (data?.success && data?.payment) {
        return data;
      }
    }
  } catch (err) {
    // Backend offline / network timeout / proxy error -> Gunakan fallback lokal
  }

  // 2. Fallback Otomatis: Buat tagihan QRIS dinamis di browser secara instan
  const uniqueCode = Math.floor(100 + Math.random() * 899);
  const totalAmount = Number(amount) + uniqueCode;
  const dynamicQrisStr = generateDynamicQris(totalAmount);
  const dynamicQrImg = getDynamicQrisImageUrl(totalAmount);

  const localPayment = {
    referenceId: `LOCAL-${Date.now().toString(36).toUpperCase()}-${uniqueCode}`,
    type,
    bookingId,
    barberId,
    customerName,
    customerPhone,
    baseAmount: Number(amount),
    uniqueCode,
    totalAmount,
    formattedTotal: `Rp ${totalAmount.toLocaleString('id-ID')}`,
    qrisString: dynamicQrisStr,
    qrisImageUrl: dynamicQrImg,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  };
  saveLocalPayment(localPayment);

  // Jika Supabase terhubung di frontend, simpan juga ke tabel qris_payments agar sinkron
  try {
    if (isSupabaseConfigured && supabase) {
      supabase.from('qris_payments').insert({
        reference_id: localPayment.referenceId,
        type,
        booking_id: bookingId ? String(bookingId) : null,
        barber_id: barberId ? String(barberId) : null,
        customer_name: customerName,
        customer_phone: customerPhone,
        base_amount: Number(amount),
        unique_code: uniqueCode,
        total_amount: totalAmount,
        qris_image_url: dynamicQrImg,
        status: 'PENDING',
        expires_at: localPayment.expiresAt
      }).then(() => {}).catch(() => {});
    }
  } catch {}

  return {
    success: true,
    payment: localPayment
  };
}

/**
 * Cek status tagihan QRIS (Polling)
 */
export async function checkQrisPaymentStatus(referenceId) {
  if (!referenceId) {
    return { success: false, error: 'Reference ID diperlukan', status: 'PENDING' };
  }

  // Jika tagihan dibuat dalam mode lokal/offline (dimulai dengan 'LOCAL-')
  // JANGAN kirim ke proxy network agar tidak memicu AggregateError [ECONNREFUSED]
  if (referenceId.startsWith('LOCAL-')) {
    const local = getLocalPayment(referenceId);

    // Cek juga ke Supabase jika Supabase aktif
    try {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('qris_payments')
          .select('status, paid_at')
          .eq('reference_id', referenceId)
          .maybeSingle();
        if (data?.status === 'PAID') {
          if (local) {
            local.status = 'PAID';
            local.paidAt = data.paid_at;
            saveLocalPayment(local);
          }
          return { success: true, status: 'PAID', paidAt: data.paid_at };
        }
      }
    } catch {}

    return {
      success: true,
      status: local?.status || 'PENDING',
      paidAt: local?.paidAt || null,
      totalAmount: local?.totalAmount || null,
      type: local?.type || null
    };
  }

  try {
    const res = await fetch(`${API_BASE}/status/${encodeURIComponent(referenceId)}`);
    if (res.ok) {
      return await res.json();
    }
    return { success: true, status: 'PENDING' };
  } catch (err) {
    return { success: false, error: err.message, status: 'PENDING' };
  }
}

/**
 * Simulasi webhook pembayaran (untuk testing dev tanpa uang asli)
 */
export async function simulateQrisPayment(referenceId, amount) {
  // Tandai lokal dulu agar instan di client
  const local = getLocalPayment(referenceId) || {};
  local.status = 'PAID';
  local.paidAt = new Date().toISOString();
  saveLocalPayment(local);

  // Jika tagihan lokal, update Supabase jika ada & selesai
  if (referenceId?.startsWith('LOCAL-')) {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('qris_payments')
          .update({ status: 'PAID', paid_at: local.paidAt })
          .eq('reference_id', referenceId);
      }
    } catch {}
    return {
      success: true,
      status: 'PAID',
      message: 'Simulasi pembayaran lokal berhasil'
    };
  }

  // Jika tagihan server, panggil endpoint simulate
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ referenceId, amount: Number(amount) || 0 })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  return {
    success: true,
    status: 'PAID',
    message: 'Simulasi pembayaran fallback berhasil'
  };
}
