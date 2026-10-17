import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Format ukuran byte menjadi format yang mudah dibaca (B, KB, MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Mengompres gambar dengan opsi crop persegi atau mempertahankan aspect ratio.
 * 
 * @param {File|Blob} file - File gambar input
 * @param {Object} options
 * @param {number} [options.maxDimension=1080] - Batas maksimal sisi terpanjang
 * @param {number} [options.quality=0.82] - Kualitas kompresi JPEG/WebP (0.1 - 1.0)
 * @param {boolean} [options.cropSquare=false] - Jika true, potong tengah 1:1 persegi (cocok untuk avatar)
 * @param {string} [options.format='image/jpeg'] - Format kompresi output ('image/jpeg' atau 'image/webp')
 * @returns {Promise<{
 *   blob: Blob,
 *   dataUrl: string,
 *   file: File,
 *   width: number,
 *   height: number,
 *   originalSize: number,
 *   compressedSize: number,
 *   originalFormatted: string,
 *   compressedFormatted: string,
 *   savedPercent: number,
 *   format: string
 * }>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxDimension = 1080,
    quality = 0.82,
    cropSquare = false,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('File gambar tidak ditemukan.'));
    }

    if (file.type && !file.type.startsWith('image/') && !file.name?.match(/\.(jpe?g|png|webp|gif|bmp|heic)$/i)) {
      return reject(new Error('File yang dipilih bukan file gambar yang didukung.'));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat gambar untuk proses kompresi.'));
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;

      let drawW, drawH, sourceX = 0, sourceY = 0, sourceW = naturalW, sourceH = naturalH;
      let canvasW, canvasH;

      if (cropSquare) {
        // Crop 1:1 tengah untuk foto profil
        const minDim = Math.min(naturalW, naturalH);
        sourceX = (naturalW - minDim) / 2;
        sourceY = (naturalH - minDim) / 2;
        sourceW = minDim;
        sourceH = minDim;

        const targetDim = Math.min(maxDimension, minDim);
        canvasW = targetDim;
        canvasH = targetDim;
        drawW = targetDim;
        drawH = targetDim;
      } else {
        // Pertahankan Aspect Ratio (cocok untuk portofolio gaya rambut)
        canvasW = naturalW;
        canvasH = naturalH;

        if (canvasW > maxDimension || canvasH > maxDimension) {
          if (canvasW >= canvasH) {
            canvasH = Math.round((canvasH * maxDimension) / canvasW);
            canvasW = maxDimension;
          } else {
            canvasW = Math.round((canvasW * maxDimension) / canvasH);
            canvasH = maxDimension;
          }
        }
        drawW = canvasW;
        drawH = canvasH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      // Rendering gambar halus berkualitas tinggi
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Isi latar belakang putih bila konversi dari format transparan ke JPEG
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        drawW,
        drawH
      );

      const dataUrl = canvas.toDataURL(format, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Gagal mengompres gambar ke dalam format biner.'));
          }

          const originalSize = file.size || blob.size;
          const compressedSize = blob.size;
          const savedPercent = Math.max(0, Math.round((1 - (compressedSize / originalSize)) * 100));

          const cleanName = (file.name || 'image').replace(/\.[^/.]+$/, '');
          const extension = format === 'image/webp' ? '.webp' : '.jpg';
          const compressedFile = new File([blob], `${cleanName}-compressed${extension}`, { type: format });

          resolve({
            blob,
            dataUrl,
            file: compressedFile,
            width: canvasW,
            height: canvasH,
            originalSize,
            compressedSize,
            originalFormatted: formatBytes(originalSize),
            compressedFormatted: formatBytes(compressedSize),
            savedPercent,
            format
          });
        },
        format,
        quality
      );
    };

    img.src = objectUrl;
  });
}

/**
 * Backward compatibility alias untuk processImageFile
 */
export async function processImageFile(file, maxSize = 500, quality = 0.85) {
  const result = await compressImage(file, {
    maxDimension: maxSize,
    quality: quality,
    cropSquare: true,
    format: 'image/jpeg'
  });
  return { blob: result.blob, dataUrl: result.dataUrl, stats: result };
}

/**
 * Upload foto profil barber ke Supabase Storage (bucket 'avatars')
 * dengan kompresi otomatis persegi 1:1 (max 500px).
 * 
 * @param {File} file - File gambar yang diupload
 * @param {string} barberId - ID atau slug barber
 * @returns {Promise<{ url: string, source: 'supabase_storage' | 'base64_fallback', stats: Object }>}
 */
