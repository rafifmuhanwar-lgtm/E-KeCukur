import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Calendar, Scissors, PlusCircle } from 'lucide-react';
import { useStore } from '../../store';

export default function CustomerBookings() {
  const navigate = useNavigate();
  const bookings = useStore((state) => state.bookings);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#C5A059] selection:text-black pb-20">
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-gray-900 px-4 md:px-6 py-4 md:py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
          E-CUKUR STUDIO
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/booking')} 
            className="bg-[#C5A059] text-black px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-[#d4b474] transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Pesan Baru
          </button>
          <button onClick={() => navigate('/customer/barbers')} className="border border-gray-700 text-white px-4 py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
            Capster
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-32">
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Riwayat Pemesanan</h1>
            <p className="text-xs text-gray-500 font-light mt-1">Daftar reservasi potong rambut Anda yang tercatat di sistem.</p>
          </div>
          <span className="text-xs uppercase font-bold text-[#C5A059] tracking-widest">{bookings.length} Pesanan</span>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-20 border border-gray-800 bg-[#0a0a0a] p-8">
            <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-wider mb-2">Belum Ada Pemesanan</h3>
            <p className="text-gray-500 text-sm mb-6 font-light">Jadwalkan potongan rambut pertamamu dengan capster profesional kami.</p>
            <button 
              onClick={() => navigate('/booking')}
              className="bg-[#C5A059] text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#d4b474] transition-colors"
            >
              Mulai Pesan Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => (
              <motion.div 
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#0a0a0a] border border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start md:items-center gap-6">
                  <div className="hidden md:flex w-16 h-16 bg-black items-center justify-center border border-gray-800">
                    <Scissors className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400 bg-black border border-gray-800 px-2.5 py-1">{b.id}</span>
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 ${
                        b.status === 'Selesai' ? 'text-green-400 bg-green-400/10 border border-green-500/20' : 
                        b.status === 'Dibatalkan' ? 'text-red-400 bg-red-400/10 border border-red-500/20' :
                        'text-yellow-400 bg-yellow-400/10 border border-yellow-500/20'
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">
                        ({b.paymentMethod} • {b.paymentStatus})
                      </span>
                    </div>
                    <h3 className="text-xl font-bold uppercase tracking-wide mb-1 text-white">{b.serviceName || b.service}</h3>
                    <div className="flex items-center gap-4 text-xs font-light text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#C5A059]" /> {b.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#C5A059]" /> {b.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-between items-center md:items-end border-t border-gray-800 md:border-0 pt-4 md:pt-0">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                    Capster: <span className="text-white">{b.barberName || b.capster}</span>
                  </div>
                  <div className="text-lg font-black text-[#C5A059]">{formatRupiah(b.price)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
