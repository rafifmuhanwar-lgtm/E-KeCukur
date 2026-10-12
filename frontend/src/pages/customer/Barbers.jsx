import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Scissors, Sparkles } from 'lucide-react';

const CAPSTERS = [
  { id: 'reza', num: '01', name: 'Reza', specialty: 'Classic Cut & Fade', experience: '8 Tahun Pengalaman', img: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop' },
  { id: 'bima', num: '02', name: 'Bima', specialty: 'Hair Coloring & Perm', experience: '6 Tahun Pengalaman', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop' },
  { id: 'andi', num: '03', name: 'Andi', specialty: 'Beard Grooming & Shave', experience: '9 Tahun Pengalaman', img: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop' },
  { id: 'doni', num: '04', name: 'Doni', specialty: 'Modern Undercut', experience: '5 Tahun Pengalaman', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop' },
];

export default function Barbers() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#C5A059] selection:text-black pb-24">
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-zinc-900 px-6 py-5 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div 
          onClick={() => navigate('/')}
          className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2 cursor-pointer"
        >
          <Scissors className="w-5 h-5 text-[#C5A059]" /> E-CUKUR STUDIO
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="border border-zinc-700 text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#C5A059] hover:text-black hover:border-[#C5A059] transition-all"
        >
          Kembali
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-36">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="mb-16 text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 border border-[#C5A059]/40 bg-zinc-950 px-4 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#C5A059]">The Master Artisans</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">PILIH CAPSTER</h1>
          <p className="text-gray-400 font-light text-sm md:text-base leading-relaxed">
            Setiap artis rambut kami menguasai teknik pemotongan presisi tinggi. Pilih seniman yang paling mewakili gaya dan karakter yang ingin Anda tampilkan.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPSTERS.map((capster, i) => (
            <motion.div 
              key={capster.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
              onClick={() => navigate(`/customer/barbers/${capster.id}`)}
              className="group cursor-pointer bg-zinc-950 border border-zinc-900 hover:border-[#C5A059]/60 transition-all duration-500 overflow-hidden relative"
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img 
                  src={capster.img} 
                  alt={capster.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                />
                
                {/* Number Badge */}
                <div className="absolute top-4 left-4 font-mono font-bold text-xs bg-black/80 px-3 py-1 border border-white/10 text-white">
                  {capster.num}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <div className="text-[10px] text-[#C5A059] uppercase tracking-widest font-bold mb-1">{capster.experience}</div>
                  <h3 className="text-3xl font-black uppercase tracking-tight mb-1 text-white group-hover:text-[#C5A059] transition-colors">{capster.name}</h3>
                  <p className="text-xs text-gray-300 uppercase tracking-wider font-light mb-4">{capster.specialty}</p>
                  
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">Lihat Jadwal & Profil</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#C5A059] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

    </div>
  );
}
