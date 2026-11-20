/**
 * E-KeCukur - Logika Jam Operasional & Dynamic Slot Booking
 */

export const DEFAULT_OPERATING_HOURS = {
  open: '09:00',
  close: '21:00',
  slotInterval: 30, // dalam menit (30, 45, 60)
  bufferMinutes: 0, // jeda istirahat/pembersihan antar pelanggan (0, 5, 10, 15)
  breakTime: {
    enabled: false,
    start: '12:00',
    end: '13:00',
    fridayStart: '11:30',
    fridayEnd: '13:00'
  }
};

/**
 * Konversi waktu string HH:MM ke menit dalam hari (0 - 1440)
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Konversi menit ke format waktu string HH:MM
 */
export const minutesToTime = (minutes) => {
  const safeMin = Math.max(0, Math.min(1439, Math.round(minutes || 0)));
  const h = Math.floor(safeMin / 60);
  const m = safeMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Ekstrak durasi layanan dalam satuan menit secara cerdas
 * Mendukung format: '120m', '2 jam', '1.5 jam', '45m', angka murni 60, dll.
 */
export const parseServiceDurationMinutes = (service) => {
  if (!service) return 45;
  const raw = String(service.duration || service.duration_minutes || '').toLowerCase().trim();
  
  if (raw.includes('jam') || raw.includes('h') || raw.includes('hour')) {
    const hours = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(hours) && hours > 0) {
      return Math.round(hours * 60);
    }
  }

  const mins = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (Number.isFinite(mins) && mins > 0) {
    return mins;
  }

  return 45;
};

/**
 * Cek apakah tanggal tertentu adalah hari Jumat
 */
export const isDateFriday = (dateObjOrString) => {
  if (!dateObjOrString) return false;
  if (typeof dateObjOrString === 'object') {
    if (dateObjOrString.dayName && String(dateObjOrString.dayName).toLowerCase().includes('jumat')) return true;
    if (dateObjOrString.label && String(dateObjOrString.label).toLowerCase().includes('jumat')) return true;
    if (dateObjOrString.id) {
      const d = new Date(dateObjOrString.id);
      if (!Number.isNaN(d.getTime())) return d.getDay() === 5;
    }
  }
  const str = String(dateObjOrString).toLowerCase();
  if (str.includes('jumat') || str.includes('fri')) return true;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.getDay() === 5;
  return false;
};

/**
 * Ambil rentang jam istirahat untuk tanggal tertentu
 */
export const getBreakTimeRange = (operatingHours, dateObjOrString) => {
  const breakConfig = operatingHours?.breakTime;
  if (!breakConfig || !breakConfig.enabled) return null;

  const isFriday = isDateFriday(dateObjOrString);
  const start = isFriday ? (breakConfig.fridayStart || '11:30') : (breakConfig.start || '12:00');
  const end = isFriday ? (breakConfig.fridayEnd || '13:00') : (breakConfig.end || '13:00');

  return {
    start,
    end,
    startMinutes: timeToMinutes(start),
    endMinutes: timeToMinutes(end),
    isFriday
  };
};

/**
 * Cek apakah slot waktu atau pengerjaan layanan bertabrakan dengan jam istirahat
 */
export const isSlotInBreakTime = (timeStr, durationMinutes, operatingHours, dateObjOrString) => {
  const breakRange = getBreakTimeRange(operatingHours, dateObjOrString);
  if (!breakRange) return false;

  const start = timeToMinutes(timeStr);
  const end = start + (Number(durationMinutes) || 30);

  return start < breakRange.endMinutes && end > breakRange.startMinutes;
};

/**
 * Generate daftar slot waktu berdasarkan jam buka, jam tutup, dan interval
 */
export const generateTimeSlots = (operatingHours) => {
  const openTime = operatingHours?.open || DEFAULT_OPERATING_HOURS.open;
  const closeTime = operatingHours?.close || DEFAULT_OPERATING_HOURS.close;
  const interval = Number(operatingHours?.slotInterval) || DEFAULT_OPERATING_HOURS.slotInterval;

  const startMin = timeToMinutes(openTime);
  const endMin = timeToMinutes(closeTime);
  const safeInterval = Math.max(15, Math.min(120, interval));

  const slots = [];
  for (let m = startMin; m < endMin; m += safeInterval) {
    slots.push(minutesToTime(m));
  }

  return slots.length > 0 
    ? slots 
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '19:00', '19:30'];
};

/**
 * Format durasi menit ke label manusiawi (misal 120 -> "2 Jam", 45 -> "45 Menit")
 */
export const formatDurationLabel = (minutes) => {
  const m = Number(minutes) || 0;
  if (m <= 0) return '45 Menit';
  if (m % 60 === 0) {
    return `${m / 60} Jam`;
  }
  if (m > 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h} Jam ${rem} Menit`;
  }
  return `${m} Menit`;
};
