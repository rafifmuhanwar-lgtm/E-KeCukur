import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, LogOut, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { useStore } from '../../store';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const bookings = useStore((state) => state.bookings);
  const updateBookingStatus = useStore((state) => state.updateBookingStatus);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const totalPendapatan = bookings.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalMenunggu = bookings.filter((b) => b.status === 'Menunggu').length;
  const totalSelesai = bookings.filter((b) => b.status === 'Selesai').length;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#C5A059] selection:text-black">
      {/* Header Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-gray-900 px-6 py-4 flex justify-between items-center">
        <div className="text-xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
          <Scissors className="w-5 h-5 text-[#C5A059]" /> E-CUKUR STAFF PORTAL
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/customer/barbers')} 
            className="text-xs uppercase font-bold tracking-widest text-gray-400 hover:text-white transition-colors"
          >
            Lihat Sisi Customer
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors border border-red-500/30 px-3 py-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">Manajemen Reservasi</h1>
          <p className="text-gray-400 text-sm font-light">Monitor booking masuk, verifikasi antrean pelanggan, dan catat status pelayanan kasir.</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#0c0c0c] border border-gray-800 p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Antrean Menunggu</p>
              <h3 className="text-3xl font-black text-yellow-400 mt-1">{totalMenunggu}</h3>
            </div>
            <Clock className="w-8 h-8 text-yellow-400/30" />
          </div>

          <div className="bg-[#0c0c0c] border border-gray-800 p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Pelayanan Selesai</p>
              <h3 className="text-3xl font-black text-green-400 mt-1">{totalSelesai}</h3>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400/30" />
          </div>

          <div className="bg-[#0c0c0c] border border-gray-800 p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Estimasi Omset</p>
              <h3 className="text-2xl font-black text-[#C5A059] mt-1">{formatRupiah(totalPendapatan)}</h3>
            </div>
            <DollarSign className="w-8 h-8 text-[#C5A059]/30" />
          </div>
        </div>

        {/* Table List */}
        <div className="bg-[#0c0c0c] border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Daftar Antrean & Pesanan Hari Ini</h2>
            <span className="text-xs text-gray-500">{bookings.length} Total Data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 bg-black">
                  <th className="p-4">Kode ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Capster & Layanan</th>
                  <th className="p-4">Waktu</th>
                  <th className="p-4">Pembayaran</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ubah Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {bookings.map((b) => (
                  <tr key={b.id} className="text-sm font-light hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono font-bold text-xs text-gray-400">{b.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{b.customerName}</div>
                      <div className="text-xs text-gray-500">{b.customerPhone || '-'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#C5A059] text-xs uppercase">{b.serviceName || b.service}</div>
                      <div className="text-xs text-gray-400">Capster: {b.barberName || b.capster}</div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-bold text-white">{b.time}</div>
                      <div className="text-gray-500">{b.date}</div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-bold">{formatRupiah(b.price || 0)}</div>
                      <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                        {b.paymentMethod} • <span className={b.paymentStatus === 'PAID' ? 'text-green-400' : 'text-yellow-400'}>{b.paymentStatus}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border ${
                        b.status === 'Selesai' ? 'text-green-400 border-green-500/20 bg-green-500/10' :
                        b.status === 'Dibatalkan' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                        'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.status !== 'Selesai' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Selesai')}
                            className="text-[10px] font-bold uppercase tracking-wider bg-green-500/20 hover:bg-green-500 hover:text-black text-green-400 px-3 py-1.5 transition-colors"
                          >
                            Selesai
                          </button>
                        )}
                        {b.status !== 'Menunggu' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Menunggu')}
                            className="text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 hover:bg-yellow-500 hover:text-black text-yellow-400 px-3 py-1.5 transition-colors"
                          >
                            Menunggu
                          </button>
                        )}
                        {b.status !== 'Dibatalkan' && (
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'Dibatalkan')}
                            className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 px-2.5 py-1.5 transition-colors"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
