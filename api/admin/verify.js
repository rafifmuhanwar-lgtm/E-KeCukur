import crypto from 'node:crypto';

// In-memory rate limiting map for serverless execution
const failedAttemptsMap = new Map();

function cleanOldAttempts() {
  const now = Date.now();
  for (const [ip, data] of failedAttemptsMap.entries()) {
    if (now - data.timestamp > 15 * 60 * 1000) {
      failedAttemptsMap.delete(ip);
    }
  }
}

// SHA-256 hash helper
function sha256(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// Authorized SHA-256 hashes of master passkeys (server-side only)
const KNOWN_HASHES = new Set([
  'f8c9db92aeb781e944c2ebd5707a568cbabb6bd683c61f369fb4967423915d22',
  '4cc3e12daae8b68d83dfe17c16c3c533c5d56fd9974b123cf589f019eeceffd3',
]);

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  cleanOldAttempts();

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const attemptData = failedAttemptsMap.get(ip) || { count: 0, lockedUntil: 0, timestamp: Date.now() };

  const now = Date.now();
  if (attemptData.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptData.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Akses ditangguhkan karena terlalu banyak kesalahan. Coba lagi dalam ${remainingSeconds} detik.`,
      lockoutSeconds: remainingSeconds
    });
  }

  try {
    const { passkey } = req.body || {};

    if (!passkey || typeof passkey !== 'string' || !passkey.trim()) {
      return res.status(400).json({ success: false, error: 'Passkey wajib diisi' });
    }

    const trimmed = passkey.trim();
    const candidateHash = sha256(trimmed);

    // Cek juga environment variable server jika ada
    const envKey = process.env.ADMIN_SECRET_KEY ? sha256(process.env.ADMIN_SECRET_KEY.trim()) : null;
    const envPin = process.env.ADMIN_PIN ? sha256(process.env.ADMIN_PIN.trim()) : null;

    let isMatch = KNOWN_HASHES.has(candidateHash);
    if (!isMatch && envKey && candidateHash === envKey) isMatch = true;
    if (!isMatch && envPin && candidateHash === envPin) isMatch = true;

    if (isMatch) {
      // Reset attempts
      failedAttemptsMap.delete(ip);

      // Generate random secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = now + 15 * 60 * 1000; // 15 menit

      return res.status(200).json({
        success: true,
        message: 'Otorisasi Master Admin berhasil',
        token: sessionToken,
        expiresAt
      });
    }

    // Gagal verifikasi: catat percobaan
    attemptData.count += 1;
    attemptData.timestamp = now;

    if (attemptData.count >= 5) {
      attemptData.lockedUntil = now + 15 * 60 * 1000;
      failedAttemptsMap.set(ip, attemptData);
      return res.status(429).json({
        success: false,
        error: '5x Percobaan salah! Akses ditangguhkan selama 15 menit.',
        lockoutSeconds: 15 * 60
      });
    }

    failedAttemptsMap.set(ip, attemptData);
    const remainingAttempts = 5 - attemptData.count;

    return res.status(401).json({
      success: false,
      error: `Kredensial tidak valid. Sisa kesempatan: ${remainingAttempts} kali.`,
      remainingAttempts
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

