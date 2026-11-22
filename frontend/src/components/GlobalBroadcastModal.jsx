import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { RazorEMark } from './Logo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
        const data = customData || (typeof window !== 'undefined' && localStorage.getItem('ecukur_platform_settings') 
          ? JSON.parse(localStorage.getItem('ecukur_platform_settings')) 
          : null);
        
        setBroadcastData(data);

        const isActive = Boolean(data?.isBroadcastActive && data?.broadcastMessage && data.broadcastMessage.trim());
        if (!isActive) {
          setIsOpen(false);
          return;
        }

        // Cek apakah user sudah menutup pesan spesifik ini di sesi sekarang
        const dismissedMsg = typeof window !== 'undefined' ? sessionStorage.getItem('ecukur_dismissed_broadcast_msg') : null;
        if (dismissedMsg === data.broadcastMessage.trim()) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      } catch {
        setIsOpen(false);
      }
    };

    checkBroadcast();

    // Fetch langsung dari database Supabase agar otomatis sinkron ke HP pengguna mana pun
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('barbers')
        .select('features')
        .eq('slug', 'ecukur_system_config')
        .maybeSingle()
        .then(({ data }) => {
          if (data?.features?.platformSettings) {
            const settings = data.features.platformSettings;
            try {
              localStorage.setItem('ecukur_platform_settings', JSON.stringify(settings));
            } catch {}
            checkBroadcast(settings);
          }
        })
        .catch(() => {});
    }

    const handleStorage = () => checkBroadcast();
    window.addEventListener('storage', handleStorage);

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        
        {/* Backdrop clickable */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Card - Clean, Official & High-End E-CUKUR Identity (Responsive HP & Laptop) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[28px] shadow-2xl border border-neutral-200/90 overflow-hidden z-10 text-neutral-900 p-5 sm:p-7 space-y-4 sm:space-y-5"
          role="dialog"
          aria-modal="true"
        >
          {/* Header Row: Official e cukur Logo & Close Button */}
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 select-none">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center p-1.5 shadow-xs shrink-0">
                <RazorEMark className="w-full h-full" color="#ffffff" />
              </div>
              <div className="flex flex-col">
                <span className="font-sora font-extrabold text-lg text-neutral-900 tracking-tight leading-none lowercase">
                  e cukur
                </span>
                <span className="text-[9.5px] font-semibold text-neutral-400 tracking-wider uppercase mt-0.5">
                  Pengumuman Resmi
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Announcement Body */}
          <div className="space-y-2.5 sm:space-y-3">
            <h3 className="font-display font-black text-lg sm:text-xl text-neutral-900 tracking-tight leading-snug">
              Informasi & Pemberitahuan
            </h3>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FA] border border-neutral-200/80 text-[#171717]">
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-neutral-800 whitespace-pre-line">
                {messageText}
              </p>
            </div>

            <div className="text-[10.5px] sm:text-[11px] text-neutral-400 flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332] inline-block shrink-0" />
              <span>Disiarkan langsung oleh Administrator Sistem e cukur</span>
            </div>
          </div>

          {/* Action Button: Mengerti & Tutup */}
          <div className="pt-1 sm:pt-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-3 sm:py-3.5 bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Saya Mengerti</span>
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
