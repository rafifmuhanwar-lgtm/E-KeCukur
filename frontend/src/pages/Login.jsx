import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock Login Logic
    setTimeout(() => {
      setIsLoading(false);
      
      // Simulasi pemisahan peran (Role-based redirect)
      if (email.includes('staff')) {
        navigate('/staff/dashboard');
      } else if (email.includes('capster') || email.includes('barber')) {
        navigate('/barber/dashboard');
      } else {
        // Default ke halaman pilih barber untuk customer
        navigate('/customer/barbers');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans flex items-center justify-center relative overflow-hidden selection:bg-white selection:text-black">
      
      {/* Background Cinematic */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" 
          alt="Barber aesthetic" 
          className="w-full h-full object-cover grayscale opacity-40"
        />
      </div>

      {/* Login Box */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-20 w-full max-w-md px-6"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">E-CUKUR PORTAL</h1>
          <p className="text-gray-400 text-sm font-light uppercase tracking-widest">Authorized Access Only</p>
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-8 md:p-10 shadow-2xl relative overflow-hidden">
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-gray-600 opacity-50"></div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email / ID Pengguna</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: capster1@ecukur.com"
                  className="w-full bg-black border border-gray-800 focus:border-white text-white p-4 pl-12 text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Kata Sandi</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black border border-gray-800 focus:border-white text-white p-4 pl-12 text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-4 bg-white text-black p-4 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>Masuk ke Sistem <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        {/* Info Text */}
        <div className="mt-8 flex items-start gap-3 justify-center text-gray-500">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-[10px] uppercase tracking-wider text-left">
            Sistem pintar E-CUKUR akan otomatis mendeteksi peran Anda (Customer, Staff, atau Capster) berdasarkan ID masuk.
          </p>
        </div>
      </motion.div>

    </div>
  );
}
