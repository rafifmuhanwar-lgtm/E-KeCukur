import { supabase, isSupabaseConfigured } from './supabase';
import { compressImage } from './imageUploader';

export const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '✂️', '🙏'];

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
 * Format durasi detik audio menjadi m:ss
 */
export function formatAudioDuration(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse struktur payload pesan (baik berupa teks biasa, JSON terstruktur, atau kolom tersendiri)
 */
export function parseMessagePayload(message) {
  if (!message) return { text: '', mediaUrl: null, mediaType: null, replyTo: null, reactions: {} };

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
  const mediaType = message.media_type || parsedJson?.mediaType || null;
  const audioDuration = Number(message.audio_duration || parsedJson?.audioDuration || 0);
  const replyTo = message.reply_to || parsedJson?.replyTo || null;
  const reactions = message.reactions || parsedJson?.reactions || {};
  const text = parsedJson?.text !== undefined ? parsedJson.text : (mediaUrl && !rawBody ? '' : rawBody);

  return {
    text: text || '',
    mediaUrl,
    mediaType,
    audioDuration,
    replyTo,
    reactions: typeof reactions === 'object' && reactions !== null ? reactions : {}
  };
}

/**
 * Kompres dan unggah media chat (foto referensi atau voice note) ke Supabase Storage dengan fallback
 */
export async function uploadChatMedia(fileOrBlob, type = 'image', userId = 'user') {
  const cleanId = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  const timestamp = Date.now();

  if (type === 'image') {
    let compressed;
    try {
      compressed = await compressImage(fileOrBlob, {
        maxDimension: 1280,
        quality: 0.85,
        cropSquare: false,
        format: 'image/jpeg'
      });
    } catch (compressErr) {
      console.warn('Image compression fallback:', compressErr);
    }

    const uploadBlob = compressed?.blob || fileOrBlob;
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
  }

  // Audio / Voice Note Upload
  if (type === 'audio') {
    const fileName = `chat-vn-${cleanId}-${timestamp}.webm`;
    const filePath = `chat/${fileName}`;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(filePath, fileOrBlob, {
            contentType: fileOrBlob.type || 'audio/webm',
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
        console.warn('Storage audio upload error, using fallback:', uploadErr);
      }
    }

    // Fallback: convert audio blob to base64 Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result,
          source: 'base64_fallback'
        });
      };
      reader.onerror = () => {
        resolve({ url: '', source: 'failed' });
      };
      reader.readAsDataURL(fileOrBlob);
    });
  }

  return { url: '', source: 'none' };
}
