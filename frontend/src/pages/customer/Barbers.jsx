import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, UserX } from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';

export default function Barbers() {
  const navigate = useNavigate();
  const barbers = useStore((state) => state.barbers);
  const fetchBarbersFromSupabase = useStore((state) => state.fetchBarbersFromSupabase);
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    if (typeof fetchBarbersFromSupabase === 'function') {
      fetchBarbersFromSupabase();
    }
  }, [fetchBarbersFromSupabase]);

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-white selection:text-black antialiased pb-24">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex justify-between items-center">
        <div 
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2.5 group"
        >
          <Logo variant="compact" theme="light" size="sm" />
          <span className="text-zinc-600">/</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Capster</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/booking')} 
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors hidden sm:block"
          >
            Pesan Cepat
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="px-3.5 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14">
        
        {/* Editorial Heading */}
        <div className="mb-10 sm:mb-12 text-center max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Pilih Capster & Stylist
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
            Lihat portofolio gaya rambut, jam operasional, dan lakukan booking langsung melalui bio link personal masing-masing capster.
          </p>
        </div>

        {barbers && barbers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((capster, i) => {
              const capsterIdentifier = capster.slug || capster.id;
              const photoUrl = capster.photo || 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop';

              return (
                <motion.div 
                  key={capster.id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  onClick={() => navigate(`/${capsterIdentifier}`)}
                  className="group cursor-pointer bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-600 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden relative bg-zinc-950">
                    <img 
                      src={photoUrl} 
                      alt={capster.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Live Status Badge */}
                    <div className="absolute top-3.5 left-3.5 text-[11px] font-mono px-2.5 py-1 rounded-full border border-emerald-500/40 bg-zinc-950/80 backdrop-blur-md text-emerald-300 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{capster.schedule || 'Siap Terima Booking'}</span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {capster.name}
                        </h3>
                        <span className="text-xs font-mono text-zinc-500">
                          @{capster.slug || capsterIdentifier}
                        </span>
                      </div>
                      
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {capster.specialty || capster.bio || 'Spesialis potong rambut pria & grooming presisi.'}
                      </p>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-3.5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium group-hover:text-white transition-colors">
                        Buka Link Bio & Jadwal
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-white group-hover:text-black flex items-center justify-center transition-all">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 border border-zinc-800/80 rounded-2xl bg-zinc-900/30 p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              {isLoading ? 'Memuat Data Capster...' : 'Belum Ada Barber Terdaftar'}
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm mb-6 leading-relaxed">
              {isLoading 
                ? 'Sedang menghubungkan ke server Supabase untuk mengambil daftar profil barber...' 
                : 'Daftar sebagai capster pertama di platform E-Cukur untuk membuat link bio dan menerima booking online.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all shadow-sm"
            >
              Daftar Jadi Barber
            </button>
          </div>
        )}
      </main>

    </div>
  );
}
