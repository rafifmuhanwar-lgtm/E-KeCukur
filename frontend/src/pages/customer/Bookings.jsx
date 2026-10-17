import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  Copy, 
  Check
} from 'lucide-react';
import Logo from '../../components/Logo';
import { useStore } from '../../store';

export default function CustomerBookings() {
  const navigate = useNavigate();
  const bookings = useStore((state) => state.bookings);
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
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-white selection:text-black antialiased pb-24">
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex justify-between items-center">
        <div 
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2.5 group"
        >
          <Logo variant="compact" theme="light" size="sm" />
          <span className="text-zinc-600">/</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Bookings</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/booking')} 
            className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Pesan Baru</span>
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
          >
            Beranda
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-zinc-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Jadwal & Riwayat Reservasi
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Daftar reservasi sesi potong rambut Anda yang telah tercatat realtime di sistem studio E-Cukur.
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-mono text-zinc-300">
              {bookings.length} Tiket Reservasi
            </span>
          </div>
        </div>

        {/* Bookings List or Empty State */}
        {bookings.length === 0 ? (
          <div className="text-center py-20 border border-zinc-800/80 rounded-2xl bg-zinc-900/40 p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Belum Ada Jadwal Reservasi
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm mb-6 leading-relaxed">
              Pilih capster favorit Anda dan amankan jam kunjungan tanpa perlu antre di lokasi barbershop.
            </p>
            <button 
              onClick={() => navigate('/booking')}
              className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Mulai Reservasi Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => {
              const shortId = getShortId(b.id);
              const isCompleted = b.status === 'Selesai';
              const isCancelled = b.status === 'Batal' || b.status === 'Dibatalkan';
              const isCopied = copiedId === b.id;

              return (
                <motion.div 
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl p-5 sm:p-6 transition-all shadow-sm space-y-4"
                >
                  {/* Top Bar: Pass ID & Status Pill */}
                  <div className="flex items-center justify-between border-b border-zinc-800/70 pb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800/90 px-2.5 py-1 rounded-lg">
                        {shortId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(b.id, b.id)}
                        className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                        title="Salin ID Lengkap"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin ID'}</span>
                      </button>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1 rounded-full ${
                      isCompleted ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' :
                      isCancelled ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50' :
                      'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{b.status}</span>
                    </span>
                  </div>

                  {/* Pass Body: Service & Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono uppercase text-zinc-400 font-medium tracking-wider">
                        Layanan Terpilih
                      </span>
                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {b.serviceName || b.service}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <span className="font-medium">Capster:</span>
                        <span className="text-white font-bold bg-zinc-800/70 px-2 py-0.5 rounded-md">
                          {b.barberName || b.capster || 'Reza'}
                        </span>
                      </div>
                    </div>

                    {/* Time Box */}
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 sm:text-right shrink-0">
                      <div className="text-xs font-bold text-white flex items-center sm:justify-end gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{b.date}</span>
                      </div>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                        {b.time} WIB
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Mohon hadir 10 menit sebelum jadwal
                      </div>
                    </div>
                  </div>

                  {/* Customer Info & Price Footer */}
                  <div className="border-t border-zinc-800/70 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-zinc-400 font-mono">
                      <span>Klien: </span>
                      <span className="text-zinc-200 font-semibold">{b.customerName || 'Pelanggan'}</span>
                      {b.customerPhone && b.customerPhone !== '-' && (
                        <span className="text-zinc-500"> • {b.customerPhone}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase">
                        {b.paymentMethod} ({b.paymentStatus})
                      </span>
                      <div className="text-base sm:text-lg font-black text-white font-mono">
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
