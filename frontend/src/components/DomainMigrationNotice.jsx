import React, { useState, useEffect } from 'react';
import { ExternalLink, ArrowRight, ShieldCheck, Globe, Sparkles } from 'lucide-react';
import Logo from './Logo';

export default function DomainMigrationNotice() {
  const [countdown, setCountdown] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Soft Mesh Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#285844]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Brand Logo */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pt-2 sm:pt-4 z-10">
        <Logo variant="full" size="md" />
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pengumuman Resmi</span>
        </span>
      </header>

      {/* Main Notice Card */}
      <main className="max-w-lg w-full mx-auto my-auto z-10 py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/90 shadow-xl space-y-6 text-center relative overflow-hidden">
          {/* Top Brand Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#285844] via-emerald-500 to-amber-500" />

          {/* Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-[#D9E5DC]/50 border border-emerald-200 text-[#285844] flex items-center justify-center mx-auto shadow-2xs">
            <Globe className="w-8 h-8 text-[#285844] animate-pulse" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#285844] font-bold">
              Domain Baru Telah Aktif
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#171717] tracking-tight">
              Website Resmi Kami Telah Berpindah Alamat
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Untuk memberikan pengalaman terbaik, seluruh layanan profil, booking jadwal, dan dashboard kini resmi beralih ke domain:
            </p>
          </div>

          {/* Highlighting New Domain */}
          <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-display font-black text-xl sm:text-2xl text-[#285844] tracking-tight">
              ecukur.biz.id
            </span>
          </div>

          {/* Call to Action Button */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleRedirectNow}
              className="w-full py-4 px-6 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <span>Kunjungi ecukur.biz.id Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Countdown notice */}
            <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-2">
              {!isPaused ? (
                <>
                  <span>Otomatis dialihkan dalam <strong>{countdown}</strong> detik...</span>
                  <button
                    type="button"
                    onClick={() => setIsPaused(true)}
                    className="text-xs font-semibold text-neutral-600 hover:text-black underline cursor-pointer"
                  >
                    Jeda
                  </button>
                </>
              ) : (
                <>
                  <span>Pengalihan otomatis dijeda.</span>
                  <button
                    type="button"
                    onClick={() => setIsPaused(false)}
                    className="text-xs font-semibold text-[#285844] underline cursor-pointer"
                  >
                    Lanjutkan
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Path Retention Note */}
          <p className="text-[10px] text-neutral-400 italic pt-1">
            * Kamu akan langsung diarahkan ke halaman yang sama di domain resmi baru.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center pb-2 z-10 text-[11px] text-neutral-400 font-medium">
        © {new Date().getFullYear()} E Cukur Indonesia • Platform Digital Barbershop & Capster
      </footer>
    </div>
  );
}
