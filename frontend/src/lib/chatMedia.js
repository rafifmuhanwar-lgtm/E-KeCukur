import { supabase, isSupabaseConfigured } from './supabase';
import { compressImage } from './imageUploader';

export const BARBER_QUICK_REPLIES = [
  {
    id: 'alamat',
    title: '📍 Alamat Studio',
    text: 'Lokasi studio kami sangat strategis dengan area parkir luas dan nyaman. Silakan langsung mampir ya!'
  },
  {
    id: 'rekomendasi',
    title: '✂️ Rekomendasi Gaya Rambut',
    text: 'Untuk bentuk wajah kamu, model French Crop textured, Classic Side Part, atau Taper Fade sangat cocok dan rapi!'
  },
  {
    id: 'harga',
    title: '💈 Daftar Layanan & Tarif',
    text: 'Kami melayani: Haircut Reguler (45k), Beard Grooming (25k), dan Paket Komplit Potong + Keramas + Pijat Kepala (75k).'
  },
  {
    id: 'jam',
    title: '⏰ Jam Operasional',
    text: 'Studio kami buka setiap hari mulai pukul 09.00 sampai 21.00 WIB.'
  },
  {
    id: 'booking',
    title: '📅 Ajakan Booking Slot',
    text: 'Slot jadwal hari ini masih tersedia! Silakan langsung tentukan jam cukur lewat tombol Booking di profil saya ya.'
  },
  {
    id: 'perawatan',
    title: '🧴 Tips Perawatan Rambut',
    text: 'Agar gaya rambut tahan seharian dan tampak natural, kami sarankan gunakan matte clay atau water-based pomade setelah keramas.'
  }
];

/**
 * Format label pemisah tanggal obrolan (Hari Ini, Kemarin, atau tanggal lengkap)
 */
export function getDateSeparatorLabel(dateString) {
  if (!dateString) return '';
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) => (
    d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
  );

  if (isSameDay(messageDate, today)) {
    return 'Hari Ini';
  }
  if (isSameDay(messageDate, yesterday)) {
    return 'Kemarin';
  }

  return messageDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Parse struktur payload pesan (baik berupa teks biasa, JSON terstruktur, atau kolom tersendiri)
 */
export function parseMessagePayload(message) {
  if (!message) return { text: '', mediaUrl: null, mediaType: null };

  const rawBody = message.body || '';
  let parsedJson = null;

  if (typeof rawBody === 'string' && rawBody.startsWith('{') && rawBody.endsWith('}')) {
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      parsedJson = null;
    }
  }

  const mediaUrl = message.media_url || parsedJson?.mediaUrl || null;
  const mediaType = message.media_type || parsedJson?.mediaType || (mediaUrl ? 'image' : null);
  const text = parsedJson?.text !== undefined ? parsedJson.text : (mediaUrl && !rawBody ? '' : rawBody);

  return {
    text: text || '',
    mediaUrl,
    mediaType
  };
}

/**
 * Kompres dan unggah foto referensi chat ke Supabase Storage dengan fallback
 */
export async function uploadChatImage(file, userId = 'user') {
  const cleanId = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  const timestamp = Date.now();

  let compressed;
  try {
    compressed = await compressImage(file, {
      maxDimension: 1280,
      quality: 0.85,
      cropSquare: false,
      format: 'image/jpeg'
    });
  } catch (compressErr) {
    console.warn('Image compression notice:', compressErr);
  }

  const uploadBlob = compressed?.blob || file;
  const fileName = `chat-img-${cleanId}-${timestamp}.jpg`;
  const filePath = `chat/${fileName}`;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            source: 'supabase_storage'
          };
        }
      }
    } catch (uploadErr) {
      console.warn('Storage upload error, using fallback:', uploadErr);
    }
  }

  if (compressed?.dataUrl) {
    return {
      url: compressed.dataUrl,
      source: 'base64_fallback'
    };
  }

  return { url: '', source: 'none' };
}
