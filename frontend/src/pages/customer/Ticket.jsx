import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scissors, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Copy, 
  Check, 
  Share2, 
  ArrowLeft, 
  ExternalLink,
  Printer,
  Sparkles,
  Phone
} from 'lucide-react';
import { dbToUiStatus, useStore } from '../../store';
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchBookingTracking } from '../../lib/bookingTracking';
import { getDynamicQrisImageUrl } from '../../lib/qrisPayment';

export default function CustomerTicket() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const bookings = useStore((state) => state.bookings || []);
  const barbers = useStore((state) => state.barbers || []);

  const [booking, setBooking] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const queryTicketToken = searchParams.get('token');
  const ticketToken = useMemo(() => queryTicketToken || (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ecukur_active_ticket') || 'null');
      return saved?.id === id ? saved.ticketToken || null : null;
    } catch {
      return null;
    }
  })(), [id, queryTicketToken]);

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;
  const statusLabel = (status) => (
    typeof status === 'string' && status === status.toUpperCase()
      ? dbToUiStatus(status)
      : status || 'Status tidak diketahui'
  );

  useEffect(() => {
    let isMounted = true;
    let interval;

    async function loadBooking() {
      if (!id) {
        setLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        const foundInStore = bookings.find((item) =>
          String(item.id).toLowerCase() === String(id).toLowerCase()
        );
        if (isMounted) {
          setBooking(foundInStore || null);
          setTrackingError('');
        }
        setLoading(false);
        return;
      }

      try {
        const result = await fetchBookingTracking(id, ticketToken);
        const data = result.booking;
        if (isMounted) {
          setTrackingError('');
          setBooking({
            id: data.id,
            customerName: data.customerName || 'Pelanggan',
            customerPhone: data.customerPhone || '-',
            barberId: data.barberId || '',
            barberName: data.barberName || 'Barber E-CUKUR',
            serviceName: data.serviceName || 'Layanan Cukur',
            date: data.date || 'Tanggal belum tersedia',
            time: data.startTime ? String(data.startTime).substring(0, 5) : '-',
            status: dbToUiStatus(data.status),
            paymentMethod: data.paymentMethod || 'QRIS',
            paymentStatus: data.paymentStatus || 'UNPAID',
            price: Number(data.price) || 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            history: Array.isArray(result.history) ? result.history : []
          });
        }
      } catch (error) {
        if (isMounted) {
          setTrackingError(error.message || 'Tracking booking gagal dimuat.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBooking();
    if (isSupabaseConfigured) {
      interval = setInterval(loadBooking, 5000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [id, ticketToken, bookings]);

  // Simpan akses tiket di perangkat agar tiket dapat dibuka kembali.
  useEffect(() => {
    if (booking && typeof localStorage !== 'undefined') {
      try {
        const ticketData = {
          id: booking.id,
          ticketToken,
          barberName: booking.barberName,
          barberId: booking.barberId,
          serviceName: booking.serviceName,
          date: booking.date,
          time: booking.time,
          price: booking.price,
          savedAt: Date.now()
        };
        localStorage.setItem('ecukur_active_ticket', JSON.stringify(ticketData));
      } catch (error) {
        console.warn('Akses tiket tidak dapat disimpan di perangkat:', error);
      }
    }
  }, [booking, ticketToken]);

  // Cocokkan data barber terkait (untuk foto, alamat, maps)
  const matchedBarber = React.useMemo(() => {
    if (!booking) return null;
    return barbers.find((b) => 
      (booking.barberId && (b.id === booking.barberId || b.slug === booking.barberId)) ||
      (booking.barberName && b.name && b.name.toLowerCase() === booking.barberName.toLowerCase()) ||
      (booking.barberName && b.slug && b.slug.toLowerCase() === booking.barberName.toLowerCase())
    );
  }, [booking, barbers]);

  const shortCode = booking?.id ? `#${String(booking.id).slice(-6).toUpperCase()}` : '#BK-001';
  const currentUrl = (() => {
    if (typeof window === 'undefined') return `https://ecukur.biz.id/tiket/${id}`;
    const url = new URL(window.location.href);
    if (ticketToken) url.searchParams.set('token', ticketToken);
    return url.toString();
  })();

  const copyCode = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareToWhatsApp = () => {
    if (!booking) return;
    const text = 
      `💈 *TIKET RESERVASI E-CUKUR*\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *No. Tiket:* ${shortCode}\n` +
      `👤 *Nama:* ${booking.customerName}\n` +
      `✂️ *Layanan:* ${booking.serviceName}\n` +
      `💈 *Barber:* ${booking.barberName}\n` +
      `📅 *Jadwal:* ${booking.date} pukul ${booking.time} WIB\n` +
      `💰 *Total:* ${formatRupiah(booking.price)} (${booking.paymentStatus === 'PAID' ? 'LUNAS' : 'BELUM LUNAS'} - ${booking.paymentMethod})\n\n` +
      `🔗 *Buka Tiket Digital:* ${currentUrl}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#285844] flex items-center justify-center text-white mx-auto animate-pulse">
            <Scissors className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-neutral-600">Memuat tiket elektronik reservasi...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4 text-[#171717]">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold text-xl">Tiket Tidak Ditemukan</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {trackingError || `Tiket dengan ID ${id} tidak ditemukan atau tautan aksesnya tidak valid.`}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="w-full py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#285844] selection:text-white pb-16">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-xl bg-[#285844] flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform">
              <Scissors className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-black text-sm tracking-tight text-[#171717]">
              E-CUKUR
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Tersalin' : 'Bagikan'}</span>
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-6 sm:pt-8 w-full space-y-4">
        
        <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs text-emerald-900">Status booking: {booking.status}</h4>
            <p className="text-[11px] text-emerald-700">
              Pembayaran: {booking.paymentStatus === 'PAID' ? 'Lunas' : booking.paymentStatus || 'Belum lunas'}.
              {' '}Tiket diperbarui otomatis saat status berubah.
            </p>
          </div>
        </div>

        <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm" aria-label="Riwayat status booking">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-sm text-neutral-900">Perjalanan Booking</h2>
            <span className="text-[10px] text-neutral-500">Pembaruan otomatis</span>
          </div>
          <ol className="mt-4 space-y-3">
            {(booking.history?.length
              ? booking.history
              : [{ newStatus: booking.status, changedAt: booking.createdAt, notes: 'Status booking' }]
            ).map((item, index) => (
              <li key={`${item.changedAt || 'status'}-${index}`} className="flex gap-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-[#285844] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-800">
                    {statusLabel(item.newStatus)}
                  </p>
                  {item.notes && <p className="text-[11px] text-neutral-500">{item.notes}</p>}
                  {item.changedAt && (
                    <time className="text-[10px] text-neutral-400">
                      {new Date(item.changedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    </time>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
            Status layanan berbeda dari status pembayaran. Informasi antrean akan muncul setelah booking masuk antrean.
          </p>
        </section>

        {/* ─── DIGITAL BOARDING PASS CARD ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-neutral-200/80 shadow-md overflow-hidden"
        >
          {/* Header Ticket: Forest Green */}
          <div className="bg-[#285844] text-white p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-2 right-4 text-white/10 font-display font-black text-6xl select-none">
              TICKET
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-white/15 text-white backdrop-blur-xs border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Tiket Digital Resmi</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                <span className={`w-1.5 h-1.5 rounded-full ${booking.paymentStatus === 'PAID' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                <span>{booking.paymentStatus === 'PAID' ? 'LUNAS' : 'BELUM LUNAS'} ({booking.paymentMethod})</span>
              </span>
            </div>

            <div className="mt-4 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-emerald-200/80 uppercase font-semibold">Nomor Reservasi</div>
                  <div className="font-mono font-black text-2xl tracking-wider text-white mt-0.5">
                    {shortCode}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyCode}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin ID'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ticket Body */}
          <div className="p-5 sm:p-6 space-y-5">
            
            {/* Waktu & Sesi Booking (Highlight Utama) */}
            <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#285844] text-white flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Jadwal Kedatangan</div>
                  <div className="font-bold text-neutral-900 text-sm sm:text-base mt-0.5">
                    {booking.date}
                  </div>
                </div>
              </div>

              <div className="text-right border-l border-neutral-200 pl-4">
                <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Pukul</div>
                <div className="font-mono font-black text-lg text-[#285844]">
                  {booking.time} <span className="text-[11px] font-bold">WIB</span>
                </div>
              </div>
            </div>

            {/* Perforated Divider (Efek Tiket Fisik) */}
            <div className="relative flex items-center justify-between my-2 -mx-5 sm:-mx-6">
              <div className="w-4 h-8 bg-[#F7F6F2] rounded-r-full border-r border-y border-neutral-200" />
              <div className="flex-1 border-b-2 border-dashed border-neutral-200 mx-2" />
              <div className="w-4 h-8 bg-[#F7F6F2] rounded-l-full border-l border-y border-neutral-200" />
            </div>

            {/* Rincian Pemesan & Layanan */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Nama Pelanggan</span>
                <strong className="text-neutral-900 font-bold">{booking.customerName}</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                <span className="text-neutral-500">No. WhatsApp</span>
                <strong className="font-mono text-neutral-900">{booking.customerPhone}</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Layanan Dipilih</span>
                <strong className="text-neutral-900 font-bold text-right">{booking.serviceName}</strong>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Barber / Studio</span>
                <div className="flex items-center gap-1.5 font-bold text-[#285844]">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{booking.barberName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-neutral-500 font-medium">Total Tarif</span>
                <strong className="font-mono text-base font-extrabold text-[#285844]">
                  {formatRupiah(booking.price)}
                </strong>
              </div>
            </div>

            {booking.paymentMethod === 'QRIS' && booking.paymentStatus === 'UNPAID' && (
              <section className="pt-4 border-t border-neutral-100 text-center space-y-3" aria-label="Pembayaran QRIS">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">QRIS Pembayaran</h3>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Scan QR ini untuk membayar {formatRupiah(booking.price)}. Tiket tetap bisa dibuka selama pembayaran diproses.
                  </p>
                </div>
                <div className="w-48 h-48 mx-auto rounded-2xl bg-white p-2 border border-neutral-200 flex items-center justify-center">
                  <img
                    src={getDynamicQrisImageUrl(booking.price)}
                    alt={`QRIS pembayaran ${formatRupiah(booking.price)}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  QR akan hilang otomatis setelah pembayaran terverifikasi.
                </p>
              </section>
            )}

            {/* Alamat & Lokasi Studio */}
            {(matchedBarber?.address || matchedBarber?.locationCity) && (
              <div className="pt-3 border-t border-neutral-100">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#285844] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-neutral-800 block">Lokasi Pangkas:</span>
                    <span className="text-neutral-500 block leading-relaxed mt-0.5">
                      {matchedBarber.address || matchedBarber.locationCity}
                    </span>
                    {matchedBarber.mapsUrl && (
                      <a
                        href={matchedBarber.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#285844] hover:underline mt-1.5"
                      >
                        <span>Buka Rute di Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </motion.div>

        {/* ─── ACTION BUTTONS (WHATSAPP, PRINT, BOOKING LAIN) ─── */}
        <div className="space-y-2.5 pt-2">
          {/* Tombol Simpan ke WhatsApp */}
          <button
            type="button"
            onClick={shareToWhatsApp}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Phone className="w-4 h-4" />
            <span>Kirim Ringkasan Tiket ke WhatsApp Saya</span>
          </button>

          {/* Tombol Cetak / Simpan PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Unduh / Cetak Tiket</span>
          </button>

          {/* Tombol Kembali ke Profil Barber */}
          {matchedBarber?.slug && (
            <Link
              to={`/${matchedBarber.slug}`}
              className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 text-center"
            >
              <span>Kunjungi Profil Bio Link Barber</span>
            </Link>
          )}
        </div>

      </main>

    </div>
  );
}
