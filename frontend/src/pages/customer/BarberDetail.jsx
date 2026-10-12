import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CalendarCheck, ShieldCheck } from 'lucide-react';

const CAPSTERS_DATA = {
  reza: { name: 'Reza', specialty: 'Classic Cut & Fade', img: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia' },
  bima: { name: 'Bima', specialty: 'Hair Coloring & Perm', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia' },
  andi: { name: 'Andi', specialty: 'Beard Grooming & Shave', img: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop', status: 'Tersedia' },
  doni: { name: 'Doni', specialty: 'Modern Undercut', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop', status: 'Sedang Istirahat' },
};

export default function BarberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const capster = CAPSTERS_DATA[id];

  if (!capster) return <div className="min-h-screen bg-black text-white p-20 text-center font-bold">Capster tidak ditemukan.</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row selection:bg-[#C5A059] selection:text-black">
      
      {/* Left Side: Photo with Vignette */}
      <div className="w-full md:w-1/2 h-[55vh] md:h-screen relative overflow-hidden">
        <button 
          onClick={() => navigate('/customer/barbers')} 
          className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#C5A059] hover:text-black transition-all border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <img src={capster.img} alt={capster.name} className="w-full h-full object-cover grayscale brightness-90 contrast-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black"></div>
      </div>

      {/* Right Side: Details & Booking */}
      <div className="w-full md:w-1/2 h-full md:h-screen overflow-y-auto p-8 md:p-16 flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="py-8">
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${capster.status === 'Tersedia' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className="text-xs uppercase tracking-[0.2em] font-bold text-gray-400">{capster.status}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">{capster.name}</h1>
          <p className="text-lg font-bold uppercase tracking-widest text-[#C5A059] mb-6">{capster.specialty}</p>

          <p className="text-gray-400 font-light leading-relaxed mb-8 max-w-md text-sm md:text-base">
            Merupakan seniman rambut berdedikasi tinggi dengan jam terbang solid di industri barbershop modern. Fokus pada detail potongan presisi, simetri wajah, dan kenyamanan paripurna.
          </p>

          {/* Schedule Grid */}
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2 max-w-md">Jadwal Operasional</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md mb-8">
            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-4">
              <CalendarCheck className="w-5 h-5 text-[#C5A059]" />
              <div>
                <div className="text-[10px] uppercase text-gray-500 font-bold">Hari Kerja</div>
                <div className="text-sm font-bold">Senin - Sabtu</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 p-4">
              <Clock className="w-5 h-5 text-[#C5A059]" />
              <div>
                <div className="text-[10px] uppercase text-gray-500 font-bold">Jam Kerja</div>
                <div className="text-sm font-bold">09:00 - 20:00</div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => navigate(`/booking?barber=${capster.name}`)}
            className="w-full max-w-md bg-[#C5A059] text-black py-4 font-black uppercase tracking-widest text-xs hover:bg-[#d4b474] transition-all hover:scale-[1.02] flex items-center justify-center gap-3 shadow-2xl"
          >
            Booking Sesi dengan {capster.name} <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
          
          <div className="flex items-center gap-2 mt-4 max-w-md justify-center text-zinc-600 mb-10">
            <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
            <span className="text-[10px] uppercase tracking-widest">Jaminan Standar E-CUKUR</span>
          </div>

          {/* Portfolio Gallery */}
          <div className="max-w-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-zinc-800 pb-2">Portfolio Masterpiece</h3>
            <div className="grid grid-cols-2 gap-3">
              <img src="https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600" className="w-full aspect-square object-cover grayscale hover:grayscale-0 transition-all cursor-pointer border border-zinc-900" alt="Portfolio 1" />
              <img src="https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=600" className="w-full aspect-square object-cover grayscale hover:grayscale-0 transition-all cursor-pointer border border-zinc-900" alt="Portfolio 2" />
            </div>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
