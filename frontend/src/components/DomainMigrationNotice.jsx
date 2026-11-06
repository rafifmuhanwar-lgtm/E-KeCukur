import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Globe, 
  Sparkles, 
  Copy, 
  Check, 
  Clock, 
  Zap, 
  Lock, 
  Scissors,
  Pause,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from './Logo';

export default function DomainMigrationNotice() {
  const TOTAL_SECONDS = 6;
  const [countdown, setCountdown] = useState(TOTAL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  // Preserve exact current path & search query
  const targetUrl = typeof window !== 'undefined'
    ? `https://ecukur.biz.id${window.location.pathname}${window.location.search}${window.location.hash}`
    : 'https://ecukur.biz.id';

  useEffect(() => {
    if (isPaused) return;

    if (countdown <= 0) {
      window.location.replace(targetUrl);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isPaused, targetUrl]);

  const handleRedirectNow = () => {
    window.location.replace(targetUrl);
  };

  const handleCopyNewDomain = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = ((TOTAL_SECONDS - countdown) / TOTAL_SECONDS) * 100;

  return (
    <div 
      className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans flex flex-col justify-between p-4 sm:p-6 sm:py-8 relative overflow-hidden select-none"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 10% 10%, rgba(40, 88, 68, 0.22), transparent 40%), radial-gradient(ellipse at 90% 20%, rgba(217, 229, 220, 0.7), transparent 45%), radial-gradient(ellipse at 50% 90%, rgba(40, 88, 68, 0.15), transparent 40%), linear-gradient(135deg, rgba(247, 246, 242, 0.95), rgba(235, 242, 237, 0.85))',
      }}
    >
      {/* Background Ambient Floating Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-300/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between z-10">
        <Logo variant="full" size="md" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-[#285844] border border-emerald-200/80 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-[#285844]" />
          <span>Pengumuman Resmi Platform</span>
        </div>
      </header>

      {/* Main Glassmorphic Showcase Card */}
      <main className="max-w-xl w-full mx-auto my-auto z-10 py-6 sm:py-8">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-9 border border-neutral-200/90 shadow-2xl space-y-6 sm:space-y-7 relative overflow-hidden"
        >
          {/* Top Multi-tone Brand Gradient Ribbon */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#285844] via-emerald-500 to-amber-500" />

          {/* Migration Visual Bridge */}
          <div className="bg-gradient-to-r from-neutral-50 via-emerald-50/50 to-neutral-50 p-3 sm:p-4 rounded-2xl border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-neutral-200/70 text-neutral-500 flex items-center justify-center text-xs font-mono font-bold shrink-0 line-through opacity-70">
                OLD
              </span>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Alamat Lama</span>
                <span className="text-xs font-mono text-neutral-500 line-through">ecukur.vercel.app</span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#285844] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce sm:animate-none">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right sm:text-left">
                <span className="text-[10px] uppercase font-bold text-[#285844] block flex items-center justify-end sm:justify-start gap-1">
                  <span>Domain Resmi</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
                <span className="text-xs font-mono font-extrabold text-[#171717]">ecukur.biz.id</span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-[#285844] flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </span>
            </div>
          </div>

          {/* Heading Section */}
          <div className="text-center space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#171717] tracking-tight leading-tight">
              E-CUKUR Resmi Beralih ke <br className="hidden sm:inline" />
              <span className="text-[#285844] underline decoration-[#285844]/30 underline-offset-4">ecukur.biz.id</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
              Seluruh layanan profil bio capster, sistem booking jadwal cukur, dan pembayaran QRIS telah dipindahkan ke domain resmi berkinerja tinggi.
            </p>
          </div>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <span className="text-[10.5px] font-bold text-neutral-800 block">Lebih Cepat</span>
              <span className="text-[9px] text-neutral-400 block">Server responsif</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <Lock className="w-4 h-4 text-[#285844] mx-auto mb-1" />
              <span className="text-[10.5px] font-bold text-neutral-800 block">100% Aman</span>
              <span className="text-[9px] text-neutral-400 block">Enkripsi SSL aktif</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70">
              <Scissors className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10.5px] font-bold text-neutral-800 block">Data Utuh</span>
              <span className="text-[9px] text-neutral-400 block">Profil & booking aman</span>
            </div>
          </div>

          {/* Action Button & Timer Progress Bar */}
          <div className="space-y-3 pt-2">
            {/* Visual Progress Bar */}
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#285844] to-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Big Shiny CTA Button */}
            <button
              type="button"
              onClick={handleRedirectNow}
              className="w-full py-4 px-6 bg-[#285844] hover:bg-[#1E4334] text-white font-display font-extrabold text-sm sm:text-base rounded-2xl shadow-[0_4px_14px_rgba(40,88,68,0.35)] hover:shadow-[0_6px_20px_rgba(40,88,68,0.45)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer"
            >
              <span>Buka ecukur.biz.id Sekarang</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </button>

            {/* Timer Controller & Copy Link */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2 text-neutral-600">
                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {!isPaused ? (
                  <span>
                    Beralih otomatis dalam <strong>{countdown} detik</strong>...
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium">Pengalihan otomatis dijeda.</span>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  title={isPaused ? 'Lanjutkan countdown' : 'Jeda countdown'}
                >
                  {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                  <span>{isPaused ? 'Lanjut' : 'Jeda'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyNewDomain}
                className="text-[11px] font-semibold text-[#285844] hover:underline flex items-center gap-1 cursor-pointer"
                title="Salin alamat link baru"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Alamat Baru</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seamless Path Notice */}
          <div className="pt-2 border-t border-neutral-100 text-center">
            <p className="text-[11px] text-neutral-400">
              💡 <em>Link tujuan otomatis disesuaikan. Kamu akan langsung membuka halaman yang sama di domain resmi.</em>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center pb-2 z-10 text-xs text-neutral-400 font-medium space-y-1">
        <p>© {new Date().getFullYear()} E Cukur Indonesia • Ekosistem Digital Barbershop & Capster</p>
        <p className="text-[10px] text-neutral-400/80">Domain Resmi: <strong className="text-neutral-600">https://ecukur.biz.id</strong></p>
      </footer>
    </div>
  );
}
