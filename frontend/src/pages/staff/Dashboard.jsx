import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Banknote, 
  Search, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  XCircle
} from 'lucide-react';
import { useStore } from '../../store';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const bookings = useStore((state) => state.bookings);
  const updateBookingStatus = useStore((state) => state.updateBookingStatus);
  const fetchBookings = useStore((state) => state.fetchBookings);
  const subscribeToBookings = useStore((state) => state.subscribeToBookings);

  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'Menunggu' | 'Selesai' | 'Batal'
  const [searchQuery, setSearchQuery] = useState('');

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

  // Helper to format short human ID
  const getShortId = (id) => {
    if (!id) return '#000';
    if (id.includes('-')) {
      const parts = id.split('-');
      return `#${parts[parts.length - 1].slice(0, 5).toUpperCase()}`;
    }
    return `#${id.slice(-5).toUpperCase()}`;
  };

  // Format WhatsApp Link
  const getWhatsAppLink = (phone, name, service, time) => {
    if (!phone) return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;
    const msg = encodeURIComponent(`Halo Mas ${name || ''}, kami dari E-Cukur Barbershop. Mengonfirmasi jadwal reservasi ${service || 'layanan potong rambut'} Anda jam ${time || ''}. Apakah sudah siap menuju lokasi?`);
    return `https://wa.me/${clean}?text=${msg}`;
  };

  const totalPendapatan = bookings.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalMenunggu = bookings.filter((b) => b.status === 'Menunggu').length;
  const totalSelesai = bookings.filter((b) => b.status === 'Selesai').length;

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = activeFilter === 'ALL' || b.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !searchQuery || 
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      (b.serviceName && b.serviceName.toLowerCase().includes(q)) ||
      (b.barberName && b.barberName.toLowerCase().includes(q)) ||
      (b.id && b.id.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-white selection:text-black antialiased">
      
      {/* Top Header */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-white shadow-inner">
            <Scissors className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-sm sm:text-base">E-CUKUR</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                PORTAL KASIR
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Database Aktif</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/customer/barbers')} 
            className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <span>Preview Customer</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </button>
          
          <button 
            onClick={() => navigate('/login')} 
            className="flex items-center gap-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 px-3.5 py-1.5 rounded-lg transition-all active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        
        {/* Page Title & Quick Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Reservasi & Antrean
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Pantau pesanan yang masuk melalui link bio capster, verifikasi antrean, dan perbarui status layanan kasir.
            </p>
          </div>

          <button
            onClick={() => fetchBookings()}
            className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan Ulang</span>
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 mb-8">
          
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-medium">
                Antrean Menunggu
              </span>
              <div className="text-3xl font-black text-amber-400 mt-1 tracking-tight">
                {totalMenunggu}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Pelanggan belum dilayani
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-medium">
                Pelayanan Selesai
              </span>
              <div className="text-3xl font-black text-emerald-400 mt-1 tracking-tight">
                {totalSelesai}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Reservasi sukses diselesaikan
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-medium">
                Estimasi Omset Tercatat
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                {formatRupiah(totalPendapatan)}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Dari {bookings.length} total reservasi
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Banknote className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          
          {/* Segmented Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: `Semua (${bookings.length})` },
              { id: 'Menunggu', label: `Menunggu (${totalMenunggu})` },
              { id: 'Selesai', label: `Selesai (${totalSelesai})` },
              { id: 'Batal', label: 'Dibatalkan' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pelanggan, capster, nomor..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Orders Content: Responsive Split View */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-6">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              Tidak Ada Data Reservasi
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery 
                ? `Tidak ditemukan hasil yang cocok dengan kata kunci "${searchQuery}".` 
                : 'Belum ada reservasi dengan filter yang dipilih saat ini.'}
            </p>
          </div>
        ) : (
          <div>
            
            {/* MOBILE VIEW (< md): Modern Card Stack */}
            <div className="grid grid-cols-1 gap-3.5 md:hidden">
              {filteredBookings.map((b) => {
                const shortId = getShortId(b.id);
                const isCompleted = b.status === 'Selesai';
                const isCancelled = b.status === 'Batal' || b.status === 'Dibatalkan';
                const isPending = b.status === 'Menunggu';

                return (
                  <div 
                    key={b.id}
                    className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3.5 shadow-sm"
                  >
                    {/* Top line: Short ID, Status & Price */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">
                          {shortId}
                        </span>
                        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                          isCompleted ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' :
                          isCancelled ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50' :
                          'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      
                      <div className="text-sm font-bold text-white font-mono">
                        {formatRupiah(b.price || 0)}
                      </div>
                    </div>

                    {/* Customer Info & Service */}
                    <div className="border-t border-b border-zinc-800/70 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span>{b.customerName}</span>
                          </div>
                          <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>{b.customerPhone || 'Tanpa No. HP'}</span>
                            {b.customerPhone && b.customerPhone !== '-' && (
                              <a
                                href={getWhatsAppLink(b.customerPhone, b.customerName, b.serviceName, b.time)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono uppercase text-zinc-500 block">Metode</span>
                          <span className="text-xs font-semibold text-zinc-300">
                            {b.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-zinc-200 font-semibold block">{b.serviceName || 'Layanan Cukur'}</span>
                          <span className="text-[11px] text-zinc-400">Capster: {b.barberName || 'Barber'}</span>
                        </div>
                        <div className="text-right text-zinc-400 font-mono text-[11px]">
                          <span className="text-white font-bold block">{b.time} WIB</span>
                          <span>{b.date}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status Switcher Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {!isCompleted && (
                        <button
                          onClick={() => updateBookingStatus(b.id, 'Selesai')}
                          className="flex-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-xl transition-colors text-center active:scale-95 shadow-sm"
                        >
                          Tandai Selesai
                        </button>
                      )}
                      {!isPending && (
                        <button
                          onClick={() => updateBookingStatus(b.id, 'Menunggu')}
                          className="px-3 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-xl transition-colors active:scale-95"
                        >
                          Menunggu
                        </button>
                      )}
                      {!isCancelled && (
                        <button
                          onClick={() => updateBookingStatus(b.id, 'Batal')}
                          className="px-3 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 py-2 rounded-xl transition-colors active:scale-95"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP VIEW (>= md): Crisp Structured Table */}
            <div className="hidden md:block bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400 bg-zinc-950/70">
                      <th className="py-3.5 px-4 font-semibold">Kode ID</th>
                      <th className="py-3.5 px-4 font-semibold">Pelanggan</th>
                      <th className="py-3.5 px-4 font-semibold">Layanan & Capster</th>
                      <th className="py-3.5 px-4 font-semibold">Jadwal Sesi</th>
                      <th className="py-3.5 px-4 font-semibold">Tarif & Bayar</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Aksi Kasir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredBookings.map((b) => {
                      const shortId = getShortId(b.id);
                      const isCompleted = b.status === 'Selesai';
                      const isCancelled = b.status === 'Batal' || b.status === 'Dibatalkan';
                      const isPending = b.status === 'Menunggu';

                      return (
                        <tr key={b.id} className="text-sm hover:bg-white/[0.02] transition-colors">
                          
                          {/* Short ID */}
                          <td className="py-4 px-4 font-mono text-xs font-bold text-zinc-400">
                            {shortId}
                          </td>

                          {/* Customer */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">{b.customerName}</div>
                            <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                              <span>{b.customerPhone || '-'}</span>
                              {b.customerPhone && b.customerPhone !== '-' && (
                                <a
                                  href={getWhatsAppLink(b.customerPhone, b.customerName, b.serviceName, b.time)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Kirim pesan WhatsApp konfirmasi"
                                  className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-[11px]"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat WA</span>
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Service & Capster */}
                          <td className="py-4 px-4">
                            <div className="font-semibold text-zinc-100">{b.serviceName || b.service}</div>
                            <div className="text-xs text-zinc-400 mt-0.5">
                              Capster: <span className="text-zinc-300 font-medium">{b.barberName || b.capster}</span>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="py-4 px-4 text-xs">
                            <div className="font-bold text-white font-mono">{b.time} WIB</div>
                            <div className="text-zinc-400 mt-0.5">{b.date}</div>
                          </td>

                          {/* Price & Payment */}
                          <td className="py-4 px-4 text-xs font-mono">
                            <div className="font-bold text-white">{formatRupiah(b.price || 0)}</div>
                            <div className="text-zinc-400 text-[11px] mt-0.5">
                              {b.paymentMethod}
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full ${
                              isCompleted ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50' :
                              isCancelled ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50' :
                              'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                            }`}>
                              {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                              {b.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {!isCompleted && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'Selesai')}
                                  className="text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                                >
                                  Selesai
                                </button>
                              )}
                              {!isPending && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'Menunggu')}
                                  className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                                >
                                  Menunggu
                                </button>
                              )}
                              {!isCancelled && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'Batal')}
                                  className="text-xs font-semibold text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
                                >
                                  Batal
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
