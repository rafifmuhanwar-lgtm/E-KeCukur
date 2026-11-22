import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, Check, BellRing } from 'lucide-react';

export default function GlobalBroadcastModal() {
  const [broadcastData, setBroadcastData] = useState(() => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('ecukur_platform_settings');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkBroadcast = (customData = null) => {
      try {
        const data = customData || (localStorage.getItem('ecukur_platform_settings') 
          ? JSON.parse(localStorage.getItem('ecukur_platform_settings')) 
          : null);
        
        setBroadcastData(data);

        const isActive = Boolean(data?.isBroadcastActive && data?.broadcastMessage && data.broadcastMessage.trim());
        if (!isActive) {
          setIsOpen(false);
          return;
        }

        // Cek apakah user sudah menutup pesan spesifik ini di sesi sekarang
        const dismissedMsg = sessionStorage.getItem('ecukur_dismissed_broadcast_msg');
        if (dismissedMsg === data.broadcastMessage.trim()) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      } catch {
        setIsOpen(false);
      }
    };

    // Jalankan pengecekan awal saat mount
    checkBroadcast();

    // Dengarkan event storage antar-tab
    const handleStorage = () => checkBroadcast();
    window.addEventListener('storage', handleStorage);

    // Dengarkan event kustom lokal (misal saat admin klik simpan / pratinjau)
    const handleCustomUpdate = (e) => checkBroadcast(e?.detail || null);
    window.addEventListener('ecukur_broadcast_update', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ecukur_broadcast_update', handleCustomUpdate);
    };
  }, []);

  const handleDismiss = () => {
    if (broadcastData?.broadcastMessage) {
      try {
        sessionStorage.setItem('ecukur_dismissed_broadcast_msg', broadcastData.broadcastMessage.trim());
      } catch {}
    }
    setIsOpen(false);
  };

  if (!isOpen || !broadcastData?.isBroadcastActive || !broadcastData?.broadcastMessage) {
    return null;
  }

  const messageText = broadcastData.broadcastMessage.trim();
  const platformName = broadcastData.platformName || 'E-CUKUR Link-in-Bio';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
        
        {/* Backdrop clickable */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Card - Styled like a modern premium announcement pop-up */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-neutral-100 overflow-hidden z-10 text-neutral-900"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Banner Gradient Header with Megaphone Illustration */}
          <div className="relative bg-gradient-to-tr from-[#0F291E] via-[#1B4332] to-[#2D6A4F] text-white pt-8 pb-7 px-6 text-center overflow-hidden">
            
            {/* Background Decorative Circles */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-400/10 pointer-events-none blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-emerald-300/10 pointer-events-none blur-lg" />

            {/* Close Button Top Right */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              title="Tutup pengumuman"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Megaphone Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 shadow-lg backdrop-blur-md flex items-center justify-center mx-auto mb-3.5 text-emerald-300">
              <Megaphone className="w-8 h-8 animate-pulse text-emerald-300" />
            </div>

            {/* Status Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200 text-[10.5px] font-bold uppercase tracking-wider mb-2">
              <BellRing className="w-3 h-3 text-emerald-300" />
              <span>Pengumuman Resmi Platform</span>
            </div>

            <h3 className="font-display font-black text-xl text-white tracking-tight">
              {platformName}
            </h3>
          </div>

          {/* Modal Body: Announcement Content */}
          <div className="p-6 sm:p-7 space-y-5">
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-[#171717] relative">
              <span className="text-3xl font-serif text-[#1B4332]/20 absolute top-2 left-3 select-none pointer-events-none">
                “
              </span>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-neutral-800 whitespace-pre-line relative z-10 pl-3">
                {messageText}
              </p>
            </div>

            <div className="text-[11px] text-neutral-400 text-center flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>Disiarkan langsung oleh Pengelola Sistem E-CUKUR</span>
            </div>

            {/* Action Button: Saya Mengerti */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143326] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/15 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Saya Mengerti & Lanjutkan</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
