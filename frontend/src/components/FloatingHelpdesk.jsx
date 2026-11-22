import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, X, MessageCircle, Mail, ExternalLink, Globe } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function FloatingHelpdesk() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ecukur_platform_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      supportWhatsapp: '6281234567890',
      supportEmail: 'support@ecukur.biz.id',
      instagramUrl: 'https://instagram.com/ecukur.id',
      tiktokUrl: 'https://tiktok.com/@ecukur.id'
    };
  });

  // Sinkronisasi data pengaturan dari Supabase atau storage event
  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('ecukur_platform_settings');
        if (saved) setSettings(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('barbers')
        .select('features')
        .eq('slug', 'ecukur_system_config')
        .maybeSingle()
        .then(({ data }) => {
          const cfg = data?.features?.platformSettings;
          if (cfg) {
            setSettings((prev) => ({ ...prev, ...cfg }));
          }
        })
        .catch(() => {});
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Tutup popover jika user klik di luar widget
  const popoverRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const cleanWhatsapp = (settings?.supportWhatsapp || '6281234567890').replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Halo Tim E-CUKUR, saya butuh informasi/bantuan.')}`;
  const mailUrl = `mailto:${settings?.supportEmail || 'support@ecukur.biz.id'}`;
  const igUrl = settings?.instagramUrl || 'https://instagram.com/ecukur.id';
  const ttUrl = settings?.tiktokUrl || 'https://tiktok.com/@ecukur.id';

  return (
    <div ref={popoverRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 select-none">
      {/* ─── POPOVER MENU MODAL ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-16 right-0 w-[310px] sm:w-[340px] bg-white rounded-[26px] shadow-2xl border border-neutral-200/90 overflow-hidden"
          >
            {/* Header Popover */}
            <div className="bg-gradient-to-br from-[#285844] to-[#1a3a2d] p-5 text-white relative">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-emerald-300 shadow-inner">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-white">
                    Pusat Bantuan E-CUKUR
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-emerald-200 font-medium">
                      Tim Helpdesk Online
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-white/80 mt-2.5 leading-relaxed">
                Pilih saluran resmi di bawah ini untuk konsultasi, bantuan pendaftaran, atau informasi platform:
              </p>
            </div>

            {/* List Menu Saluran */}
            <div className="p-3.5 space-y-2 bg-neutral-50/50">
              {/* 1. WhatsApp CS */}
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-white hover:bg-emerald-50/40 rounded-2xl border border-neutral-200 hover:border-emerald-300 transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-[#285844] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-neutral-900 group-hover:text-emerald-800 transition-colors">
                      WhatsApp Helpdesk
                    </div>
                    <div className="text-[10.5px] text-neutral-500 truncate">
                      Chat langsung dengan CS resmi
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 shrink-0" />
              </a>

              {/* 2. Email Dukungan */}
              <a
                href={mailUrl}
                className="p-3 bg-white hover:bg-blue-50/40 rounded-2xl border border-neutral-200 hover:border-blue-300 transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-neutral-900 group-hover:text-blue-800 transition-colors">
                      Email Dukungan
                    </div>
                    <div className="text-[10.5px] text-neutral-500 truncate">
                      {settings?.supportEmail || 'support@ecukur.biz.id'}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-600 shrink-0" />
              </a>

              {/* 3. Instagram Resmi */}
              <a
                href={igUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-white hover:bg-pink-50/40 rounded-2xl border border-neutral-200 hover:border-pink-300 transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-100 via-pink-100 to-rose-100 text-pink-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Globe className="w-4.5 h-4.5 text-pink-600" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-neutral-900 group-hover:text-pink-800 transition-colors">
                      Instagram Resmi
                    </div>
                    <div className="text-[10.5px] text-neutral-500 truncate">
                      Ikuti promo & fitur terbaru
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-pink-600 shrink-0" />
              </a>

              {/* 4. TikTok Resmi */}
              <a
                href={ttUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-white hover:bg-neutral-100 rounded-2xl border border-neutral-200 hover:border-neutral-400 transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <span className="text-xs font-black">TT</span>
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-neutral-900 transition-colors">
                      TikTok Resmi
                    </div>
                    <div className="text-[10.5px] text-neutral-500 truncate">
                      Video tutorial & panduan barber
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 shrink-0" />
              </a>
            </div>

            {/* Footer Popover */}
            <div className="p-3 bg-neutral-100/70 border-t border-neutral-200/80 text-center">
              <span className="text-[10px] text-neutral-500 font-medium">
                Resmi Dikelola oleh Tim Pengembang E-CUKUR
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOMBOL FLOATING HEADPHONE (CTA BUTTON) ─── */}
      <div className="relative group">
        {/* Tooltip Hover saat tertutup */}
        {!isOpen && (
          <div className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-[#171717] text-white text-[11px] font-bold rounded-xl whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Pusat Bantuan & Kontak</span>
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-[#171717]" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl cursor-pointer transition-all active:scale-95 border-2 border-white/20 ${
            isOpen 
              ? 'bg-[#171717] text-white hover:bg-neutral-800' 
              : 'bg-[#285844] hover:bg-[#1E4334] text-white hover:shadow-2xl hover:shadow-emerald-900/30'
          }`}
          aria-label="Pusat Bantuan & Kontak E-CUKUR"
          title="Pusat Bantuan & Kontak E-CUKUR"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0" />
          ) : (
            <>
              <Headphones className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-ping opacity-75" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
