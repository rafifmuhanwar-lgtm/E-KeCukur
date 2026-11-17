import { supabase } from './supabase';

export function createGuestTicketToken() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Browser tidak mendukung pembuatan token tiket yang aman.');
  }

  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
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
