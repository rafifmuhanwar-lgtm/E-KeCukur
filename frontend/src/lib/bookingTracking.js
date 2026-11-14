import { supabase } from './supabase';

export function createGuestTicketToken() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Browser tidak mendukung pembuatan token tiket yang aman.');
  }

  const bytes = new Uint8Array(32);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fetchBookingTracking(bookingId, ticketToken = null) {
  if (!bookingId) {
    throw new Error('ID tiket tidak tersedia.');
  }

  const { data, error } = await supabase.rpc('get_booking_tracking', {
    p_booking_id: bookingId,
    p_ticket_token: ticketToken
  });

  if (error) throw error;
  if (!data?.booking) {
    throw new Error('Tiket tidak ditemukan atau token akses tidak valid.');
  }

  return data;
}

export function getJakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
