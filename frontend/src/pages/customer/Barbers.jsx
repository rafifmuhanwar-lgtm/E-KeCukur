import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft, 
  UserX, 
  Search, 
  MapPin, 
  Scissors, 
  BadgeCheck, 
  Sparkles
} from 'lucide-react';
import { useStore } from '../../store';

export default function Barbers() {
  const navigate = useNavigate();
  const barbers = useStore((state) => state.barbers || []);
  const fetchBarbersFromSupabase = useStore((state) => state.fetchBarbersFromSupabase);
  const isLoading = useStore((state) => state.isLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');

  useEffect(() => {
    if (typeof fetchBarbersFromSupabase === 'function') {
      fetchBarbersFromSupabase();
    }
  }, [fetchBarbersFromSupabase]);

  // Extract unique cities safely
  const uniqueCities = useMemo(() => {
    const set = new Set();
    if (Array.isArray(barbers)) {
      barbers.forEach((b) => {
        if (b && typeof b.locationCity === 'string' && b.locationCity.trim()) {
          set.add(b.locationCity.trim());
        }
      });
    }
    return Array.from(set);
  }, [barbers]);

  // Filter barbers safely
  const filteredBarbers = useMemo(() => {
    if (!Array.isArray(barbers)) return [];
    return barbers.filter((b) => {
      if (!b) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchSearch = !q || 
        String(b.name || '').toLowerCase().includes(q) ||
        String(b.slug || '').toLowerCase().includes(q) ||
        String(b.specialty || '').toLowerCase().includes(q) ||
        String(b.locationCity || '').toLowerCase().includes(q);

      const bCity = String(b.locationCity || '').trim().toLowerCase();
      const matchCity = cityFilter === 'ALL' || bCity === cityFilter.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [barbers, searchQuery, cityFilter]);

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#285844] selection:text-white">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
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
                Direktori Barber
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              to="/customer/bookings"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 transition-colors hidden sm:block"
            >
              Cek Tiket Reservasi
            </Link>

            <Link
              to="/"
              className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 hover:text-black rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-24 flex-1 w-full space-y-8">
        
        {/* Editorial Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8EFEA] text-[#285844] border border-[#D9E5DC]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Resmi Stylist & Studio</span>
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight">
            Pilih Capster & Studio Favoritmu
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
            Temukan tukang cukur terbaik di kotamu, intip portofolio gaya rambut di link bio mereka, dan booking sesi cukur tanpa antre.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari capster, studio, spesialisasi, atau kota..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium outline-none focus:border-[#285844] focus:bg-white transition-colors"
            />
          </div>

          {uniqueCities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer text-neutral-700"
            >
              <option value="ALL">Semua Kota ({uniqueCities.length})</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          )}
        </div>

        {/* Barber Cards Grid */}
        {filteredBarbers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarbers.map((capster, i) => {
              const capsterIdentifier = capster.slug || capster.id;
              const photoUrl = capster.photo || 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop';
              const isStudio = capster?.plan === 'barber';
              const isPro = capster?.plan === 'capster';

              return (
                <motion.div 
                  key={capster.id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  onClick={() => navigate(`/${capsterIdentifier}`)}
                  className="group cursor-pointer bg-white border border-neutral-200 hover:border-neutral-300 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-2xs hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden relative bg-neutral-100">
                    <img 
                      src={photoUrl} 
                      alt={capster.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Live Status Badge */}
                    <div className="absolute top-3 left-3 text-[11px] font-mono px-2.5 py-1 rounded-full border border-emerald-200 bg-white/95 backdrop-blur-md text-emerald-800 flex items-center gap-1.5 font-bold shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{capster.schedule || 'Siap Terima Booking'}</span>
                    </div>

                    {/* Verified Plan Badge */}
                    {(isStudio || isPro) && (
                      <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#171717]/90 text-white flex items-center gap-1 backdrop-blur-sm shadow-xs">
                        <BadgeCheck className={`w-3.5 h-3.5 ${isStudio ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span>{isStudio ? 'Official Studio' : 'Verified Pro'}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-neutral-900 group-hover:text-[#285844] transition-colors leading-snug">
                          {capster.name}
                        </h3>
                        <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                          /{capster.slug || capsterIdentifier}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{capster.locationCity || 'Indonesia'} • {capster.segment || 'Capster'}</span>
                      </div>

                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed pt-1">
                        {capster.specialty || capster.bio || 'Spesialis potong rambut pria & grooming presisi.'}
                      </p>
                    </div>

                    <div className="border-t border-neutral-100 pt-3.5 flex items-center justify-between text-xs">
                      <span className="text-neutral-500 font-semibold group-hover:text-[#285844] transition-colors">
                        Buka Bio Link & Jadwal
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 group-hover:bg-[#285844] group-hover:text-white text-neutral-700 flex items-center justify-center transition-all shadow-2xs">
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-neutral-200 rounded-2xl bg-white p-8 max-w-md mx-auto shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              {isLoading ? 'Memuat Profil Barber...' : 'Tidak Ditemukan Barber'}
            </h3>
            <p className="text-neutral-500 text-xs leading-relaxed">
              {isLoading 
                ? 'Sedang menghubungkan ke server untuk mengambil daftar barber...' 
                : 'Coba ubah kata kunci pencarian atau daftar sebagai capster baru di E-CUKUR.'}
            </p>
            <div className="pt-2">
              <Link
                to="/login?mode=register"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Daftar Jadi Barber</span>
              </Link>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
