import React, { useState, useEffect } from 'react';
import { ArrowRight, Copy, Check } from 'lucide-react';
import Logo from './Logo';

export default function DomainMigrationNotice() {
  const [countdown, setCountdown] = useState(5);
  const [copied, setCopied] = useState(false);

  // Preserve exact current path & search query
  const targetUrl = typeof window !== 'undefined'
    ? `https://ecukur.biz.id${window.location.pathname}${window.location.search}${window.location.hash}`
    : 'https://ecukur.biz.id';

  useEffect(() => {
    if (countdown <= 0) {
      window.location.replace(targetUrl);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, targetUrl]);

  const handleRedirectNow = () => {
    window.location.replace(targetUrl);
  };

  const handleCopyNewDomain = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Header */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between">
        <Logo variant="full" size="md" />
        <span className="text-xs font-mono text-neutral-400">
          Pemberitahuan
        </span>
      </header>

      {/* Main Clean Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
          
          {/* Title & Human Intro */}
          <div className="space-y-2">
            <span className="inline-block px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-600 text-[11px] font-semibold">
              Update Alamat Web
            </span>
            <h1 className="font-display font-extrabold text-2xl text-[#171717] tracking-tight">
              E-CUKUR pindah ke domain resmi
            </h1>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Mulai sekarang, seluruh link bio dan sistem booking E-CUKUR bisa kamu buka di alamat resmi baru:
            </p>
          </div>

          {/* Clean Domain Card */}
          <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] text-neutral-400 font-medium block">Alamat Baru:</span>
              <span className="font-mono font-bold text-sm text-[#285844] truncate block">
                ecukur.biz.id
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyNewDomain}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>

          {/* Action Button & Timer */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleRedirectNow}
              className="w-full py-3.5 px-5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Lanjut ke ecukur.biz.id</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-xs text-neutral-400 font-mono">
                Otomatis berpindah dalam {countdown} detik...
              </span>
            </div>
          </div>

          {/* Simple Note */}
          <p className="text-[11px] text-neutral-400 text-center border-t border-neutral-100 pt-3">
            Semua link bio barber dan data akun kamu tetap aman dan otomatis tersambung.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl w-full mx-auto text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} E Cukur • ecukur.biz.id
      </footer>
    </div>
  );
}
