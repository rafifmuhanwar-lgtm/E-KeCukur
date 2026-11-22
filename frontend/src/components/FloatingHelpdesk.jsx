import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, X, ArrowUpRight } from 'lucide-react';
import { RazorEMark } from './Logo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Official Vector Brand Icons (No AI slop)
function WhatsAppIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.16C10.56 20.16 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16ZM16.56 14.39C16.31 14.27 15.09 13.67 14.86 13.58C14.64 13.5 14.47 13.46 14.31 13.71C14.14 13.96 13.66 14.52 13.51 14.69C13.37 14.85 13.22 14.88 12.97 14.75C12.72 14.63 11.92 14.37 10.97 13.52C10.23 12.86 9.73 12.04 9.58 11.79C9.44 11.54 9.56 11.41 9.69 11.28C9.8 11.17 9.94 10.99 10.06 10.84C10.18 10.7 10.23 10.59 10.31 10.43C10.39 10.26 10.35 10.12 10.29 10C10.23 9.88 9.73 8.65 9.53 8.14C9.32 7.64 9.12 7.71 8.96 7.71C8.82 7.7 8.65 7.7 8.48 7.7C8.32 7.7 8.05 7.76 7.82 8.01C7.6 8.25 6.96 8.85 6.96 10.07C6.96 11.29 7.85 12.46 7.97 12.63C8.1 12.8 9.72 15.29 12.19 16.36C12.78 16.61 13.24 16.76 13.59 16.88C14.18 17.06 14.72 17.04 15.15 16.97C15.63 16.9 16.62 16.37 16.83 15.79C17.04 15.2 17.04 14.71 16.98 14.6C16.92 14.5 16.76 14.44 16.56 14.39Z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function TikTokIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.34 6.34 0 0 0-.88-.06A6.33 6.33 0 0 0 3.14 15.7a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.14z" />
    </svg>
  );
}

function MailIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

const CURRENT_YEAR = new Date().getFullYear();

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

  // Sinkronisasi data pengaturan realtime dari Supabase dan LocalStorage
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
  const waUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Halo CS E-CUKUR, saya butuh bantuan.')}`;
  const mailUrl = `mailto:${settings?.supportEmail || 'support@ecukur.biz.id'}`;
  const igUrl = settings?.instagramUrl || 'https://instagram.com/ecukur.id';
  const ttUrl = settings?.tiktokUrl || 'https://tiktok.com/@ecukur.id';

  return (
    <div ref={popoverRef} className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[60] select-none font-sans">
      {/* ─── POPOVER MODAL: IDENTITAS RESMI E-CUKUR ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute bottom-16 right-0 w-[310px] sm:w-[350px] bg-white rounded-[28px] shadow-2xl border border-neutral-200/90 overflow-hidden text-neutral-900"
          >
            {/* Header Resmi: Logo e cukur + Status Terverifikasi */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center p-1.5 shadow-xs shrink-0">
                  <RazorEMark className="w-full h-full" color="#ffffff" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-sora font-extrabold text-base text-neutral-900 tracking-tight leading-none lowercase">
                      e cukur
                    </span>
                    <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#285844]/10 text-[#285844] uppercase font-mono">
                      Official
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-neutral-500">
                      Pusat Bantuan & Layanan
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-200/70 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Deskripsi Singkat */}
            <div className="px-5 pt-3.5 pb-1">
              <p className="text-[11.5px] text-neutral-500 leading-relaxed font-medium">
                Hubungi pengelola resmi atau ikuti saluran media sosial E-CUKUR di bawah ini:
              </p>
            </div>

            {/* List 4 Saluran Komunikasi Resmi */}
            <div className="p-3.5 space-y-2">
              {/* 1. WhatsApp Helpdesk */}
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl border border-neutral-200/80 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-between group shadow-2xs bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-sora font-bold text-xs text-neutral-900 group-hover:text-emerald-800 transition-colors">
                      WhatsApp Helpdesk
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                      Chat langsung dengan CS resmi
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </a>

              {/* 2. Email Dukungan */}
              <a
                href={mailUrl}
                className="p-3 rounded-2xl border border-neutral-200/80 hover:border-neutral-900 hover:bg-neutral-50 transition-all flex items-center justify-between group shadow-2xs bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <MailIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-sora font-bold text-xs text-neutral-900 transition-colors">
                      Email Dukungan
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                      {settings?.supportEmail || 'support@ecukur.biz.id'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </a>

              {/* 3. Instagram Resmi */}
              <a
                href={igUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl border border-neutral-200/80 hover:border-pink-500 hover:bg-pink-50/30 transition-all flex items-center justify-between group shadow-2xs bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <InstagramIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-sora font-bold text-xs text-neutral-900 group-hover:text-pink-800 transition-colors">
                      Instagram Resmi
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                      @ecukur.id • Info & Rilis Fitur
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-pink-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </a>

              {/* 4. TikTok Resmi */}
              <a
                href={ttUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl border border-neutral-200/80 hover:border-black hover:bg-neutral-50 transition-all flex items-center justify-between group shadow-2xs bg-white"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <TikTokIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-sora font-bold text-xs text-neutral-900 transition-colors">
                      TikTok Resmi
                    </div>
                    <div className="text-[11px] text-neutral-500 font-medium truncate mt-0.5">
                      @ecukur.id • Panduan & Tips Barber
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </a>
            </div>

            {/* Footer Resmi */}
            <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
              <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider">
                © {CURRENT_YEAR} E-CUKUR • Platform Terverifikasi
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TOMBOL FLOATING HEADPHONE (PRO IDENTITY) ─── */}
      <div className="relative group">
        {/* Tooltip Hover saat tertutup */}
        {!isOpen && (
          <div className="hidden sm:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-neutral-950 text-white text-[11px] font-sora font-bold rounded-xl whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Bantuan & Kontak Resmi</span>
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-neutral-950" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all active:scale-95 border-2 border-white ${
            isOpen 
              ? 'bg-neutral-950 text-white hover:bg-neutral-800' 
              : 'bg-[#171717] hover:bg-neutral-900 text-white hover:shadow-neutral-900/40'
          }`}
          aria-label="Pusat Bantuan & Kontak Resmi E-CUKUR"
          title="Pusat Bantuan & Kontak Resmi E-CUKUR"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform rotate-0" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Headphones className="w-6 h-6 transition-transform group-hover:scale-110 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-neutral-950 rounded-full animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-neutral-950 rounded-full" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