export async function uploadBarberProfilePhoto(file, barberId = 'reza') {
  // 1. Kompres dan potong gambar 1:1 persegi (max 500px, quality 0.85)
  const result = await compressImage(file, {
    maxDimension: 500,
    quality: 0.85,
    cropSquare: true,
    format: 'image/jpeg'
  });

  // 2. Jika Supabase aktif, coba upload ke Storage Bucket 'avatars'
  if (isSupabaseConfigured) {
    try {
      const cleanId = (barberId || 'barber').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `profile-${cleanId}-${Date.now()}.jpg`;
      const filePath = `profiles/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, result.blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            source: 'supabase_storage',
            stats: result
          };
        }
      } else {
        console.info('Supabase Storage notice (menggunakan compressed fallback):', error?.message);
      }
    } catch (err) {
      console.warn('Supabase storage upload error:', err.message);
    }
  }

  // 3. Fallback: gunakan compressed Data URL (tersimpan ringkas di DB & localStorage tanpa error)
  return {
    url: result.dataUrl,
    source: 'base64_fallback',
    stats: result
  };
}

/**
 * Upload foto portofolio / lookbook hasil cukur ke Supabase Storage (bucket 'avatars')
 * dengan kompresi cerdas mempertahankan rasio aspek asli (max 1080px).
 * 
 * @param {File} file - File foto hasil cukur
 * @param {string} barberId - ID atau slug barber
 * @returns {Promise<{ url: string, source: 'supabase_storage' | 'base64_fallback', stats: Object }>}
 */
export async function uploadPortfolioPhoto(file, barberId = 'reza') {
  // 1. Kompres foto portofolio (pertahankan proporsi asli, max 1080px, quality 0.82)
  const result = await compressImage(file, {
    maxDimension: 1080,
    quality: 0.82,
    cropSquare: false,
    format: 'image/jpeg'
  });

  // 2. Jika Supabase aktif, coba upload ke Storage Bucket 'avatars'
  if (isSupabaseConfigured) {
    try {
      const cleanId = (barberId || 'barber').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `lookbook-${cleanId}-${Date.now()}.jpg`;
      const filePath = `lookbook/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, result.blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            source: 'supabase_storage',
            stats: result
          };
        }
      } else {
        console.info('Supabase Storage lookbook notice (menggunakan compressed fallback):', error?.message);
      }
    } catch (err) {
      console.warn('Supabase lookbook upload error:', err.message);
    }
  }

  // 3. Fallback: gunakan compressed Data URL
  return {
    url: result.dataUrl,
    source: 'base64_fallback',
    stats: result
  };
}

/**
 * Upload foto banner / header cover ke Supabase Storage (bucket 'avatars')
 * dengan kompresi proporsional lanskap (max 1200px).
 * 
 * @param {File} file - File gambar banner cover
 * @param {string} barberId - ID atau slug barber
 * @returns {Promise<{ url: string, source: 'supabase_storage' | 'base64_fallback', stats: Object }>}
 */
export async function uploadBarberBannerPhoto(file, barberId = 'reza') {
  // 1. Kompres banner (max 1200px, quality 0.82, cropSquare: false)
  const result = await compressImage(file, {
    maxDimension: 1200,
    quality: 0.82,
    cropSquare: false,
    format: 'image/jpeg'
  });

  // 2. Jika Supabase aktif, coba upload ke Storage Bucket 'avatars'
  if (isSupabaseConfigured) {
    try {
      const cleanId = (barberId || 'barber').replace(/[^a-zA-Z0-9_-]/g, '');
      const fileName = `banner-${cleanId}-${Date.now()}.jpg`;
      const filePath = `banners/${fileName}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, result.blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          return {
            url: publicUrlData.publicUrl,
            source: 'supabase_storage',
            stats: result
          };
        }
      } else {
        console.info('Supabase Storage banner notice (menggunakan compressed fallback):', error?.message);
      }
    } catch (err) {
      console.warn('Supabase banner upload error:', err.message);
    }
  }

  // 3. Fallback: gunakan compressed Data URL
  return {
    url: result.dataUrl,
    source: 'base64_fallback',
    stats: result
  };
}

