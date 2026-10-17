import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CalendarCheck, ShieldCheck, Scissors, ArrowRight } from 'lucide-react';

const CAPSTERS_DATA = {
  reza: { name: 'Reza', role: 'Senior Barber', specialty: 'Classic Cut & Fade', img: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia', exp: '8 Tahun Pengalaman' },
  bima: { name: 'Bima', role: 'Color & Texture Stylist', specialty: 'Hair Coloring & Perm', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia', exp: '6 Tahun Pengalaman' },
  andi: { name: 'Andi', role: 'Beard Specialist', specialty: 'Beard Grooming & Shave', img: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia', exp: '9 Tahun Pengalaman' },
  doni: { name: 'Doni', role: 'Modern Stylist', specialty: 'Modern Undercut', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop', status: 'Sedang Istirahat', exp: '5 Tahun Pengalaman' },
};

export default function BarberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const capster = CAPSTERS_DATA[id?.toLowerCase()];

  if (!capster) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Scissors className="w-12 h-12 text-zinc-600 mb-4" />
        <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Capster Tidak Ditemukan</h1>
        <p className="text-zinc-500 text-sm mb-6">Profil capster yang Anda cari tidak tersedia dalam direktori studio kami.</p>
        <button 
          onClick={() => navigate('/customer/barbers')}
          className="px-6 py-3 bg-white text-black font-bold uppercase text-xs rounded-full"
        >
          Kembali ke Daftar Capster
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row selection:bg-white selection:text-black">
      
      {/* Left Side: Photo with Vignette */}
      <div className="w-full md:w-1/2 h-[55vh] md:h-screen relative overflow-hidden bg-zinc-950">
        <button 
          onClick={() => navigate('/customer/barbers')} 
          className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest hover:bg-white hover:text-black transition-all border border-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
        <img 
          src={capster.img} 
          alt={capster.name} 
          className="w-full h-full object-cover grayscale brightness-90 contrast-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black" />
      </div>

      {/* Right Side: Details & Booking Action */}
      <div className="w-full md:w-1/2 min-h-screen overflow-y-auto p-6 sm:p-10 md:p-16 flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6 }} 
          className="py-6 max-w-lg"
        >
          
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`w-2 h-2 rounded-full ${capster.status === 'Tersedia' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">{capster.status}</span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">{capster.exp}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white mb-2">
            {capster.name}
          </h1>
          <p className="text-sm sm:text-base font-mono uppercase tracking-wider text-zinc-400 mb-6">
            {capster.role} &bull; {capster.specialty}
          </p>

          <p className="text-zinc-400 font-light leading-relaxed mb-8 text-xs sm:text-sm">
            Merupakan seniman rambut berdedikasi tinggi dengan jam terbang solid di industri barbershop modern. Fokus pada detail potongan presisi, proporsi anatomi wajah, dan kenyamanan paripurna setiap sesi grooming.
          </p>

          {/* Schedule Grid */}
          <div className="mb-8">
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-900 pb-2">
              Jadwal Operasional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl">
                <CalendarCheck className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-mono">Hari Kerja</div>
                  <div className="text-xs font-bold text-white">Senin &ndash; Sabtu</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl">
                <Clock className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 font-mono">Jam Praktik</div>
                  <div className="text-xs font-bold text-white">09:00 &ndash; 20:00 WIB</div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button 
            onClick={() => navigate(`/booking?barber=${capster.name}`)}
            className="w-full bg-white text-black py-4 font-black uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-2xl mb-4"
          >
            <span>Reservasi Sesi dengan {capster.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 justify-center text-zinc-500 text-[11px] font-mono mb-10">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Garansi Kualitas & Presisi E-CUKUR</span>
          </div>

          {/* Masterpiece Showcase */}
          <div>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-900 pb-2">
              Portfolio Karya
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950">
                <img 
                  src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" 
                  alt="Portfolio 1" 
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950">
                <img 
                  src="https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=600" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" 
                  alt="Portfolio 2" 
                />
              </div>
            </div>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
