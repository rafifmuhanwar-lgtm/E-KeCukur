import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Scissors, 
  ArrowLeft, 
  QrCode,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import Logo from '../../components/Logo';
import { useStore } from '../../store';

export default function CustomerBookings() {
  const navigate = useNavigate();
  const bookings = useStore((state) => state.bookings || []);
  const fetchBookings = useStore((state) => state.fetchBookings);
  const subscribeToBookings = useStore((state) => state.subscribeToBookings);

  const [copiedId, setCopiedId] = useState(null);

  React.useEffect(() => {
    if (typeof fetchBookings === 'function') {
      fetchBookings();
    }
    if (typeof subscribeToBookings === 'function') {
      const unsub = subscribeToBookings();
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [fetchBookings, subscribeToBookings]);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0 
    }).format(number);
  };

  const getShortId = (id) => {
    if (!id) return '#000';
    if (id.includes('-')) {
      const parts = id.split('-');
      return `#${parts[parts.length - 1].slice(0, 5).toUpperCase()}`;
    }
    return `#${id.slice(-5).toUpperCase()}`;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#285844] selection:text-white">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#285844] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-base tracking-tight text-[#171717]">
                E-CUKUR
              </span>
              <span className="text-neutral-400 text-xs">/</span>
              <span className="text-[11px] font-bold text-[#285844] tracking-wider uppercase">
                Tiket Reservasi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link 
              to="/customer/barbers" 
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cari Barber Lain
            </Link>
            <Link 
              to="/" 
              className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 hover:text-black rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-24 flex-1 w-full space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">
                Jadwal & Tiket Reservasi
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 font-normal">
              Tiket digital sesi potong rambut Anda yang tercatat secara real-time di sistem studio E-CUKUR.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-white border border-neutral-200 rounded-full text-xs font-mono font-bold text-neutral-700 shadow-2xs">
              {bookings.length} Tiket
            </span>
          </div>
        </div>

        {/* Bookings List or Empty State */}
        {bookings.length === 0 ? (
          <div className="text-center py-16 border border-neutral-200 rounded-3xl bg-white p-8 max-w-md mx-auto shadow-2xs space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              Belum Ada Jadwal Reservasi
            </h3>
            <p className="text-neutral-500 text-xs leading-relaxed">
              Pilih capster favoritmu, pilih jam kunjungan, dan nikmati kemudahan cukur tanpa perlu antre berjam-jam.
            </p>
            <div className="pt-2">
              <Link 
                to="/customer/barbers"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Scissors className="w-4 h-4" />
                <span>Pilih Barber & Booking Sekarang</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => {
              const shortId = getShortId(b.id);
              const isConfirmed = b.status === 'Terkonfirmasi' || b.paymentStatus === 'PAID';
              const isCompleted = b.status === 'Selesai';
              const isCancelled = b.status === 'Batal' || b.status === 'Dibatalkan';
              const isCopied = copiedId === b.id;

              return (
                <motion.div 
                  key={b.id || i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs space-y-4"
                >
                  {/* Top Bar: Pass ID & Status Pill */}
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-neutral-900 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-lg">
                        {shortId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(b.id, b.id)}
                        className="text-[11px] font-mono text-neutral-400 hover:text-black flex items-center gap-1 transition-colors cursor-pointer"
                        title="Salin ID Lengkap"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin ID'}</span>
                      </button>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full ${
                      isCompleted 
                        ? 'bg-neutral-100 text-neutral-700 border border-neutral-200' 
                        : isCancelled 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : isConfirmed 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {isCompleted || isConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{b.status || (isConfirmed ? 'Terkonfirmasi' : 'Menunggu')}</span>
                    </span>
                  </div>

                  {/* Body: Service & Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold tracking-wider">
                        Layanan Terpilih
                      </span>
                      <h3 className="font-display font-bold text-lg text-neutral-900 tracking-tight">
                        {b.serviceName || b.service}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <span className="font-medium">Capster:</span>
                        <span className="text-neutral-900 font-bold bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                          {b.barberName || b.capster || 'Capster E-CUKUR'}
                        </span>
                      </div>
                    </div>

                    {/* Time Box */}
                    <div className="bg-[#F7F6F2] border border-neutral-200 rounded-xl p-3.5 sm:text-right shrink-0 space-y-0.5">
                      <div className="text-xs font-bold text-neutral-800 flex items-center sm:justify-end gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{b.date}</span>
                      </div>
                      <div className="text-xl font-display font-extrabold text-[#285844] font-mono">
                        {b.time} WIB
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        Mohon hadir 10 menit sebelum jadwal
                      </div>
                    </div>
                  </div>

                  {/* Customer Info & Price Footer */}
                  <div className="border-t border-neutral-100 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-neutral-500 font-mono text-[11px]">
                      <span>Pemesan: </span>
                      <strong className="text-neutral-900 font-semibold">{b.customerName || 'Pelanggan'}</strong>
                      {b.customerPhone && b.customerPhone !== '-' && (
                        <span> • {b.customerPhone}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-[11px] font-mono text-neutral-500 uppercase">
                        {b.paymentMethod || 'QRIS'} {b.paymentStatus ? `(${b.paymentStatus})` : ''}
                      </span>
                      <div className="text-base sm:text-lg font-bold text-[#285844] font-mono">
                        {formatRupiah(b.price || 0)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </main>

    </div>
  );
}
