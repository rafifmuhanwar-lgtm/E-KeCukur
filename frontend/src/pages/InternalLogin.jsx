import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, UserCheck, Scissors, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Logo from '../components/Logo';

export default function InternalLogin() {
  const navigate = useNavigate();
  const [role, setRole] = useState('STAFF'); // 'STAFF' | 'BARBER'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (authError) {
          throw new Error(authError.message || 'Kredensial tidak valid. Silakan periksa kembali email dan kata sandi Anda.');
        }
      }

      setIsLoading(false);
      if (role === 'STAFF' || email.includes('staff') || email.includes('admin')) {
        navigate('/staff/dashboard');
      } else {
        navigate('/barber/dashboard');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali email dan kata sandi.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans flex items-center justify-center p-4 sm:p-6 selection:bg-white selection:text-black antialiased">
      
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm sm:max-w-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div 
            onClick={() => navigate('/')}
            className="cursor-pointer inline-flex items-center mb-4 group"
          >
            <Logo variant="horizontal" theme="light" size="lg" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Portal Internal Barbershop
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Akses khusus tim operasional kasir dan capster studio
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
          
          {/* Role Segmented Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setRole('STAFF')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                role === 'STAFF' 
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Staff / Kasir</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('BARBER')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                role === 'BARBER' 
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Capster</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl border border-rose-800/50 bg-rose-950/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Email Internal
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'STAFF' ? 'staff@domain.com' : 'barber@domain.com'}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 text-white rounded-xl py-2.5 pl-10 pr-3.5 text-xs sm:text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 text-white rounded-xl py-2.5 pl-10 pr-3.5 text-xs sm:text-sm outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-2 bg-white text-black font-bold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
            >
              {isLoading ? (
                <span className="animate-pulse">Memverifikasi Kredensial...</span>
              ) : (
                <>
                  <span>Masuk ke Portal {role === 'STAFF' ? 'Staff' : 'Capster'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Return to home link */}
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => navigate('/')} 
            className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda Utama</span>
          </button>
        </div>

      </motion.div>

    </div>
  );
}
