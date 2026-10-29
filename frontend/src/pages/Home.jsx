import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scissors, 
  User, 
  MapPin, 
  Check, 
  Sparkles, 
  ChevronDown, 
  Menu, 
  X, 
  ArrowRight,
  Calendar,
  BarChart2,
  Store
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../components/Logo';
import { useStore } from '../store';
import { getAppDomain } from '../lib/domain';

const CURRENT_YEAR = new Date().getFullYear();

export default function Home() {
  const appDomain = getAppDomain();
  const navigate = useNavigate();
  const authUser = useStore((state) => state.authUser);
  const isLoggedIn = Boolean(authUser);

  const handleCreatePageAction = () => {
    if (isLoggedIn) {
      navigate('/barber/dashboard');
    } else {
      navigate('/login');
    }
  };

  // Navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerVisibleRef = useRef(true);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen]);

  // Smooth scroll handler for anchor links
  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isHeaderShown = headerVisible || mobileMenuOpen;

  useEffect(() => {
    if (mobileMenuOpen) {
      return undefined;
    }

    const updateHeaderVisibility = (visible) => {
      if (headerVisibleRef.current !== visible) {
        headerVisibleRef.current = visible;
        setHeaderVisible(visible);
      }
    };

    let previousScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = currentScrollY - previousScrollY;

      if (currentScrollY <= 80) {
        updateHeaderVisibility(true);
      } else if (scrollDifference > 8) {
        updateHeaderVisibility(false);
      } else if (scrollDifference < -8) {
        updateHeaderVisibility(true);
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen]);

  // Username Claim / Hero state
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // Live Product Preview Persona Tab
  const [previewPersona, setPreviewPersona] = useState('reza'); // 'reza' | 'studio' | 'asgar'

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Handle Username validation
  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
    setUsernameInput(val);
    setUsernameSuccess(false);

    if (!val) {
      setUsernameError('');
      return;
    }

    if (val.length < 3) {
      setUsernameError('Username minimal 3 karakter');
    } else if (!/^[a-z0-9_-]+$/.test(val)) {
      setUsernameError('Hanya huruf kecil, angka, tanda hubung (-) dan garis bawah (_)');
    } else {
      setUsernameError('');
    }
  };

  const handleClaimSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setUsernameError('Ketik username yang kamu inginkan');
      return;
    }
    if (usernameInput.trim().length < 3) {
      setUsernameError('Username minimal 3 karakter');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(usernameInput.trim())) {
      setUsernameError('Karakter tidak valid');
      return;
    }

    setUsernameSuccess(true);
    // Navigate to register flow with prefilled slug
    setTimeout(() => {
      navigate(`/daftar?slug=${usernameInput.trim()}`);
    }, 400);
  };


  // Persona Preview Data
  const PERSONAS = {
    reza: {
      id: 'reza',
      badge: 'Capster Mandiri',
      name: 'Reza Fade',
      handle: '@reza',
      photo: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=600&auto=format&fit=crop',
      bio: 'Senior Barber spesialis Classic Cut, Fade & Taper. Berpengalaman melayani pelanggan setia dengan hasil potongan presisi.',
      location: 'Grand Commercial Hub Blok R-12',
      schedule: 'Buka 10:00 - 21:00 • Siap Booking',
      services: [
        { name: 'Gentleman Cut & Wash', price: 'Rp 50.000', time: '45m' },
        { name: 'Signature Fade & Lineup', price: 'Rp 75.000', time: '60m' },
        { name: 'Hot Towel Beard Shave', price: 'Rp 45.000', time: '30m' }
      ],
      haircuts: [
        { name: 'Low Taper Fade', img: 'https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=400' },
        { name: 'Textured Crop', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=400' }
      ],
      whatsapp: '6281234567890'
    },
    studio: {
      id: 'studio',
      badge: 'Barbershop Modern',
      name: 'E Cukur Flagship Studio',
      handle: '@ecukur.studio',
      photo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=600&auto=format&fit=crop',
      bio: 'Modern barbershop lounge dengan 4 master capster bersertifikasi. Kopi gratis & pendingin ruangan.',
      location: 'Commercial Center, Central Studio',
      schedule: 'Buka 10:00 - 21:00 • Siap Booking',
      services: [
        { name: 'Executive Grooming Package', price: 'Rp 100.000', time: '60m' },
        { name: 'Korean Two-Block Perm', price: 'Rp 150.000', time: '90m' },
        { name: 'Smokey Ash Hair Coloring', price: 'Rp 180.000', time: '120m' }
      ],
      haircuts: [
        { name: 'Two-Block Perm', img: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=400' },
        { name: 'Side Part Pompadour', img: 'https://images.unsplash.com/photo-1621644158485-649016e3eb3b?q=80&w=400' }
      ],
      whatsapp: '6281234567891'
    },
    asgar: {
      id: 'asgar',
      badge: 'Pangkas Tradisional',
      name: 'Pangkas Rambut Asgar Putra Sunda',
      handle: '@asgar.putrasunda',
      photo: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=600&auto=format&fit=crop',
      bio: 'Keahlian cukur turun-temurun asli Garut. Rapi, teliti, pijat kepala tradisional, dan harga merakyat.',
      location: 'Jl. Boulevard Raya Galaxy No. 8',
      schedule: 'Buka 08:30 - 22:00 • Siap Booking',
      services: [
        { name: 'Pangkas Dewasa + Pijat Leher', price: 'Rp 30.000', time: '30m' },
        { name: 'Pangkas Anak Sekolah', price: 'Rp 25.000', time: '25m' },
        { name: 'Cukur Kumis & Jenggot Halus', price: 'Rp 15.000', time: '15m' }
      ],
      haircuts: [
        { name: 'Rapi TNI / Polri Clean Cut', img: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=400' },
        { name: 'Mandarin Belah Samping', img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400' }
      ],
      whatsapp: '6281234567892'
    }
  };

  const activeData = PERSONAS[previewPersona];

  // FAQ List
  const FAQS = [
    {
      q: 'Apa itu E Cukur?',
      a: `E Cukur adalah platform profil digital dan sistem booking mandiri khusus untuk industri pangkas rambut & barbershop di Indonesia. Melalui satu link (contoh: ${appDomain}/namamu), pelanggan bisa melihat portfolio, tarif layanan, memilih jadwal booking langsung di web, atau menghubungi barber.`
    },
    {
      q: 'Apakah E Cukur gratis untuk digunakan?',
      a: 'Ya, paket dasar E Cukur sepenuhnya gratis selamanya. Kamu bisa membuat profil publik, menampilkan menu layanan dan harga, mengunggah portfolio foto, serta menerima reservasi booking jadwal pelanggan tanpa biaya langganan.'
    },
    {
      q: 'Apakah saya harus memiliki barbershop fisik untuk mendaftar?',
      a: 'Tidak. E Cukur dirancang untuk capster mandiri, barber panggilan (home service), pengusaha pangkas rambut tradisional (ASGAR), maupun barbershop modern dengan banyak capster.'
    },
    {
      q: 'Bisakah capster karyawan barbershop memiliki link profil sendiri?',
      a: 'Tentu bisa. Setiap capster dapat membangun personal branding masing-masing. Pelanggan langganan bisa langsung melihat portofolio karyamu dan melakukan booking jadwal langsung ke link profilmu.'
    },
    {
      q: 'Bagaimana cara pelanggan booking jadwal cukur?',
      a: 'Pelanggan cukup membuka link profilmu, klik "Pilih Jam & Booking", pilih layanan, tanggal, dan jam yang masih tersedia. Pesanan langsung tercatat otomatis di Dashboard Barber secara realtime tanpa wajib chat manual, dengan opsi notifikasi WhatsApp jika dibutuhkan.'
    },
    {
      q: 'Bagaimana cara membagikan link profil ke pelanggan?',
      a: `Cukup salin alamat profilmu (misal: ${appDomain}/reza) dan tempel di bio Instagram, bio TikTok, status WhatsApp, atau cetak kode QR di kartu nama bisnismu.`
    },
    {
      q: 'Apakah saya bisa mengubah informasi dan harga layanan kapan saja?',
      a: 'Ya, seluruh informasi seperti foto profil, daftar harga layanan, dan jam operasional / ketersediaan jadwal dapat diperbarui sewaktu-waktu melalui dashboard akun barber.'
    }
  ];

  return (
    <div
      className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans antialiased selection:bg-[#285844] selection:text-white"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 8% 4%, rgba(40, 88, 68, 0.20), transparent 34%), radial-gradient(ellipse at 92% 24%, rgba(93, 141, 105, 0.17), transparent 32%), radial-gradient(ellipse at 18% 58%, rgba(159, 190, 151, 0.19), transparent 36%), radial-gradient(ellipse at 82% 82%, rgba(40, 88, 68, 0.13), transparent 34%), linear-gradient(135deg, rgba(235, 242, 237, 0.55), transparent 48%, rgba(217, 229, 220, 0.45))',
      }}
    >
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 1. NAVIGATION BAR ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <motion.nav
        initial={false}
        animate={{
          y: isHeaderShown ? '0%' : '-110%',
          opacity: isHeaderShown ? 1 : 0,
        }}
        transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 bg-[#F7F6F2]/95 backdrop-blur-md border-b border-neutral-200/80"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          
          {/* Official Brand Logo */}
          <a href="#" className="flex items-center group py-1">
            <Logo variant="horizontal" size="md" />
          </a>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            <a href="#fitur" onClick={(e) => handleNavClick(e, 'fitur')} className="hover:text-[#171717] transition-colors">Fitur</a>
            <a href="#cara-kerja" onClick={(e) => handleNavClick(e, 'cara-kerja')} className="hover:text-[#171717] transition-colors">Cara Kerja</a>
            <a href="#untuk-barber" onClick={(e) => handleNavClick(e, 'untuk-barber')} className="hover:text-[#171717] transition-colors">Capster & Barber</a>
            <a href="#harga" onClick={(e) => handleNavClick(e, 'harga')} className="hover:text-[#171717] transition-colors">Harga</a>
            <a href="#faq" onClick={(e) => handleNavClick(e, 'faq')} className="hover:text-[#171717] transition-colors">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoggedIn ? (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="text-xs sm:text-sm font-semibold text-neutral-700 hover:text-[#171717] px-2.5 py-1.5 transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button 
                  onClick={handleCreatePageAction}
                  className="hidden sm:inline-flex bg-[#171717] hover:bg-neutral-800 text-white px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-xs active:scale-95 items-center gap-1.5 cursor-pointer"
                >
                  <span>Buat Halaman Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/barber/dashboard')}
                className="bg-[#285844] hover:bg-[#1E4334] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs transition-all shadow-xs active:scale-95 items-center gap-1.5 inline-flex cursor-pointer"
              >
                <span>Dashboard Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile Toggle Button on the Right */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl active:scale-90 transition-transform duration-75 cursor-pointer ${
                mobileMenuOpen 
                  ? 'bg-neutral-200 text-black border border-neutral-300' 
                  : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
              }`}
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu floating overlay (does NOT push content down) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 right-0 md:hidden border-t border-neutral-200/90 bg-[#F7F6F2] px-5 py-5 space-y-4 shadow-2xl max-h-[calc(100vh-4rem)] overflow-y-auto transform-gpu will-change-transform z-50"
            >
              <div className="flex flex-col gap-1 text-sm font-semibold text-neutral-800">
                <a 
                  href="#fitur" 
                  onClick={(e) => handleNavClick(e, 'fitur')} 
                  className="py-2.5 px-3 rounded-lg hover:bg-neutral-200/60 active:scale-98 transition-all flex items-center justify-between"
                >
                  <span>Fitur</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </a>
                <a 
                  href="#cara-kerja" 
                  onClick={(e) => handleNavClick(e, 'cara-kerja')} 
                  className="py-2.5 px-3 rounded-lg hover:bg-neutral-200/60 active:scale-98 transition-all flex items-center justify-between"
                >
                  <span>Cara Kerja</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </a>
                <a 
                  href="#untuk-barber" 
                  onClick={(e) => handleNavClick(e, 'untuk-barber')} 
                  className="py-2.5 px-3 rounded-lg hover:bg-neutral-200/60 active:scale-98 transition-all flex items-center justify-between"
                >
                  <span>Capster & Barber</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </a>
                <a 
                  href="#harga" 
                  onClick={(e) => handleNavClick(e, 'harga')} 
                  className="py-2.5 px-3 rounded-lg hover:bg-neutral-200/60 active:scale-98 transition-all flex items-center justify-between"
                >
                  <span>Harga</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </a>
                <a 
                  href="#faq" 
                  onClick={(e) => handleNavClick(e, 'faq')} 
                  className="py-2.5 px-3 rounded-lg hover:bg-neutral-200/60 active:scale-98 transition-all flex items-center justify-between"
                >
                  <span>FAQ</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </a>
              </div>

              <div className="pt-3 border-t border-neutral-200/80 flex flex-col gap-2">
                {!isLoggedIn ? (
                  <>
                    <button 
                      onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                      className="w-full py-2.5 text-center font-semibold text-sm text-neutral-800 bg-white border border-neutral-300 rounded-xl shadow-2xs hover:bg-neutral-50 active:scale-98 transition-all"
                    >
                      Login ke Akun
                    </button>
                    <button 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleCreatePageAction();
                      }}
                      className="w-full py-2.5 text-center font-semibold text-sm bg-[#171717] hover:bg-black text-white rounded-xl shadow-xs active:scale-98 transition-all"
                    >
                      Buat Halaman Gratis
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/barber/dashboard');
                    }}
                    className="w-full py-2.5 text-center font-semibold text-sm bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl shadow-xs active:scale-98 transition-all"
                  >
                    Buka Dashboard Studio
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Lightweight GPU backdrop overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 z-40 transform-gpu"
          />
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 2. HERO SECTION ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-4 sm:pt-6 lg:pt-2 pb-14 sm:pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column: Copy & Claim Bar */}
          <div className="lg:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">

            <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-display font-extrabold text-[#171717] tracking-tight leading-[1.12] mb-4">
              Barber & Capster Punya Identitas. <br />
              <span className="text-[#285844]">Pelanggan Lebih Mudah</span> Menemukanmu.
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 font-normal leading-relaxed max-w-xl mb-5">
              Satu link untuk menampilkan profil, portfolio haircut, daftar layanan & harga, serta sistem booking jadwal cukur langsung tanpa ribet chat manual.
            </p>

            {/* Interactive Username Claim Input */}
            <div id="claim-box" className="w-full max-w-md mb-4">
              <form 
                onSubmit={handleClaimSubmit}
                className="p-1.5 bg-white rounded-xl border border-neutral-300 shadow-sm focus-within:border-[#171717] focus-within:ring-1 focus-within:ring-[#171717] transition-all flex flex-col sm:flex-row items-center gap-2"
              >
                <div className="flex items-center px-3 py-1.5 w-full text-left">
                  <span className="text-neutral-400 font-mono text-xs font-semibold select-none">
                    {appDomain}/
                  </span>
                  <input 
                    type="text"
                    value={usernameInput}
                    onChange={handleUsernameChange}
                    placeholder="namamu"
                    className="bg-transparent text-[#171717] placeholder-neutral-400 font-mono font-medium text-xs sm:text-sm outline-none w-full ml-0.5"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#171717] hover:bg-neutral-800 text-white font-semibold text-xs rounded-lg shrink-0 transition-all cursor-pointer active:scale-98"
                >
                  {usernameSuccess ? 'Menuju Link...' : 'Klaim Link'}
                </button>
              </form>

              {/* Feedback validation message */}
              {usernameError && (
                <p className="text-xs text-red-600 font-medium mt-2 text-left pl-2">
                  {usernameError}
                </p>
              )}
              {usernameSuccess && (
                <p className="text-xs text-emerald-700 font-medium mt-2 text-left pl-2 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Username valid! Mengalihkan ke halaman pendaftaran...
                </p>
              )}
            </div>

          </div>

          {/* Right Hero Column: Authentic Mobile Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[300px] sm:max-w-[330px] bg-[#171717] rounded-[44px] p-3 shadow-2xl border-4 border-neutral-800 text-white relative">
              
              {/* Phone Camera Notch */}
              <div className="w-24 h-4 bg-neutral-900 rounded-full mx-auto mb-3" />

              {/* Inner Mobile Screen */}
              <div className="bg-[#1C1C1C] rounded-[32px] p-4 text-center border border-neutral-800 space-y-3.5">
                
                {/* Profile Avatar */}
                <div className="relative w-16 h-16 mx-auto">
                  <img 
                    src={activeData.photo} 
                    alt={activeData.name} 
                    decoding="async"
                    className="w-full h-full rounded-full object-cover border-2 border-neutral-700" 
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1C1C1C]" />
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-white flex items-center justify-center gap-1">
                    {activeData.name}
                    <span className="text-[10px] bg-white text-black rounded-full px-1 font-bold">✓</span>
                  </h4>
                  <p className="font-mono text-[10px] text-neutral-400">{activeData.handle}</p>
                  <p className="text-[11px] text-neutral-300 font-light mt-1.5 leading-snug">
                    {activeData.bio}
                  </p>
                </div>

                {/* Status Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{activeData.schedule || 'Buka 10:00 - 21:00'}</span>
                </div>

                {/* Primary Direct Booking Button */}
                <div 
                  className="w-full py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Pilih Jam & Booking Langsung</span>
                </div>

                {/* Services Micro-list */}
                <div className="space-y-1.5 text-left pt-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold block">
                    Layanan & Tarif:
                  </span>
                  {activeData.services.slice(0, 2).map((srv, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[#242424] border border-neutral-800 flex justify-between items-center text-xs">
                      <span className="text-neutral-200 text-[11px] font-medium truncate">{srv.name}</span>
                      <span className="font-mono text-emerald-400 text-[11px] font-semibold">{srv.price}</span>
                    </div>
                  ))}
                </div>

                {/* Micro Portfolio */}
                <div className="text-left pt-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold block mb-1">
                    Hasil Cukur:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activeData.haircuts.map((h, i) => (
                      <img key={i} src={h.img} alt={h.name} loading="lazy" decoding="async" className="w-full h-16 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>

                {/* Footer Micro */}
                <div className="pt-2 border-t border-neutral-800 text-[9px] font-mono text-neutral-500">
                  {appDomain}/{activeData.id} &bull; Profil Resmi
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 3. TRUST / COMMUNITY STRIP ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="untuk-barber" className="scroll-mt-20 py-12 bg-white border-y border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 font-semibold text-center mb-8">
            Dirancang Untuk Berbagai Segmen Industri Pangkas Rambut
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                title: 'Barbershop Modern',
                desc: 'Studio grooming premium dengan banyak kapabilitas dan tim capster profesional.',
                icon: Store
              },
              {
                title: 'Capster Mandiri',
                desc: 'Artis cukur yang ingin membangun nama panggung dan portofolio pribadi.',
                icon: User
              },
              {
                title: 'Pangkas Tradisional (ASGAR)',
                desc: 'Usaha cukur legendaris yang ingin tampil rapi di era media sosial.',
                icon: Scissors
              },
              {
                title: 'Barber Panggilan / Freelance',
                desc: 'Spesialis home service yang butuh link praktis untuk kirim daftar harga.',
                icon: MapPin
              }
            ].map((seg, i) => {
              const Icon = seg.icon;
              return (
                <div key={i} className="transform-gpu flex flex-col items-start p-4 rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
                  <div className="w-9 h-9 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-bold text-sm text-[#171717] mb-1">
                    {seg.title}
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {seg.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 4. PROBLEM & SOLUTION SECTION ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
            Masalah vs Solusi
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-4">
            Mengapa Barber Butuh Satu Link Khusus?
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Menjawab kesulitan komunikasi antara pelanggan dan barber tanpa perlu membuat website rumit yang mahal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Sisi Masalah */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-100 border border-neutral-300/80 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-200 text-neutral-700 text-xs font-semibold mb-4">
                <span>❌ Cara Lama yang Merepotkan</span>
              </div>
              <h3 className="text-xl font-display font-bold text-[#171717] mb-4">
                Informasi Tersebar & Pelanggan Ragu Datang
              </h3>
              <ul className="space-y-3.5 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">•</span>
                  <span>Daftar harga hanya ada di sorotan story IG lama yang sulit dicari.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">•</span>
                  <span>Pelanggan harus bolak-balik chat WhatsApp hanya untuk menanyakan ongkos cukur.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">•</span>
                  <span>Foto hasil potongan tercampur dengan postingan harian di feed media sosial.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold shrink-0">•</span>
                  <span>Alamat lokasi studio tidak memiliki link peta langsung.</span>
                </li>
              </ul>
            </div>
            <p className="text-xs text-neutral-500 mt-6 pt-4 border-t border-neutral-200">
              Menghabiskan waktu barber yang seharusnya fokus melayani pelanggan mencukur.
            </p>
          </div>

          {/* Sisi Solusi */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-[#285844] shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9E5DC] text-[#285844] text-xs font-semibold mb-4">
                <span>✓ Solusi Rapi dengan E Cukur</span>
              </div>
              <h3 className="text-xl font-display font-bold text-[#171717] mb-4">
                Semua Kebutuhan dalam Satu Tautan Siap Bagikan
              </h3>
              <ul className="space-y-3.5 text-sm text-neutral-700">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Satu alamat link rapi: <strong className="text-[#171717]">{appDomain}/namamu</strong> yang mudah diingat.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Menu layanan transparan lengkap dengan estimasi durasi potong.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Galeri foto gaya rambut asli karya barber (bukan foto stok internet).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Sistem booking mandiri di web (pilih tanggal, jam slot, dan layanan instan).</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <span className="text-xs font-semibold text-[#285844]">
                Tingkatkan kepercayaan pelanggan baru sejak pandangan pertama.
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 5. FEATURE SHOWCASE (THE 7 PILLARS) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="fitur" className="scroll-mt-20 py-16 sm:py-24 bg-white border-y border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
              Fitur Lengkap
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-4">
              Dibangun Khusus Untuk Kebutuhan Barber
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Modul-modul praktis yang langsung siap pakai tanpa perlu keahlian teknis atau coding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Fitur A: Profil Barber */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-4">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Profil Barber</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Tampilkan foto profil profesional, nama panggung, biografi singkat, dan tautan akun Instagram atau TikTok.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">{appDomain}/namamu &bull; Siap Pakai</span>
            </div>

            {/* Fitur B: Portfolio Haircut */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Portfolio Haircut</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Galeri foto khusus model potongan rambut (Taper, Mullet, Fade, Perm) agar klien bisa memilih referensi gaya.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">Katalog Foto Resolusi Tinggi</span>
            </div>

            {/* Fitur C: Menu Layanan & Harga */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-4">
                  <Scissors className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Menu Layanan & Harga</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Daftar layanan dengan transparansi harga dan estimasi waktu, menghindari kesalahpahaman ongkos cukur.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">Tarif Jelas & Durasi Potong</span>
            </div>

            {/* Fitur D: Booking Otomatis Langsung di Web */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-4">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Booking Jadwal Langsung di Web</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Pelanggan memilih tanggal, jam slot kosong, dan layanan langsung di browser tanpa perlu chat bolak-balik. Pesanan masuk otomatis ke dashboard barber.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">Kalender Slot Otomatis</span>
            </div>

            {/* Fitur E: Lokasi & Peta */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Lokasi & Google Maps</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Cantumkan alamat studio pangkas rambut dengan link navigasi Google Maps agar pelanggan tidak tersesat.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">Integrasi Peta Sekali Klik</span>
            </div>

            {/* Fitur F & G: Statistik & Kustomisasi (Honest Demo Label) */}
            <div className="transform-gpu rounded-2xl border border-[#285844]/20 bg-gradient-to-br from-white via-[#F7F6F2] to-[#EBF2ED] p-6 flex flex-col justify-between shadow-[0_8px_18px_rgba(23,23,23,0.06)] transition-all duration-300 ease-out hover:border-[#285844]/40 hover:shadow-[0_18px_35px_rgba(40,88,68,0.16)] hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-2deg)_translateY(-5px)]">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-200 text-neutral-700 font-semibold">
                    Fitur Mendatang
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-[#171717] mb-2">Statistik & Kustomisasi</h3>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  Pantau jumlah klik profil dan kustomisasi tema warna halaman sesuai identitas tokomu.
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-400">Rencana Rilis Tahap Berikutnya</span>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 6. LIVE PRODUCT PREVIEW SECTION ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="preview" className="scroll-mt-20 py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
            Simulasi Interaktif
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-3">
            Lihat Bagaimana Tampilan Profilmu
          </h2>
          <p className="text-sm sm:text-base text-neutral-600">
            Pilih segmen barber di bawah untuk melihat contoh nyata halaman publik di layar smartphone pelanggan.
          </p>

          {/* Persona Switcher Tabs */}
          <div className="flex flex-wrap justify-center items-center gap-1.5 p-1 bg-white rounded-2xl sm:rounded-full border border-neutral-200 mt-6 shadow-sm max-w-full">
            {[
              { id: 'reza', label: 'Capster Mandiri' },
              { id: 'studio', label: 'Barbershop Modern' },
              { id: 'asgar', label: 'Pangkas Tradisional' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPreviewPersona(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  previewPersona === tab.id 
                    ? 'bg-[#285844] text-white shadow-sm' 
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Phone Screen Container */}
        <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xl">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
            <span className="text-xs font-mono text-neutral-500">
              Simulasi Tampilan Link Bio
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-semibold">
              Interaktif
            </span>
          </div>

          <div className="text-center flex flex-col items-center">
            <img 
              src={activeData.photo} 
              alt={activeData.name} 
              loading="lazy"
              decoding="async"
              className="w-20 h-20 rounded-full object-cover border-2 border-neutral-200 shadow-sm mb-3" 
            />
            <h3 className="font-display font-bold text-lg text-[#171717]">{activeData.name}</h3>
            <span className="font-mono text-xs text-neutral-500 mb-2">{activeData.handle}</span>
            <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mb-3">{activeData.bio}</p>
            
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D9E5DC] text-[#285844] text-[11px] font-semibold mb-5">
              <span>{activeData.chair}</span>
            </div>

            {/* Action Button */}
            <div 
              className="w-full py-3 bg-[#285844] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 mb-4 shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Pilih Jam & Booking Jadwal</span>
            </div>

            {/* Service list */}
            <div className="w-full text-left space-y-2 mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-bold block">
                Menu Layanan:
              </span>
              {activeData.services.map((srv, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-neutral-800">{srv.name}</div>
                    <div className="text-[10px] text-neutral-500">{srv.time}</div>
                  </div>
                  <span className="font-mono font-bold text-[#285844]">{srv.price}</span>
                </div>
              ))}
            </div>

            {/* Haircuts */}
            <div className="w-full text-left">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-bold block mb-2">
                Portfolio Hasil Potong:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {activeData.haircuts.map((h, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-neutral-200">
                    <img src={h.img} alt={h.name} loading="lazy" decoding="async" className="w-full h-24 object-cover" />
                    <div className="p-1.5 text-center text-[10px] font-medium text-neutral-700 bg-neutral-50">
                      {h.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 7. HOW IT WORKS ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="cara-kerja" className="scroll-mt-20 py-16 sm:py-24 bg-white border-y border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
              Alur Penggunaan
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-4">
              Mulai dalam 3 Langkah Mudah
            </h2>
            <p className="text-sm sm:text-base text-neutral-600">
              Tidak butuh waktu berjam-jam. Profil siap dibagikan dalam hitungan menit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Klaim Username Pilihanmu',
                desc: `Daftar gratis dan tentukan alamat unikmu seperti ${appDomain}/namamu atau ${appDomain}/barbershop.`
              },
              {
                step: '02',
                title: 'Atur Profil & Layanan',
                desc: 'Upload foto terbaik, tentukan tarif layanan, dan atur jam operasional untuk mulai menerima booking jadwal langsung dari pelanggan.'
              },
              {
                step: '03',
                title: 'Bagikan Link ke Media Sosial',
                desc: 'Pasang tautan di bio Instagram, TikTok, WhatsApp bisnis, atau cetak kode QR di meja kasir studio tokomu.'
              }
            ].map((st, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#F7F6F2] border border-neutral-200 flex flex-col justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-display font-black text-[#285844] block mb-4">
                    {st.step}
                  </span>
                  <h3 className="font-display font-bold text-lg text-[#171717] mb-2">
                    {st.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>



      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 9. PRICING (HONEST & TRANSPARENT) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="harga" className="scroll-mt-20 py-16 sm:py-24 bg-white border-y border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
              Pilihan Paket
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-3">
              Mulai Tanpa Biaya Berlangganan
            </h2>
            <p className="text-sm text-neutral-600">
              Gunakan paket gratis selamanya. Tingkatkan ke paket Pro ketika bisnis cukurmu butuh fitur analitik lanjutan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Plan Gratis */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F7F6F2] border-2 border-[#285844] shadow-sm flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9E5DC] text-[#285844] text-xs font-semibold mb-4">
                  <span>Paling Populer</span>
                </div>
                <h3 className="font-display font-bold text-2xl text-[#171717] mb-1">Paket Gratis</h3>
                <p className="text-xs text-neutral-600 mb-6">Cocok untuk capster individu & pangkas rambut yang baru mulai.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-display font-extrabold text-[#171717]">Rp 0</span>
                  <span className="text-xs font-mono text-neutral-500">/ selamanya</span>
                </div>

                <ul className="space-y-3 text-sm text-neutral-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Halaman profil publik <strong className="text-neutral-900">{appDomain}/namamu</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Menu layanan & transparansi harga</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Portfolio foto hingga 6 hasil cukuran</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sistem booking jadwal otomatis langsung di web</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pilihan kontak chat WhatsApp & tautan medsos</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById('claim-box');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
              >
                Mulai Gratis Sekarang
              </button>
            </div>

            {/* Plan Pro (Proposed Concept / Beta) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-300 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold mb-4">
                  <span>Tahap Beta / Rencana</span>
                </div>
                <h3 className="font-display font-bold text-2xl text-[#171717] mb-1">Paket Pro</h3>
                <p className="text-xs text-neutral-600 mb-6">Untuk barbershop komersial yang membutuhkan analitik dan branding penuh.</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-display font-extrabold text-[#171717]">Rp 49.000</span>
                  <span className="text-xs font-mono text-neutral-500">/ bulan (estimasi)</span>
                </div>

                <ul className="space-y-3 text-sm text-neutral-600 mb-8">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#285844] shrink-0" />
                    <span>Semua fitur dalam Paket Gratis</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#285844] shrink-0" />
                    <span>Dukungan custom domain pribadi</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#285844] shrink-0" />
                    <span>Portfolio foto haircut tanpa batas</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#285844] shrink-0" />
                    <span>Statistik tayangan profil & klik tautan</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#285844] shrink-0" />
                    <span>Tanpa watermark branding E Cukur</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => alert('Paket Pro sedang dalam tahap persiapan. Kamu tetap bisa menggunakan semua fitur Paket Gratis saat ini!')}
                className="w-full py-3.5 border border-neutral-300 hover:border-neutral-500 text-neutral-800 font-semibold text-sm rounded-xl transition-colors"
              >
                Gabung Waitlist Pro
              </button>
            </div>

          </div>

          <p className="text-center text-xs text-neutral-500 mt-6">
            *Tidak ada komitmen kartu kredit atau biaya tersembunyi.
          </p>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 10. FAQ SECTION ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="scroll-mt-20 py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-[#285844] font-semibold">
            Pertanyaan Umum
          </span>
          <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#171717] tracking-tight mt-2 mb-3">
            Sering Ditanyakan
          </h2>
          <p className="text-sm text-neutral-600">
            Hal-hal mendasar seputar pendaftaran, pengelolaan profil, dan cara pemakaian E Cukur.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index} 
                className="rounded-2xl border border-neutral-200 bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                  className="w-full p-4 sm:p-5 text-left flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="font-display font-bold text-sm sm:text-base text-[#171717]">
                    {item.q}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 sm:px-5 pb-5 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3"
                    >
                      {item.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 11. FINAL CALL TO ACTION ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-[#285844] text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-xl">
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-[#D9E5DC] font-semibold">
              Mulai Hari Ini
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight mt-2 mb-4 leading-tight">
              Mulai Bangun Identitas Barbershop Kamu.
            </h2>
            <p className="text-sm sm:text-base text-neutral-200 font-light leading-relaxed mb-8">
              Satukan portfolio, layanan, dan kontak dalam satu link yang siap dibagikan ke seluruh pelangganmu.
            </p>

            <form 
              onSubmit={handleClaimSubmit}
              className="p-1.5 sm:p-2 bg-white rounded-2xl shadow-lg max-w-md mx-auto flex flex-col sm:flex-row items-center gap-2"
            >
              <div className="flex items-center px-3 py-2 w-full text-left">
                <span className="text-neutral-400 font-mono text-sm font-semibold select-none">
                  {appDomain}/
                </span>
                <input 
                  type="text"
                  value={usernameInput}
                  onChange={handleUsernameChange}
                  placeholder="namamu"
                  className="bg-transparent text-[#171717] placeholder-neutral-400 font-medium text-sm sm:text-base outline-none w-full ml-0.5"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-[#171717] hover:bg-black text-white font-semibold text-sm rounded-xl shrink-0 transition-transform active:scale-95"
              >
                Buat Halaman Gratis
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ 12. FOOTER ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="py-12 px-4 sm:px-6 bg-[#171717] text-white text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-neutral-800">
          
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center">
              <Logo variant="horizontal" theme="light" size="md" />
            </div>
            <p className="text-neutral-400 max-w-sm leading-relaxed text-xs">
              Platform link-in-bio dan identitas digital untuk barber, capster, pangkas rambut tradisional, dan barbershop di Indonesia.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <h4 className="font-mono uppercase font-bold text-[11px] text-neutral-400 tracking-wider">Navigasi</h4>
            <ul className="space-y-1.5 text-neutral-300">
              <li><a href="#fitur" className="hover:text-white transition-colors">Fitur Produk</a></li>
              <li><a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a></li>
              <li><a href="#harga" className="hover:text-white transition-colors">Paket & Harga</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Pertanyaan Umum (FAQ)</a></li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <h4 className="font-mono uppercase font-bold text-[11px] text-neutral-400 tracking-wider">Akses Akun</h4>
            <ul className="space-y-1.5 text-neutral-300">
              <li><a href="/login" className="hover:text-white transition-colors">Masuk ke Akun Barber</a></li>
              <li><a href="/customer/barbers" className="hover:text-white transition-colors">Cari Barber Sekitar</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-500 font-mono text-[11px]">
          <div>
            &copy; {CURRENT_YEAR} E Cukur. Semua hak dilindungi.
          </div>

          <div>
            <span>Dibuat untuk Barber & Capster Indonesia</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
