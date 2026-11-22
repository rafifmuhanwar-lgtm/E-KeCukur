import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scissors, 
  Calendar, 
  Clock,
  User,
  MapPin, 
  CheckCircle2, 
  Check, 
  Copy,
  Share2, 
  ExternalLink,
  Printer
} from 'lucide-react';
import { useStore, dbToUiStatus } from '../../store';
import { isSupabaseConfigured } from '../../lib/supabase';
import { fetchBookingTracking } from '../../lib/bookingTracking';
import { RazorEMark } from '../../components/Logo';

export default function CustomerTicket() {
  const { id } = useParams();
  const location = useLocation();
  const bookings = useStore((state) => state.bookings || []);
  const barbers = useStore((state) => state.barbers || []);
  const fetchBookings = useStore((state) => state.fetchBookings);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  // 1. Cari booking di store atau fetch dari Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadBooking() {
      if (!id) {
        setLoading(false);
        return;
      }

      // Cek di store dulu
      const foundInStore = bookings.find((b) => 
        String(b.id).toLowerCase() === String(id).toLowerCase()
      );

      if (foundInStore) {
        if (isMounted) {
          setBooking(foundInStore);
          setLoading(false);
        }
        return;
      }

      const ticketToken = new URLSearchParams(location.hash.replace(/^#/, '')).get('t')
        || new URLSearchParams(location.search).get('token')
        || (() => {
          try {
            const stored = JSON.parse(localStorage.getItem('ecukur_active_ticket') || 'null');
            return stored?.id === id ? stored.ticketToken : null;
          } catch {
            return null;
          }
        })();

      if (isSupabaseConfigured) {
        try {
          const { booking: data } = await fetchBookingTracking(id, ticketToken);
          if (data && isMounted) {
            setBooking({
              id: data.id,
              customerName: data.customerName || 'Pelanggan',
              customerPhone: data.customerPhone || '-',
              barberId: data.barberId || '',
              barberName: data.barberName || 'Barber E-CUKUR',
              capsterId: data.capsterId || null,
              capsterName: data.capsterName || null,
              serviceName: data.serviceName || 'Layanan Cukur',
              date: data.date || 'Hari Ini',
              time: data.startTime ? String(data.startTime).substring(0, 5) : (data.time || '10:00'),
              status: dbToUiStatus(data.status),
              paymentMethod: data.paymentMethod || 'QRIS',
              paymentStatus: data.paymentStatus || 'UNPAID',
              price: Number(data.price) || 0,
              createdAt: data.createdAt,
              ticketToken
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Ticket tracking fetch failed:', e);
        }
      }

      // Fetch semua booking bila belum sempat termuat
      if (typeof fetchBookings === 'function') {
        await fetchBookings();
      }
      if (isMounted) setLoading(false);
    }

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [id, bookings, fetchBookings, location.hash, location.search]);

  // Simpan ke localStorage agar browser HP mengingat tiket ini
  useEffect(() => {
    if (booking && typeof localStorage !== 'undefined') {
      try {
        const ticketData = {
          id: booking.id,
          barberName: booking.barberName,
          barberId: booking.barberId,
          serviceName: booking.serviceName,
          date: booking.date,
          time: booking.time,
          price: booking.price,
          savedAt: Date.now()
        };
        localStorage.setItem('ecukur_active_ticket', JSON.stringify(ticketData));
      } catch {}
    }
  }, [booking]);

  // Cocokkan data barber terkait (untuk foto, alamat, maps)
  const matchedBarber = React.useMemo(() => {
    if (!booking) return null;
    return barbers.find((b) => 
      (booking.barberId && (b.id === booking.barberId || b.slug === booking.barberId)) ||
      (booking.barberName && b.name && b.name.toLowerCase() === booking.barberName.toLowerCase()) ||
      (booking.barberName && b.slug && b.slug.toLowerCase() === booking.barberName.toLowerCase())
    );
  }, [booking, barbers]);

  const formattedBookingCode = booking?.bookingCode || (
    booking?.id
      ? `ECU-${String(booking.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
      : 'ECU-20251122-001'
  );
  const currentUrl = typeof window !== 'undefined' ? window.location.href : `https://ecukur.biz.id/tiket/${id}`;
  const isPaid = booking?.paymentStatus === 'PAID';

  const copyCode = () => {
    if (!booking) return;
    navigator.clipboard.writeText(formattedBookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1B4332] flex items-center justify-center text-white mx-auto animate-pulse">
            <Scissors className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-neutral-600">Memuat tiket elektronik reservasi...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center p-4 text-[#171717]">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold text-xl">Tiket Tidak Ditemukan</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Tiket dengan ID <code>{id}</code> tidak ditemukan atau telah kedaluwarsa. Pastikan tautan tiket yang Anda buka sudah benar.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="w-full py-3 bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#1B4332] selection:text-white pb-16">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group select-none">
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center p-1.5 shadow-2xs group-hover:scale-105 transition-transform">
              <RazorEMark className="w-full h-full text-white" color="#ffffff" />
            </div>
            <span className="font-display font-black text-sm tracking-tight text-[#171717] lowercase">
              e cukur
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-6 sm:pt-8 w-full space-y-4">

        {/* ─── DIGITAL BARBER PASS CARD (1:1 SESUAI REFERENSI DESAIN) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white rounded-[36px] p-6 sm:p-7 border border-neutral-200/90 shadow-2xl shadow-emerald-950/10 overflow-hidden"
        >
          {/* Side Cutout Notches (Efek Fisik Tiket Sobek Samping) */}
          <div className="absolute -left-3.5 top-32 w-7 h-7 rounded-full bg-[#F2F4F7] border border-neutral-200/80 z-20 pointer-events-none" />
          <div className="absolute -right-3.5 top-32 w-7 h-7 rounded-full bg-[#F2F4F7] border border-neutral-200/80 z-20 pointer-events-none" />

          {/* Top Row: Logo & Status Badge */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 select-none">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center p-1.5 shadow-xs">
                <RazorEMark className="w-full h-full" color="#ffffff" />
              </div>
              <span className="font-display font-black text-xl text-neutral-900 tracking-tight lowercase">
                e cukur
              </span>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-3xs ${
              isPaid 
                ? 'bg-[#E8F5E9] text-[#1B4332] border border-[#C8E6C9]' 
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1B4332]" />
              <span>{isPaid ? 'Pembayaran Berhasil' : (booking.status === 'Terkonfirmasi' ? 'Terkonfirmasi' : 'Pembayaran Berhasil')}</span>
            </div>
          </div>

          {/* Header Title with Background Watermark */}
          <div className="relative pt-4 pb-2">
            {/* Watermark in background on right */}
            <div className="absolute -top-4 -right-4 w-44 h-44 text-[#1B4332]/10 pointer-events-none select-none z-0">
              <RazorEMark className="w-full h-full" color="currentColor" />
            </div>

            <div className="relative z-10">
              <h2 className="font-display font-black text-3xl sm:text-4xl text-[#1B4332] tracking-tight leading-tight mt-0.5">
                Booking Pass
              </h2>
              <p className="text-neutral-500 text-xs mt-1 font-medium">
                Unduh & Simpan Tiket ini. Tunjukkan tiket ini nanti saat jadwal pangkas Anda tiba.
              </p>
            </div>
          </div>

          <div className="border-b border-neutral-100 my-3" />

          {/* Bento Info Cards */}
          <div className="space-y-3 relative z-10">
            
            {/* 1. Nama Pelanggan */}
            <div className="bg-[#F8F9FA] rounded-2xl p-3.5 flex items-center gap-3 border border-neutral-100/90 shadow-3xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-200/70 text-neutral-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nama Pelanggan</span>
                <span className="text-sm sm:text-base font-extrabold text-neutral-900 block truncate mt-0.5">
                  {booking.customerName}
                </span>
              </div>
            </div>

            {/* 2. Nama Barber & Layanan */}
            <div className="bg-[#F8F9FA] rounded-2xl p-3.5 flex items-center justify-between gap-3 border border-neutral-100/90 shadow-3xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-neutral-200/70 text-neutral-700 flex items-center justify-center shrink-0">
                  <Scissors className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nama Barber</span>
                  <span className="text-sm font-extrabold text-neutral-900 block truncate mt-0.5">
                    {booking.barberName}
                  </span>
                  {booking.capsterName && (
                    <span className="text-[11px] text-neutral-500 font-medium block mt-0.5">
                      Capster: <strong className="text-neutral-700">{booking.capsterName}</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 border-l border-neutral-200/80 pl-3">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Layanan</span>
                <span className="text-xs font-bold text-[#1B4332] block max-w-[120px] truncate mt-0.5">
                  {booking.serviceName}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-500 block mt-0.5">
                  {formatRupiah(booking.price)}
                </span>
              </div>
            </div>

            {/* 3. Tanggal Booking & Waktu Booking (2 Kolom Grid) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8F9FA] rounded-2xl p-3.5 flex items-center gap-2.5 border border-neutral-100/90 shadow-3xs">
                <div className="w-9 h-9 rounded-xl bg-neutral-200/70 text-neutral-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tanggal Booking</span>
                  <span className="text-xs font-bold text-neutral-900 block truncate mt-0.5">
                    {booking.date}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8F9FA] rounded-2xl p-3.5 flex items-center gap-2.5 border border-neutral-100/90 shadow-3xs">
                <div className="w-9 h-9 rounded-xl bg-neutral-200/70 text-neutral-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Waktu Booking</span>
                  <span className="text-xs font-bold text-neutral-900 block truncate mt-0.5">
                    {booking.time} WIB
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Lokasi Studio (Jika ada) */}
            {(matchedBarber?.address || matchedBarber?.locationCity) && (
              <div className="bg-[#F8F9FA] rounded-2xl p-3 flex items-start gap-2.5 border border-neutral-100/90 shadow-3xs">
                <MapPin className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                <div className="text-xs min-w-0 flex-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Lokasi Pangkas</span>
                  <span className="text-neutral-700 block text-[11px] leading-relaxed mt-0.5">
                    {matchedBarber.address || matchedBarber.locationCity}
                  </span>
                  {matchedBarber.mapsUrl && (
                    <a
                      href={matchedBarber.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B4332] hover:underline mt-1"
                    >
                      <span>Buka Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 5. Footer Info: Booking ID (Dengan tombol Copy) & Tagline */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Booking ID</span>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1.5 font-mono font-black text-xs sm:text-sm text-neutral-900 tracking-wider hover:text-[#1B4332] transition-colors cursor-pointer mt-0.5 group"
                  title="Klik untuk salin Booking ID"
                >
                  <span>{formattedBookingCode}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <span className="font-serif italic font-bold text-neutral-900 text-xs block leading-tight">Your Barber,</span>
                <span className="font-serif italic font-bold text-neutral-900 text-xs block leading-tight">Just One Click Away.</span>
              </div>
            </div>

          </div>

          {/* Bottom Emerald Wave Accent & Center Notch */}
          <div className="relative -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 mt-5 pt-10 overflow-hidden rounded-b-[36px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1B4332] via-[#2D6A4F] to-[#52B788] opacity-95" />
            <svg className="absolute bottom-0 w-full h-10 text-[#1B4332]" viewBox="0 0 400 60" preserveAspectRatio="none">
              <path d="M0,25 C150,55 250,5 400,25 L400,60 L0,60 Z" fill="currentColor" opacity="0.35" />
            </svg>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#F2F4F7] z-20 pointer-events-none" />
            <div className="h-4 relative z-10" />
          </div>

        </motion.div>

        {/* ─── ACTION BUTTONS (PRINT & BIO LINK) ─── */}
        <div className="space-y-2.5 pt-2">
          {/* Tombol Cetak / Simpan PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Unduh / Cetak Tiket</span>
          </button>

          {/* Tombol Kembali ke Profil Barber */}
          {matchedBarber?.slug && (
            <Link
              to={`/${matchedBarber.slug}`}
              className="w-full py-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 text-center shadow-2xs"
            >
              <span>Kunjungi Profil Bio Link Barber</span>
            </Link>
          )}
        </div>

      </main>

    </div>
  );
}