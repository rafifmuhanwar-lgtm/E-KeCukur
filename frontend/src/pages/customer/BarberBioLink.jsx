import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  Clock, 
  Sparkles, 
  Share2, 
  Check, 
  Coffee, 
  MapPin, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  MessageCircle, 
  ExternalLink,
  Users,
  Star,
  Globe,
  Heart,
  Bookmark,
  Grid,
  List,
  MessageSquare,
  Send,
  Camera
} from 'lucide-react';
import { useStore } from '../../store';
import { getAppDomain } from '../../lib/domain';
import Logo from '../../components/Logo';
import { createQrisPayment, checkQrisPaymentStatus, simulateQrisPayment } from '../../lib/qrisPayment';

const TIME_SLOTS = [
  '09:30', '10:00', '10:45', '11:30', 
  '13:00', '13:45', '14:30', '15:15', 
  '16:00', '17:00', '18:30', '19:15', '20:00'
];

const generateNextDates = () => {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const list = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < 5; i++) {
    const d = new Date(baseTime + i * 24 * 60 * 60 * 1000);
    const dayName = i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : days[d.getDay()];
    const label = `${dayName}, ${d.getDate()} ${months[d.getMonth()]}`;
    const iso = d.toISOString().split('T')[0];
    list.push({ id: iso, label, isToday: i === 0 });
  }
  return list;
};

const UPCOMING_DATES = generateNextDates();

const generateBookingCode = () => `ECK-${Math.floor(100 + Math.random() * 900)}`;

export default function BarberBioLink({ customBarber = null, isPreview = false }) {
  const appDomain = getAppDomain();
  const navigate = useNavigate();
  const { id } = useParams();

  const barbers = useStore((state) => state.barbers);
  const activeBarber = useStore((state) => state.activeBarber);
  const authUser = useStore((state) => state.authUser);
  const addBooking = useStore((state) => state.addBooking);
  const toggleLookbookLike = useStore((state) => state.toggleLookbookLike);
  const isLoading = useStore((state) => state.isLoading);

  // Find barber matching slug or id or name from Supabase / Active Session / Local Cache
  const targetSlug = (id || '').toLowerCase().replace('@', '');
  
  const DEFAULT_FALLBACK_BARBER = {
    id: targetSlug || 'barber',
    slug: targetSlug || 'barber',
    name: targetSlug ? targetSlug.charAt(0).toUpperCase() + targetSlug.slice(1) : 'Barber Studio',
    handle: `@${targetSlug || 'barber'}`,
    photo: '',
    bannerImage: '',
    bio: '',
    specialty: '',
    phone: '',
    whatsapp: '',
    whatsappMessage: 'Halo, saya mau booking jadwal cukur lewat link bio kamu',
    status: 'AVAILABLE',
    schedule: '',
    workingHours: '',
    openDays: '',
    theme: 'forest',
    buttonStyle: 'rounded',
    address: '',
    mapsUrl: '',
    services: [],
    lookbook: [],
    customLinks: [],
    features: {
      booking: true,
      services: true,
      lookbook: true,
      team: false,
      location: true,
      tipping: true,
    },
    teamMembers: []
  };

  // 1. Cek customBarber (misal dari dashboard live preview)
  // 2. Cek activeBarber (akun yang sedang aktif di browser ini)
  // 3. Cek daftar barbers dari Supabase
  let matchedBarber = customBarber;
  if (!matchedBarber && activeBarber && (
    (activeBarber.slug && activeBarber.slug.toLowerCase() === targetSlug) ||
    (activeBarber.id && activeBarber.id.toLowerCase() === targetSlug) ||
    (activeBarber.name && activeBarber.name.toLowerCase() === targetSlug)
  )) {
    matchedBarber = activeBarber;
  }
  if (!matchedBarber) {
    matchedBarber = barbers.find(
      (b) => (b.slug && b.slug.toLowerCase() === targetSlug) || 
             (b.id && b.id.toLowerCase() === targetSlug) || 
             (b.name && b.name.toLowerCase() === targetSlug)
    );
  }

  // 4. Cek fallback local cache jika database belum memuat banner_image
  let cachedData = null;
  if (typeof localStorage !== 'undefined' && targetSlug) {
    try {
      const cStr = localStorage.getItem(`ecukur_barber_cache_${targetSlug}`) || 
                   (matchedBarber?.id ? localStorage.getItem(`ecukur_barber_cache_${matchedBarber.id}`) : null);
      if (cStr) cachedData = JSON.parse(cStr);

      const directBanner = localStorage.getItem(`ecukur_banner_${targetSlug}`) ||
                           (matchedBarber?.id ? localStorage.getItem(`ecukur_banner_${matchedBarber.id}`) : null);
      if (directBanner) {
        if (!cachedData) cachedData = {};
        cachedData.bannerImage = directBanner;
      }
    } catch {}
  }

  let mergedBarber = matchedBarber ? { ...matchedBarber } : null;
  if (mergedBarber && cachedData) {
    if (!mergedBarber.bannerImage && cachedData.bannerImage) mergedBarber.bannerImage = cachedData.bannerImage;
    if (!mergedBarber.locationCity && cachedData.locationCity) mergedBarber.locationCity = cachedData.locationCity;
  } else if (!mergedBarber && cachedData) {
    mergedBarber = cachedData;
  }

  const barber = mergedBarber || (isPreview ? customBarber || DEFAULT_FALLBACK_BARBER : null);

  // Modular Features
  const features = barber?.features || {
    booking: true,
    services: true,
    lookbook: true,
    team: false,
    location: true,
    tipping: true,
  };

  // Effective services list (100% dari data barber, kosong jika belum diatur)
  const activeServices = (barber && Array.isArray(barber.services) && barber.services.length > 0)
    ? barber.services.filter(s => s.active !== false)
    : [];

  // UI States
  const [activeTab, setActiveTab] = useState('services'); // 'services' | 'team' | 'lookbook' | 'tipping' | 'info'
  const [copiedToast, setCopiedToast] = useState(false);

  // Lookbook Feed Interactive States (Likes, Saves, Comments)
  const [lookbookViewMode, setLookbookViewMode] = useState('grid'); // 'grid' (3x3) | 'feed' (scroll)
  const [selectedLookPost, setSelectedLookPost] = useState(null);
  const [commentModalPost, setCommentModalPost] = useState(null);

  const [likedPosts, setLikedPosts] = useState(() => {
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        const stored = localStorage.getItem(`ecukur_likes_${targetSlug}`);
        return stored ? JSON.parse(stored) : {};
      }
    } catch {}
    return {};
  });

  const [savedPosts, setSavedPosts] = useState(() => {
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        const stored = localStorage.getItem(`ecukur_saves_${targetSlug}`);
        return stored ? JSON.parse(stored) : {};
      }
    } catch {}
    return {};
  });

  const [animatingHeartPostId, setAnimatingHeartPostId] = useState(null);

  // Synchronize Likes to LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        localStorage.setItem(`ecukur_likes_${targetSlug}`, JSON.stringify(likedPosts));
      }
    } catch {}
  }, [likedPosts, targetSlug]);

  // Synchronize Saves to LocalStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        localStorage.setItem(`ecukur_saves_${targetSlug}`, JSON.stringify(savedPosts));
      }
    } catch {}
  }, [savedPosts, targetSlug]);

  const toggleLikePost = (postId, e) => {
    if (e) e.stopPropagation();
    const nextLiked = !likedPosts[postId];
    setLikedPosts(prev => ({
      ...prev,
      [postId]: nextLiked
    }));

    if (barber?.id && toggleLookbookLike) {
      toggleLookbookLike(barber.id, postId, nextLiked);
    }
  };

  const handleDoubleTapLike = (postId) => {
    if (!likedPosts[postId]) {
      setLikedPosts(prev => ({ ...prev, [postId]: true }));
      if (barber?.id && toggleLookbookLike) {
        toggleLookbookLike(barber.id, postId, true);
      }
    }
    setAnimatingHeartPostId(postId);
    setTimeout(() => setAnimatingHeartPostId(null), 800);
  };

  const toggleSavePost = (postId, e) => {
    if (e) e.stopPropagation();
    setSavedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Interactive Comments System
  const [postComments, setPostComments] = useState(() => {
    const defaultComments = {
      'sample-1': [
        { id: 'c1', name: 'Rian Pratama', time: '2 jam lalu', text: 'Kalo rambut ikal mengembang cocok ga mas pake gaya ini?' },
        { id: 'c2', name: 'Barber Official', time: '1 jam lalu', isBarber: true, text: 'Cocok banget mas Rian! Nanti bagian atasnya kita rapihkan dengan layering biar teksturnya keluar natural.' }
      ],
      'sample-2': [
        { id: 'c3', name: 'Dimas', time: 'Kemarin', text: 'Gradasi fade-nya rapih parah mas 🔥' }
      ],
      'sample-3': [
        { id: 'c4', name: 'Kevin', time: '3 hari lalu', text: 'Style ini butuh pomade atau hair powder mas?' },
        { id: 'c5', name: 'Barber Official', time: '2 hari lalu', isBarber: true, text: 'Cukup pake hair powder atau matte clay tipis aja mas biar look-nya natural.' }
      ],
      'sample-4': [
        { id: 'c6', name: 'Aditya', time: '4 hari lalu', text: 'Cocok buat acara formal atau wisudaan nih mantap' }
      ],
      'sample-5': [
        { id: 'c7', name: 'Farhan', time: 'Seminggu lalu', text: 'Mullet modern-nya clean banget mas bro!' }
      ],
      'sample-6': [
        { id: 'c8', name: 'Bima', time: '2 minggu lalu', text: 'French crop paling rapih yang pernah saya liat 👍' }
      ]
    };
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        const stored = localStorage.getItem(`ecukur_comments_${targetSlug}`);
        if (stored) return { ...defaultComments, ...JSON.parse(stored) };
      }
    } catch {}
    return defaultComments;
  });

  const [commentInputName, setCommentInputName] = useState('');
  const [commentInputText, setCommentInputText] = useState('');

  const handleAddComment = (postId, e) => {
    if (e) e.preventDefault();
    if (!commentInputText.trim()) return;
    const authorName = commentInputName.trim() || 'Pengunjung';
    const newEntry = {
      id: `c_${Date.now()}`,
      name: authorName,
      time: 'Baru saja',
      text: commentInputText.trim()
    };
    const updated = {
      ...postComments,
      [postId]: [...(postComments[postId] || []), newEntry]
    };
    setPostComments(updated);
    setCommentInputText('');
    try {
      if (typeof window !== 'undefined' && targetSlug) {
        localStorage.setItem(`ecukur_comments_${targetSlug}`, JSON.stringify(updated));
      }
    } catch {}
  };

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(UPCOMING_DATES[0].label);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const paymentMethod = 'Tunai';
  const [noteStyle, setNoteStyle] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tipping Modal State
  const addBarberTip = useStore((state) => state.addBarberTip);
  const [isTippingOpen, setIsTippingOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(25000);
  const [selectedCoffeeLabel, setSelectedCoffeeLabel] = useState('Kopi Susu');
  const [tipperName, setTipperName] = useState('');
  const [tipperMessage, setTipperMessage] = useState('');
  const [tipPaid, setTipPaid] = useState(false);
  const [tipQrisData, setTipQrisData] = useState(null);
  const [tipQrisLoading, setTipQrisLoading] = useState(false);
  const [copiedTipAmount, setCopiedTipAmount] = useState(false);
  const [simulatingTip, setSimulatingTip] = useState(false);

  // Auto-generate QRIS tagihan dengan kode unik saat modal tip dibuka
  useEffect(() => {
    if (!isTippingOpen || tipPaid) return;
    let isCancelled = false;
    let pollInterval = null;

    setTipQrisLoading(true);
    createQrisPayment({
      type: 'TIP',
      amount: tipAmount,
      barberId: barber.id,
      customerName: tipperName || 'Pelanggan',
      qrisImageUrl: barber.tippingConfig?.qrisImage || null
    }).then((res) => {
      if (isCancelled) return;
      setTipQrisLoading(false);
      if (res?.success && res.payment) {
        setTipQrisData(res.payment);

        // Polling status tiap 2.5 detik untuk mendeteksi notifikasi MacroDroid
        pollInterval = setInterval(async () => {
          const statusRes = await checkQrisPaymentStatus(res.payment.referenceId);
          if (statusRes?.status === 'PAID') {
            clearInterval(pollInterval);
            if (typeof addBarberTip === 'function') {
              addBarberTip(barber.id, {
                customerName: tipperName || 'Pelanggan',
                amount: res.payment.totalAmount || tipAmount,
                coffeeLabel: selectedCoffeeLabel || 'Kopi',
                message: tipperMessage || 'Terima kasih atas pelayanannya!',
                method: 'QRIS Listener'
              });
            }
            setTipPaid(true);
          }
        }, 2500);
      }
    });

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isTippingOpen, tipAmount, tipPaid]);

  // Share link copy
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2400);
    }
  };

  const handleOpenBooking = (service = null, prefilledNote = '') => {
    setSelectedService(service || activeServices[0]);
    if (prefilledNote) setNoteStyle(prefilledNote);
    setBookingSuccessData(null);
    setIsBookingOpen(true);
  };

  const hasConsultationAccount = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barber?.user_id || '');

  const handleConsultation = () => {
    const barberUserId = barber?.user_id;
    if (!hasConsultationAccount || authUser?.id === barberUserId) return;
    navigate(`/messages?barberId=${encodeURIComponent(barberUserId)}`);
  };
  const isOwnProfile = Boolean(authUser?.id && authUser.id === barber?.user_id);

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) return;

    setIsSubmitting(true);
    const bookingCode = generateBookingCode();

    const newBooking = {
      id: bookingCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      barberId: barber.id,
      barberName: barber.name,
      serviceName: selectedService ? selectedService.name : activeServices[0].name,
      date: selectedDate,
      time: selectedTime,
      status: 'Menunggu',
      paymentMethod,
      price: selectedService ? selectedService.price : 50000,
      note: noteStyle.trim()
    };

    const saved = await addBooking(newBooking);
    setIsSubmitting(false);
    setBookingSuccessData(saved || newBooking);
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  if (!barber) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 text-center max-w-sm w-full shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-[#0F1110] text-[#F5F4EF] flex items-center justify-center mx-auto mb-4 p-3 shadow-sm">
            <Logo variant="mark" size="md" />
          </div>
          <h2 className="font-display font-extrabold text-lg text-[#171717]">
            {isLoading ? 'Memuat Profil...' : 'Profil Belum Terdaftar'}
          </h2>
          <p className="text-xs text-neutral-500 mt-1.5 mb-6 leading-relaxed">
            {isLoading 
              ? 'Menghubungkan ke database...' 
              : `Alamat "${appDomain}/${id}" belum dimiliki oleh siapa pun. Kamu bisa langsung mendaftar dan mengklaim link ini sekarang!`}
          </p>
          <Link
            to={`/daftar?slug=${id || ''}`}
            className="w-full py-3 bg-[#0F1110] hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <span>Klaim & Buat Link Ini Sekarang</span>
          </Link>
        </div>
      </div>
    );
  }

  const isAvailable = barber.status === 'AVAILABLE';

  // Theme Styling Helper
  const getThemeStyles = (themeKey) => {
    switch (themeKey) {
      case 'charcoal':
        return {
          pageBg: 'bg-[#171717]',
          textPrimary: 'text-white',
          textSecondary: 'text-neutral-400',
          cardBg: 'bg-[#222222]',
          cardBorder: 'border-neutral-800',
          accentBg: 'bg-[#10B981] hover:bg-[#059669]',
          accentText: 'text-white',
          badgeBg: 'bg-neutral-800',
          badgeText: 'text-emerald-400',
          tabActiveBg: 'bg-[#10B981] text-white',
          tabInactiveText: 'text-neutral-400'
        };
      case 'asgar':
        return {
          pageBg: 'bg-[#FAF6EE]',
          textPrimary: 'text-[#2C221E]',
          textSecondary: 'text-neutral-600',
          cardBg: 'bg-white',
          cardBorder: 'border-[#EADCC9]',
          accentBg: 'bg-[#B85D3B] hover:bg-[#9E4D30]',
          accentText: 'text-white',
          badgeBg: 'bg-[#F3E6D5]',
          badgeText: 'text-[#8E4327]',
          tabActiveBg: 'bg-[#B85D3B] text-white',
          tabInactiveText: 'text-neutral-600'
        };
      case 'monochrome':
        return {
          pageBg: 'bg-white',
          textPrimary: 'text-black',
          textSecondary: 'text-neutral-500',
          cardBg: 'bg-neutral-50',
          cardBorder: 'border-neutral-200',
          accentBg: 'bg-black hover:bg-neutral-800',
          accentText: 'text-white',
          badgeBg: 'bg-neutral-200',
          badgeText: 'text-black',
          tabActiveBg: 'bg-black text-white',
          tabInactiveText: 'text-neutral-500'
        };
      case 'forest':
      default:
        return {
          pageBg: 'bg-[#F7F6F2]',
          textPrimary: 'text-[#171717]',
          textSecondary: 'text-neutral-600',
          cardBg: 'bg-white',
          cardBorder: 'border-neutral-200',
          accentBg: 'bg-[#285844] hover:bg-[#1E4334]',
          accentText: 'text-white',
          badgeBg: 'bg-[#D9E5DC]',
          badgeText: 'text-[#285844]',
          tabActiveBg: 'bg-[#285844] text-white',
          tabInactiveText: 'text-neutral-600'
        };
    }
  };

  const theme = getThemeStyles(barber.theme || 'forest');

  const getBtnRadiusClass = (style) => {
    if (style === 'pill') return 'rounded-full';
    if (style === 'square') return 'rounded-md';
    return 'rounded-2xl';
  };

  return (
    <div className={`w-full ${isPreview ? 'min-h-0' : 'min-h-screen'} ${theme.pageBg} ${theme.textPrimary} font-sans selection:bg-[#285844] selection:text-white relative`}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white px-5 py-2.5 text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 border border-neutral-700"
          >
            <Check className="w-4 h-4 text-emerald-400" /> 
            <span>Link Bio Berhasil Disalin!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Shell */}
      <div className={`relative z-10 max-w-md mx-auto ${isPreview ? 'min-h-0' : 'min-h-screen sm:py-6'} flex flex-col justify-between`}>
        <div className={`w-full ${theme.cardBg} ${isPreview ? 'rounded-[32px]' : 'min-h-screen sm:min-h-0 sm:rounded-[36px] sm:shadow-xl sm:border ' + theme.cardBorder} overflow-hidden flex flex-col flex-1`}>
          
          {/* ─── 1. HEADER (BANNER IF PRESENT, OR CLEAN CARD HEADER IF NO BANNER) ─── */}
          {barber.bannerImage ? (
            <div className={`relative w-full ${isPreview ? 'h-36' : 'h-48 sm:h-56'} overflow-hidden bg-neutral-900 select-none shrink-0 group`}>
              <img 
                src={barber.bannerImage} 
                alt="Header Banner"
                className="w-full h-full object-cover"
              />
              {/* Subtle dark gradient overlay for top bar readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35" />

              {/* Top Bar: Brand Logo (Left) & Share Pill Button (Right) */}
              <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex items-center justify-between z-10">
                {isPreview ? (
                  <div className="flex items-center gap-1.5 opacity-95">
                    <Logo variant="compact" size="sm" className="text-white drop-shadow-md" />
                  </div>
                ) : (
                  <Link 
                    to="/" 
                    className="flex items-center gap-1.5 opacity-95 hover:opacity-100 transition-opacity"
                    title="Ditenagai oleh E Cukur"
                  >
                    <Logo variant="compact" size="sm" className="text-white drop-shadow-md" />
                  </Link>
                )}

                <button 
                  type="button"
                  onClick={handleShare}
                  className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
                  title="Bagikan Tautan Profil"
                >
                  <Share2 className="w-3.5 h-3.5 text-white" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          ) : (
            /* Clean Header when NO banner is used (no dark empty box, 100% clean for customers) */
            <div className="w-full flex flex-col select-none shrink-0">
              <div className="w-full pt-4 px-4 sm:pt-5 sm:px-5 flex items-center justify-between z-10">
                {isPreview ? (
                  <div className="flex items-center gap-1.5">
                    <Logo variant="compact" size="sm" className={barber.theme === 'charcoal' ? 'text-white' : 'text-[#171717]'} />
                  </div>
                ) : (
                  <Link 
                    to="/" 
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    title="Ditenagai oleh E Cukur"
                  >
                    <Logo variant="compact" size="sm" className={barber.theme === 'charcoal' ? 'text-white' : 'text-[#171717]'} />
                  </Link>
                )}

                <button 
                  type="button"
                  onClick={handleShare}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full ${
                    barber.theme === 'charcoal' 
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700' 
                      : 'bg-neutral-100 hover:bg-neutral-200 text-[#171717] border-neutral-200'
                  } border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer`}
                  title="Bagikan Tautan Profil"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── 2. PROFILE HEADER (AVATAR & INFO) ─── */}
          <div className={`relative flex flex-col items-center px-4 ${barber.bannerImage ? '-mt-12 sm:-mt-14' : 'mt-2 sm:mt-3'} z-20 text-center`}>
            
            {/* Avatar Circle */}
            <div className="relative">
              <div className={`${isPreview ? 'w-20 h-20' : 'w-24 h-24 sm:w-28 sm:h-28'} rounded-full overflow-hidden ${
                barber.bannerImage ? 'border-4 border-white shadow-lg' : 'border-4 border-white shadow-md ring-1 ring-neutral-200/70'
              } bg-neutral-100 flex items-center justify-center`}>
                {barber.photo ? (
                  <img 
                    src={barber.photo} 
                    alt={barber.name} 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`font-display font-black ${isPreview ? 'text-xl' : 'text-3xl'} text-neutral-400`}>
                    {(barber.name || 'B').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Online Green Status Dot (Bottom-Right) */}
              <div 
                className={`absolute bottom-0.5 right-0.5 ${isPreview ? 'w-4 h-4' : 'w-5 h-5'} rounded-full border-2 border-white bg-[#00BA88] flex items-center justify-center shadow-xs`}
                title={isAvailable ? 'Siap Menerima Booking' : 'Sedang Istirahat'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Name with Verified Badge */}
            <h1 className={`font-display font-black ${isPreview ? 'text-base' : 'text-xl sm:text-2xl'} tracking-tight flex items-center justify-center gap-1.5 mt-2.5`}>
              <span>{barber.name}</span>
              <CheckCircle2 className={`${isPreview ? 'w-4 h-4' : 'w-5 h-5'} text-[#285844] fill-[#285844] stroke-white inline-block shrink-0`} />
            </h1>

            {/* Handle (@username) */}
            <p className={`font-mono ${isPreview ? 'text-[10px]' : 'text-xs'} mt-0.5 text-neutral-500 font-medium`}>
              {barber.handle ? barber.handle.replace(/\.ecukur$/, '') : `@${barber.slug || barber.id}`}
            </p>

            {/* Bio Description */}
            {barber.bio && (
              <p className={`${isPreview ? 'text-[10.5px] mt-1.5 max-w-[270px]' : 'text-xs mt-2 max-w-sm'} text-center leading-relaxed text-neutral-600`}>
                {barber.bio}
              </p>
            )}

            {/* ─── 3. HORIZONTAL PILL ROW FOR LINKS & TAGS (AS SHOWN IN REFERENCE IMAGE) ─── */}
            <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${isPreview ? 'mt-2.5 mb-3' : 'mt-3.5 mb-5'} w-full px-2`}>
              
              {/* Location Pill */}
              {(barber.locationCity || barber.address) && (
                <span className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 border border-neutral-200/70 shadow-2xs transition-colors">
                  <MapPin className="w-3.5 h-3.5 text-[#285844]" />
                  <span>{barber.locationCity || barber.address.split(',')[0].trim()}</span>
                </span>
              )}

              {/* Role / Segment Pill */}
              <span className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1.5 bg-neutral-100 text-neutral-700 border border-neutral-200/70 shadow-2xs">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{barber.profileType === 'barbershop' ? 'Barbershop' : 'Capster'}</span>
              </span>

              {/* Instagram Pill */}
              {barber.instagram && (
                <a 
                  href={barber.instagram.startsWith('http') ? barber.instagram : `https://instagram.com/${barber.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/70 shadow-2xs transition-all hover:scale-[1.02]"
                >
                  <Globe className="w-3.5 h-3.5 text-[#285844]" />
                  <span>Instagram</span>
                </a>
              )}

              {/* TikTok Pill */}
              {barber.tiktok && (
                <a 
                  href={barber.tiktok.startsWith('http') ? barber.tiktok : `https://tiktok.com/@${barber.tiktok.replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/70 shadow-2xs transition-all hover:scale-[1.02]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
                  <span>TikTok</span>
                </a>
              )}

              {/* Custom External Links as Pills */}
              {(barber.customLinks || []).filter(l => l.active).map((lnk) => (
                <a
                  key={lnk.id}
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/70 shadow-2xs transition-all hover:scale-[1.02]"
                >
                  <Globe className="w-3.5 h-3.5 text-[#285844]" />
                  <span>{lnk.title}</span>
                </a>
              ))}
            </div>
            {!isPreview && (
              <div className="px-4 w-full max-w-sm mt-1 mb-4">
                <button
                  type="button"
                  onClick={handleConsultation}
                  disabled={!hasConsultationAccount || isOwnProfile}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#285844] hover:bg-[#1E4334] text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:bg-neutral-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
                  title={
                    !hasConsultationAccount
                      ? 'Konsultasi belum tersedia untuk profil ini.'
                      : isOwnProfile
                        ? 'Anda sedang melihat profil publik milik sendiri.'
                        : 'Konsultasi langsung dengan pemilik profil'
                  }
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isOwnProfile ? 'Profil Anda' : 'Konsultasi'}</span>
                </button>
                {!hasConsultationAccount && (
                  <p role="status" className="text-[11px] text-amber-700 mt-2">
                    Akun pemilik profil belum terhubung, jadi konsultasi belum dapat dimulai.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── 4. NAVIGATION TABS BAR (STYLE SEPERTI CONTOH GAMBAR) ─── */}
          <div className="px-3 sm:px-4 mb-3">
            {(() => {
              const navTabs = [
                { id: 'services', label: 'Layanan', icon: Scissors, show: features.services !== false },
                { id: 'lookbook', label: 'Feed', icon: Sparkles, show: features.lookbook !== false },
                { id: 'tipping', label: 'Tip Kopi', icon: Coffee, show: features.tipping !== false },
                { id: 'info', label: 'Lokasi', icon: MapPin, show: features.location !== false },
                { id: 'team', label: 'Capster', icon: Users, show: features.team === true },
              ].filter(t => t.show);

              if (navTabs.length <= 1) return null;

              return (
                <div 
                  className={`flex items-center justify-between p-1 rounded-2xl border bg-white shadow-xs ${theme.cardBorder}`}
                >
                  {navTabs.map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <React.Fragment key={tab.id}>
                        {idx > 0 && (
                          <div className="h-6 w-px bg-neutral-200/70 shrink-0 mx-0.5" />
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl font-bold active:scale-95 transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                            isActive 
                              ? 'bg-[#285844] text-white shadow-xs' 
                              : 'text-neutral-500 hover:text-neutral-800'
                          } ${isPreview ? 'text-[10px]' : 'text-xs'}`}
                        >
                          <Icon className={`${isPreview ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                          <span>{tab.label}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Main Tab Content Wrapper with padding */}
          <div className="px-3 sm:px-4 flex-1 flex flex-col">

        {/* ─── TAB CONTENT ─── */}
        <div className={`space-y-3 ${isPreview ? 'mb-4' : 'mb-8'} flex-1`}>

          {/* TAB 1: SERVICES & PRICING */}
          {activeTab === 'services' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="space-y-2 transform-gpu will-change-transform">
              
              <div className="flex items-center justify-between px-1 mb-1">
                <span className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} font-mono font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                  Pilih Layanan untuk Booking
                </span>
                <span className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} text-neutral-400 font-mono`}>
                  {activeServices.length} Menu
                </span>
              </div>

              {activeServices.length === 0 ? (
                <div className={`${isPreview ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'} text-center border border-dashed ${theme.cardBorder} text-neutral-400`}>
                  <Scissors className={`${isPreview ? 'w-5 h-5 mb-1.5' : 'w-8 h-8 mb-2'} mx-auto opacity-40`} />
                  <p className={`${isPreview ? 'text-[11px]' : 'text-xs'} font-semibold`}>Belum ada layanan yang ditambahkan</p>
                  <p className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} opacity-75 mt-0.5`}>Barber ini belum mengatur menu layanan potong rambut.</p>
                </div>
              ) : (
                activeServices.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleOpenBooking(item)}
                  className={`w-full text-left ${isPreview ? 'p-2.5 rounded-xl' : 'p-4 rounded-2xl'} border transition-all cursor-pointer group flex items-center justify-between ${theme.cardBg} ${theme.cardBorder} hover:border-[#285844] shadow-2xs`}
                >
                  <div className="pr-2 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className={`font-display font-bold ${isPreview ? 'text-xs' : 'text-sm'} tracking-tight truncate`}>{item.name}</h3>
                      {item.tag && (
                        <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${theme.badgeBg} ${theme.badgeText}`}>
                          {item.tag}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <p className={`text-[10px] font-normal line-clamp-1 mb-1.5 ${theme.textSecondary}`}>
                        {item.desc}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className={`font-bold text-[#285844] ${isPreview ? 'text-[11px]' : 'text-xs'}`}>{formatRupiah(item.price)}</span>
                      <span className="text-neutral-400">•</span>
                      <span className={`flex items-center gap-1 ${isPreview ? 'text-[9.5px]' : 'text-xs'} ${theme.textSecondary}`}>
                        <Clock className={`${isPreview ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> {item.duration || '45m'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-[#285844] hidden sm:inline-block">Pilih Jam</span>
                    <button
                      type="button"
                      className={`${isPreview ? 'p-1.5 rounded-lg' : 'p-2.5 rounded-xl'} bg-neutral-100 group-hover:bg-[#285844] text-neutral-500 group-hover:text-white transition-colors`}
                      title="Booking Layanan Ini"
                    >
                      <ChevronRight className={`${isPreview ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                  </div>
                </div>
              )))}

              {/* Custom External Links */}
              {(barber.customLinks || []).filter(l => l.active).map((lnk) => (
                <a
                  key={lnk.id}
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`block ${isPreview ? 'p-2.5 text-[11px]' : 'p-3.5 text-xs'} text-center font-bold border transition-all shadow-2xs ${theme.cardBg} ${theme.cardBorder} hover:border-[#285844] ${getBtnRadiusClass(barber.buttonStyle)}`}
                >
                  {lnk.title}
                </a>
              ))}
            </motion.div>
          )}

          {/* TAB: TIM CAPSTER (JIKA FITUR TEAM DIAKTIFKAN) */}
          {activeTab === 'team' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="space-y-3 transform-gpu will-change-transform">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${theme.textSecondary}`}>
                  Tim Capster Bertugas
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {(barber.teamMembers || []).length} Capster
                </span>
              </div>

              {(barber.teamMembers || []).length === 0 ? (
                <div className={`${isPreview ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'} text-center border border-dashed ${theme.cardBorder} text-neutral-400`}>
                  <Users className={`${isPreview ? 'w-5 h-5 mb-1.5' : 'w-8 h-8 mb-2'} mx-auto opacity-40`} />
                  <p className={`${isPreview ? 'text-[11px]' : 'text-xs'} font-semibold`}>Belum ada capster yang didaftarkan</p>
                  <p className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} opacity-75 mt-0.5`}>Owner belum menambahkan anggota tim capster di studio ini.</p>
                </div>
              ) : (
                (barber.teamMembers || []).map((member) => (
                  <div 
                    key={member.id}
                    className={`${isPreview ? 'p-2.5 rounded-xl' : 'p-3.5 rounded-2xl'} border flex items-center justify-between gap-2 shadow-2xs ${theme.cardBg} ${theme.cardBorder}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`${isPreview ? 'w-8 h-8' : 'w-12 h-12'} rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0`}>
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-bold ${isPreview ? 'text-xs' : 'text-sm'} text-neutral-400`}>
                            {member.name?.charAt(0) || 'C'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className={`font-display font-bold ${isPreview ? 'text-xs' : 'text-sm'} tracking-tight truncate`}>{member.name}</h4>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${member.status === 'OFF' ? 'bg-neutral-400' : 'bg-emerald-500'}`} />
                        </div>
                        <p className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} truncate ${theme.textSecondary}`}>{member.specialty || 'Capster'}</p>
                        {member.schedule && (
                          <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">{member.schedule}</span>
                        )}
                      </div>
                    </div>

                    {features.booking !== false && activeServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(activeServices[0], `Pilihan Capster: ${member.name}`)}
                        className={`${isPreview ? 'px-2 py-1 text-[10px] rounded-lg' : 'px-3 py-2 text-[11px] rounded-xl'} text-white font-bold shrink-0 transition-transform active:scale-95 ${theme.accentBg}`}
                      >
                        Pilih
                      </button>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* TAB 2: FEED PORTOFOLIO / BEBAS POSTING */}
          {activeTab === 'lookbook' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="space-y-3 transform-gpu will-change-transform">
              
              {/* Header Info */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#285844] flex items-center justify-center text-white shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-xs text-[#171717] block leading-tight">
                      Feed & Galeri
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {((barber.lookbook && barber.lookbook.length > 0) ? barber.lookbook : [1,2,3,4,5,6]).length} Postingan
                    </span>
                  </div>
                </div>

                {/* View Mode Toggle: Grid ▦ vs Feed ☰ */}
                <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setLookbookViewMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all duration-75 cursor-pointer select-none ${
                      lookbookViewMode === 'grid' 
                        ? 'bg-white shadow-2xs text-neutral-900' 
                        : 'text-neutral-400 hover:text-neutral-700'
                    }`}
                    title="Grid 3 Kolom"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLookbookViewMode('feed')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all duration-75 cursor-pointer select-none ${
                      lookbookViewMode === 'feed' 
                        ? 'bg-white shadow-2xs text-neutral-900' 
                        : 'text-neutral-400 hover:text-neutral-700'
                    }`}
                    title="Feed Scroll"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Feed</span>
                  </button>
                </div>
              </div>

              {/* Photos List: Custom or Default Samples (0 Likes Start, Versatile Posts) */}
              {(() => {
                const sampleFeedPosts = [
                  {
                    id: 'sample-1',
                    title: 'Fresh fade haircut untuk awal pekan yang rapi 🔥',
                    img: 'https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=800',
                    tag: 'Haircut',
                    likes: 0
                  },
                  {
                    id: 'sample-2',
                    title: 'Senjata harian capster ✂️ Kebersihan & ketajaman clipper selalu nomor satu',
                    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800',
                    tag: 'Tools',
                    likes: 0
                  },
                  {
                    id: 'sample-3',
                    title: 'Suasana studio hari ini. Terima kasih untuk semua pelanggan yang sudah mampir!',
                    img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800',
                    tag: 'StudioVibe',
                    likes: 0
                  },
                  {
                    id: 'sample-4',
                    title: 'Classic executive contour side part pompadour',
                    img: 'https://images.unsplash.com/photo-1621644158485-649016e3eb3b?q=80&w=800',
                    tag: 'Classic',
                    likes: 0
                  },
                  {
                    id: 'sample-5',
                    title: 'Secangkir kopi hangat sebelum mulai sesi grooming pertama ☕',
                    img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800',
                    tag: 'BarberLife',
                    likes: 0
                  },
                  {
                    id: 'sample-6',
                    title: 'French crop textured dengan razor line up rapih',
                    img: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=800',
                    tag: 'Trending',
                    likes: 0
                  }
                ];

                const isDemoBarber = barber?.slug === 'reza' || barber?.slug === 'demo';
                const posts = (Array.isArray(barber?.lookbook) && barber.lookbook.length > 0)
                  ? barber.lookbook
                  : (isDemoBarber ? sampleFeedPosts : []);

                if (posts.length === 0) {
                  return (
                    <div className="py-12 px-4 text-center rounded-2xl bg-neutral-50/70 border border-neutral-200/80">
                      <Camera className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-neutral-700">Belum Ada Postingan Feed</p>
                      <p className="text-[11px] text-neutral-400 mt-1 max-w-xs mx-auto">
                        Capster ini belum mengunggah foto portofolio atau suasana studio.
                      </p>
                    </div>
                  );
                }

                return lookbookViewMode === 'grid' ? (
                  /* ─── 3-COLUMN UNCROPPED GRID ─── */
                  <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden bg-white border border-neutral-200/80 p-1 shadow-2xs">
                    {posts.map((look) => {
                      const isLiked = likedPosts[look.id];
                      const likesCount = (Number(look.likes) || 0) + (isLiked ? 1 : 0);
                      const commentsCount = (postComments[look.id] || []).length;
                      return (
                        <div 
                          key={look.id}
                          onClick={() => setSelectedLookPost(look)}
                          className="group relative aspect-square bg-neutral-950/90 overflow-hidden cursor-pointer rounded-lg select-none flex items-center justify-center p-0.5"
                        >
                          <img 
                            src={look.img} 
                            alt={look.title}
                            className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {/* Tag Pill in top-right */}
                          {look.tag && (
                            <div className="absolute top-1 right-1 pointer-events-none">
                              <span className="px-1.5 py-0.5 rounded-sm bg-black/70 backdrop-blur-xs text-[8px] font-semibold text-white">
                                #{look.tag}
                              </span>
                            </div>
                          )}
                          {/* Hover / Tap Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                            <div className="flex items-center gap-1">
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-white'}`} />
                              <span className="text-[10px] font-mono">{likesCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 fill-white/80" />
                              <span className="text-[10px] font-mono">{commentsCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ─── SINGLE-COLUMN FEED CARDS (100% UNCROPPED, NO BOOKING) ─── */
                  <div className="space-y-3.5">
                    {posts.map((look) => {
                      const isLiked = likedPosts[look.id];
                      const isSaved = savedPosts[look.id];
                      const likesCount = (Number(look.likes) || 0) + (isLiked ? 1 : 0);
                      const isAnimating = animatingHeartPostId === look.id;
                      const commentsList = postComments[look.id] || [];

                      return (
                        <div 
                          key={look.id} 
                          className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs"
                        >
                          {/* Post Header: Avatar, Name, Location */}
                          <div className="p-2.5 sm:p-3 flex items-center justify-between border-b border-neutral-50">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                                {barber.photo ? (
                                  <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-400">
                                    {barber.name?.charAt(0) || 'B'}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-display font-bold text-xs text-neutral-900 truncate">{barber.name}</span>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                </div>
                                <span className="text-[9.5px] text-neutral-400 block -mt-0.5 truncate">{barber.locationCity || 'Studio Barber'}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedLookPost(look)}
                              className="text-[10px] font-semibold text-[#285844] hover:underline cursor-pointer"
                            >
                              Detail Foto
                            </button>
                          </div>

                          {/* Post Image with Double-Tap to Like - 100% UNCROPPED */}
                          <div 
                            className="relative w-full bg-neutral-950 cursor-pointer overflow-hidden select-none flex items-center justify-center min-h-[260px]"
                            onDoubleClick={() => handleDoubleTapLike(look.id)}
                            title="Klik ganda untuk menyukai"
                          >
                            <img 
                              src={look.img} 
                              alt={look.title} 
                              className="w-full h-auto max-h-[620px] object-contain mx-auto block" 
                            />

                            {/* Double tap heart animation */}
                            <AnimatePresence>
                              {isAnimating && (
                                <motion.div 
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.95] }}
                                  exit={{ scale: 1.4, opacity: 0 }}
                                  transition={{ duration: 0.6 }}
                                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                                >
                                  <Heart className="w-20 h-20 text-white fill-white drop-shadow-2xl" />
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Tag badge */}
                            {look.tag && (
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-[9.5px] font-semibold backdrop-blur-xs">
                                  #{look.tag}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Bar (Heart, Comment, Share, Bookmark) */}
                          <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button 
                                type="button" 
                                onClick={(e) => toggleLikePost(look.id, e)}
                                className="cursor-pointer active:scale-125 transition-transform"
                                title={isLiked ? 'Batal Suka' : 'Suka'}
                              >
                                <Heart className={`w-5 h-5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-neutral-700 hover:text-black'}`} />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setCommentModalPost(look)}
                                className="cursor-pointer active:scale-110 transition-transform relative"
                                title="Lihat & Tulis Komentar"
                              >
                                <MessageSquare className="w-5 h-5 text-neutral-700 hover:text-black" />
                                {commentsList.length > 0 && (
                                  <span className="absolute -top-1 -right-1.5 px-1 py-0.2 min-w-[14px] text-[8.5px] font-bold rounded-full bg-neutral-900 text-white flex items-center justify-center leading-tight">
                                    {commentsList.length}
                                  </span>
                                )}
                              </button>
                              <button 
                                type="button" 
                                onClick={handleShare}
                                className="cursor-pointer active:scale-110 transition-transform"
                                title="Bagikan"
                              >
                                <Share2 className="w-4.5 h-4.5 text-neutral-700 hover:text-black" />
                              </button>
                            </div>
                            <button 
                              type="button" 
                              onClick={(e) => toggleSavePost(look.id, e)}
                              className="cursor-pointer active:scale-110 transition-transform"
                              title={isSaved ? 'Tersimpan' : 'Simpan'}
                            >
                              <Bookmark className={`w-5 h-5 ${isSaved ? 'text-neutral-900 fill-neutral-900' : 'text-neutral-700 hover:text-black'}`} />
                            </button>
                          </div>

                          {/* Likes Count */}
                          <div className="px-3 py-0.5">
                            <span className="text-[11px] font-bold text-neutral-900">
                              {likesCount.toLocaleString('id-ID')} suka
                            </span>
                          </div>

                          {/* Caption */}
                          <div className="px-3 pt-0.5 pb-1 text-xs leading-relaxed">
                            <span className="font-bold text-neutral-900 mr-1.5">{barber.name}</span>
                            <span className="text-neutral-700 font-medium">{look.title}</span>
                          </div>

                          {/* Comments Preview Link */}
                          <div className="px-3 pb-3">
                            <button 
                              type="button"
                              onClick={() => setCommentModalPost(look)}
                              className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors block text-left cursor-pointer"
                            >
                              {commentsList.length > 0 
                                ? `Lihat semua ${commentsList.length} komentar...` 
                                : 'Tulis komentar untuk postingan ini...'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* TAB 3: TIPPING / TRAKTIR KOPI */}
          {activeTab === 'tipping' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className={`transform-gpu will-change-transform ${isPreview ? 'p-3.5 rounded-xl' : 'p-6 rounded-2xl'} border text-center shadow-xs ${theme.cardBg} ${theme.cardBorder}`}>
              <div className={`${isPreview ? 'w-9 h-9 rounded-xl mb-1.5' : 'w-12 h-12 rounded-2xl mb-3'} bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-600`}>
                <Coffee className={`${isPreview ? 'w-4 h-4' : 'w-6 h-6'}`} />
              </div>
              <h3 className={`font-display font-extrabold ${isPreview ? 'text-xs mb-0.5' : 'text-base mb-1'} tracking-tight`}>
                {barber.tippingConfig?.title || 'Traktir Kopi Capster'}
              </h3>
              <p className={`${isPreview ? 'text-[10px] mb-2.5 line-clamp-2' : 'text-xs mb-5'} max-w-xs mx-auto ${theme.textSecondary}`}>
                {barber.tippingConfig?.message || `Puas dengan hasil potongan ${barber.name}? Beri sedikit apresiasi agar makin semangat!`}
              </p>

              <div className={`grid grid-cols-3 ${isPreview ? 'gap-1.5 mb-2.5' : 'gap-2 mb-4'}`}>
                {(barber.tippingConfig?.presets || [
                  { amount: 10000, label: 'Kopi Hitam', price: '10K' },
                  { amount: 25000, label: 'Kopi Susu', price: '25K' },
                  { amount: 50000, label: 'V60 Special', price: '50K' },
                ]).map((preset) => (
                  <button
                    key={preset.amount}
                    type="button"
                    onClick={() => { 
                      setTipAmount(preset.amount); 
                      setSelectedCoffeeLabel(preset.label || 'Kopi');
                      setIsTippingOpen(true); 
                    }}
                    className={`${isPreview ? 'p-1.5 rounded-lg' : 'p-3 rounded-xl'} border text-center transition-all cursor-pointer ${
                      tipAmount === preset.amount 
                        ? 'border-[#285844] bg-[#D9E5DC]/30 text-[#285844] font-bold scale-[1.02]' 
                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                    }`}
                  >
                    <p className={`${isPreview ? 'text-xs' : 'text-base'} font-display font-bold text-amber-600`}>
                      {preset.price || formatRupiah(preset.amount)}
                    </p>
                    <p className={`${isPreview ? 'text-[8.5px]' : 'text-[10px]'} uppercase font-semibold text-neutral-500`}>{preset.label}</p>
                  </button>
                ))}
              </div>

              <button 
                type="button"
                onClick={() => setIsTippingOpen(true)}
                className={`w-full ${isPreview ? 'py-2 text-[11px] rounded-lg' : 'py-3.5 text-xs rounded-xl'} text-white font-bold shadow-sm transition-transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${theme.accentBg}`}
              >
                <Coffee className="w-3.5 h-3.5" /> 
                <span>Kirim Tip Apresiasi</span>
              </button>
            </motion.div>
          )}

          {/* TAB 4: LOCATION & OPERATIONAL INFO */}
          {activeTab === 'info' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="space-y-2.5 transform-gpu will-change-transform">
              <div className={`${isPreview ? 'p-2.5 rounded-xl' : 'p-4 rounded-2xl'} border shadow-2xs ${theme.cardBg} ${theme.cardBorder}`}>
                <span className={`font-display font-bold ${isPreview ? 'text-[11px]' : 'text-xs'} block mb-0.5`}>📍 Alamat Studio:</span>
                <p className={`${isPreview ? 'text-[10px]' : 'text-xs'} leading-relaxed ${theme.textSecondary}`}>
                  {barber.address || 'Alamat belum diatur oleh barber.'}
                </p>
                {barber.mapsUrl && (
                  <a 
                    href={barber.mapsUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`mt-2 inline-flex items-center gap-1 ${isPreview ? 'text-[10px]' : 'text-xs'} text-[#285844] font-bold hover:underline`}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Petunjuk Arah Google Maps ↗</span>
                  </a>
                )}
              </div>
            </motion.div>
          )}

          </div>
        </div>

        {/* ─── Footer (Pure Public Link in Bio - Responsive & Clean on Mobile) ─── */}
        <footer className={`w-full text-center ${isPreview ? 'py-2.5 px-3' : 'pt-6 pb-8 px-4'} border-t border-black/5 shrink-0 select-none mt-auto`}>
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <Link 
              to="/"
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full ${
                barber.theme === 'charcoal' 
                  ? 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700/60' 
                  : 'bg-black/[0.04] hover:bg-black/[0.07] border-black/[0.05]'
              } border text-[10.5px] font-medium tracking-tight transition-all active:scale-95 shadow-2xs`}
              title="Ditenagai oleh E Cukur"
            >
              <span className={barber.theme === 'charcoal' ? 'text-neutral-400' : 'text-neutral-500'}>
                Ditenagai oleh
              </span>
              <Logo 
                variant="compact" 
                size="xs" 
                theme={barber.theme === 'charcoal' ? 'light' : 'dark'}
                className="scale-85" 
              />
            </Link>
            <span className={`text-[10px] ${theme.textSecondary} opacity-70 tracking-wide font-medium`}>
              Link-in-Bio Barbershop Indonesia
            </span>
          </div>
        </footer>

        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: BOOKING DRAWER (PILIH JAM & TGL) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2 bg-black/60 backdrop-blur-xs`}>
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className={`relative z-10 w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 ${isPreview ? 'max-h-[480px]' : 'max-h-[90vh]'} overflow-y-auto border border-neutral-200 shadow-2xl`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                <div>
                  <h3 className="font-display font-extrabold text-base text-[#171717]">
                    {bookingSuccessData ? 'Tiket Reservasi Berhasil' : 'Pilih Jadwal & Jam Cukur'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {bookingSuccessData ? 'Tunjukkan tiket ini saat tiba di lokasi' : `Dengan ${barber.name}`}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => { setIsBookingOpen(false); setBookingSuccessData(null); }}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingSuccessData ? (
                <div className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-[#D9E5DC] text-[#285844] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#D9E5DC] text-[#285844]">
                      ID: {bookingSuccessData.id}
                    </span>
                    <h4 className="font-display font-extrabold text-xl text-[#171717] mt-2">
                      Jadwal Cukur Terdaftar!
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      Data booking kamu telah masuk ke sistem barber.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Nama Pemesan:</span>
                      <strong className="text-[#171717]">{bookingSuccessData.customerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">WhatsApp:</span>
                      <strong className="font-mono text-[#171717]">{bookingSuccessData.customerPhone}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Layanan:</span>
                      <strong className="text-[#171717]">{bookingSuccessData.serviceName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Waktu Kedatangan:</span>
                      <strong className="text-[#285844]">{bookingSuccessData.date} • {bookingSuccessData.time} WIB</strong>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 pt-2">
                      <span className="text-neutral-500">Tarif Layanan:</span>
                      <strong className="font-mono text-sm text-[#285844]">{formatRupiah(bookingSuccessData.price)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsBookingOpen(false); setBookingSuccessData(null); }}
                    className="w-full py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitBooking} className="space-y-4 text-left">
                  
                  {/* Select service dropdown / pill */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Layanan Dipilih:</label>
                    <select
                      value={selectedService?.id || activeServices[0].id}
                      onChange={(e) => {
                        const s = activeServices.find(srv => srv.id === e.target.value);
                        setSelectedService(s || activeServices[0]);
                      }}
                      className="w-full text-xs font-semibold p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844] text-[#171717] cursor-pointer"
                    >
                      {activeServices.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} — {formatRupiah(srv.price)} ({srv.duration})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pick Date */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-2">Pilih Hari:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {UPCOMING_DATES.slice(0, 3).map((dt) => (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => setSelectedDate(dt.label)}
                          className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                            selectedDate === dt.label 
                              ? 'border-[#285844] bg-[#D9E5DC]/40 text-[#285844] font-bold' 
                              : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-600'
                          }`}
                        >
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pick Time */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-neutral-700">Pilih Jam Kedatangan:</label>
                      <span className="text-[10px] font-mono text-neutral-500">WIB</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.slice(0, 8).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 rounded-xl border text-center text-xs font-mono font-semibold transition-all ${
                            selectedTime === slot 
                              ? 'border-[#285844] bg-[#285844] text-white shadow-xs' 
                              : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2.5 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">Nama Pemesan</label>
                      <input 
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Budi Santoso"
                        className="w-full text-xs p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">Nomor WhatsApp Aktif</label>
                      <input 
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">Catatan Khusus (Opsional)</label>
                      <input 
                        type="text"
                        value={noteStyle}
                        onChange={(e) => setNoteStyle(e.target.value)}
                        placeholder="e.g. Model Taper Fade samping rapi"
                        className="w-full text-xs p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses Reservasi...' : `Konfirmasi Booking (${formatRupiah(selectedService?.price || activeServices[0].price)})`}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: TIPPING / TRAKTIR KOPI ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isTippingOpen && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs`}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-white rounded-3xl p-5 sm:p-6 ${isPreview ? 'max-h-[460px]' : 'max-h-[90vh]'} overflow-y-auto max-w-sm w-full border border-neutral-200 shadow-2xl text-center relative`}
            >
              <button 
                onClick={() => { setIsTippingOpen(false); setTipPaid(false); }}
                className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-black rounded-full cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {tipPaid ? (
                <div className="py-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="font-display font-extrabold text-xl text-[#171717]">Terima Kasih Banyak!</h4>
                  <p className="text-xs text-neutral-600 leading-relaxed px-2">
                    {barber.tippingConfig?.thankYouMessage || `Tip kopi sebesar ${formatRupiah(tipAmount)} telah diteruskan ke ${barber.name}.`}
                  </p>
                  <button
                    onClick={() => { setIsTippingOpen(false); setTipPaid(false); }}
                    className="mt-4 px-6 py-2.5 bg-[#285844] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 text-left">
                  <div className="text-center">
                    <h4 className="font-display font-bold text-sm sm:text-base text-[#171717]">
                      {barber.tippingConfig?.title || `Traktir Kopi ${barber.name}`}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {selectedCoffeeLabel} • <span className="font-semibold text-neutral-900">{formatRupiah(tipAmount)}</span>
                    </p>
                  </div>

                  {/* QRIS Box dengan Kode Unik & Verifikasi Realtime */}
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-2.5">
                    <div className="w-36 h-36 mx-auto rounded-xl bg-white p-2 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-2xs">
                      <img 
                        src={barber.tippingConfig?.qrisImage || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QRIS_PAY_${tipQrisData?.totalAmount || tipAmount}_FOR_${barber.id}`} 
                        alt="QRIS" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Banner Nominal + Kode Unik */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2 text-center">
                      <span className="text-[10px] font-semibold text-amber-800 block">
                        Transfer TEPAT termasuk 3 digit kode unik:
                      </span>
                      <div className="flex items-center justify-center gap-2 mt-0.5">
                        <span className="font-display font-extrabold text-base text-neutral-900 font-mono">
                          Rp {(tipQrisData?.totalAmount || tipAmount).toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(tipQrisData?.totalAmount || tipAmount));
                            setCopiedTipAmount(true);
                            setTimeout(() => setCopiedTipAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          {copiedTipAmount ? '✓ Disalin' : 'Salin'}
                        </button>
                      </div>
                      <span className="text-[9px] text-amber-700 block mt-0.5">
                        *Kode unik acak: +Rp {tipQrisData?.uniqueCode || '...'} agar diverifikasi otomatis
                      </span>
                    </div>

                    {/* Status Polling Animation */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 font-medium pt-0.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>Menunggu pembayaran otomatis...</span>
                    </div>

                    {/* Simulasi Cepat (Untuk Demo/Testing) */}
                    <button
                      type="button"
                      disabled={simulatingTip}
                      onClick={async () => {
                        setSimulatingTip(true);
                        try {
                          await simulateQrisPayment(tipQrisData?.referenceId, tipQrisData?.totalAmount || tipAmount);
                        } catch (e) {}
                        setTimeout(() => setSimulatingTip(false), 1500);
                      }}
                      className="text-[10px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer block mx-auto"
                    >
                      {simulatingTip ? 'Memproses Simulasi...' : '⚡ Uji Simulasi Notifikasi Masuk'}
                    </button>
                  </div>

                  {/* Input fields for customer */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-0.5">Nama Kamu (Opsional)</label>
                      <input 
                        type="text" 
                        value={tipperName}
                        onChange={(e) => setTipperName(e.target.value)}
                        placeholder="Nama kamu"
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-neutral-600 block mb-0.5">Pesan (Opsional)</label>
                      <input 
                        type="text" 
                        value={tipperMessage}
                        onChange={(e) => setTipperMessage(e.target.value)}
                        placeholder="Tulis pesan untuk capster..."
                        className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof addBarberTip === 'function') {
                        addBarberTip(barber.id, {
                          customerName: tipperName || 'Pelanggan',
                          amount: tipAmount,
                          coffeeLabel: selectedCoffeeLabel || 'Kopi',
                          message: tipperMessage || 'Terima kasih atas pelayanannya!',
                          method: 'QRIS'
                        });
                      }
                      setTipPaid(true);
                    }}
                    className="w-full py-2.5 bg-[#171717] hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer text-center"
                  >
                    Saya Sudah Bayar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: INSTAGRAM POST LIGHTBOX (DARI GRID) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {selectedLookPost && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs`}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-200"
            >
              {/* Header */}
              <div className="p-3 flex items-center justify-between border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
                    {barber.photo ? (
                      <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-neutral-400">
                        {barber.name?.charAt(0) || 'B'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-xs text-neutral-900">{barber.name}</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-[10px] text-neutral-400 block -mt-0.5">{barber.locationCity || 'Studio Barber'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLookPost(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo - 100% UNCROPPED */}
              <div 
                className="relative w-full bg-neutral-950 select-none cursor-pointer overflow-hidden flex items-center justify-center min-h-[260px] max-h-[68vh]"
                onDoubleClick={() => handleDoubleTapLike(selectedLookPost.id)}
                title="Klik ganda untuk menyukai"
              >
                <img 
                  src={selectedLookPost.img} 
                  alt={selectedLookPost.title} 
                  className="w-full h-auto max-h-[68vh] object-contain mx-auto block" 
                />
                
                {/* Double-tap heart animation */}
                <AnimatePresence>
                  {animatingHeartPostId === selectedLookPost.id && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.25, 1], opacity: [0, 1, 0.95] }}
                      exit={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                      <Heart className="w-20 h-20 text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedLookPost.tag && (
                  <div className="absolute top-2.5 right-2.5 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-[9.5px] font-semibold backdrop-blur-xs">
                      #{selectedLookPost.tag}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    type="button" 
                    onClick={(e) => toggleLikePost(selectedLookPost.id, e)}
                    className="cursor-pointer active:scale-125 transition-transform"
                    title={likedPosts[selectedLookPost.id] ? 'Batal Suka' : 'Suka'}
                  >
                    <Heart className={`w-5 h-5 ${likedPosts[selectedLookPost.id] ? 'text-red-500 fill-red-500' : 'text-neutral-700 hover:text-black'}`} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      const look = selectedLookPost;
                      setSelectedLookPost(null);
                      setCommentModalPost(look);
                    }}
                    className="cursor-pointer active:scale-110 transition-transform relative"
                    title="Lihat & Tulis Komentar"
                  >
                    <MessageSquare className="w-5 h-5 text-neutral-700 hover:text-black" />
                    {(postComments[selectedLookPost.id]?.length > 0) && (
                      <span className="absolute -top-1 -right-1.5 px-1 py-0.2 min-w-[14px] text-[8.5px] font-bold rounded-full bg-neutral-900 text-white flex items-center justify-center leading-tight">
                        {postComments[selectedLookPost.id].length}
                      </span>
                    )}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleShare}
                    className="cursor-pointer active:scale-110 transition-transform"
                    title="Bagikan"
                  >
                    <Share2 className="w-4.5 h-4.5 text-neutral-700 hover:text-black" />
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => toggleSavePost(selectedLookPost.id, e)}
                  className="cursor-pointer active:scale-110 transition-transform"
                  title={savedPosts[selectedLookPost.id] ? 'Tersimpan' : 'Simpan'}
                >
                  <Bookmark className={`w-5 h-5 ${savedPosts[selectedLookPost.id] ? 'text-neutral-900 fill-neutral-900' : 'text-neutral-700 hover:text-black'}`} />
                </button>
              </div>

              {/* Likes & Caption */}
              <div className="px-3.5 pt-0.5 pb-3.5 text-xs">
                <span className="text-[11px] font-bold text-neutral-900 block mb-1">
                  {((Number(selectedLookPost.likes) || 0) + (likedPosts[selectedLookPost.id] ? 1 : 0)).toLocaleString('id-ID')} suka
                </span>
                <p className="leading-relaxed">
                  <span className="font-bold text-neutral-900 mr-1.5">{barber.name}</span>
                  <span className="text-neutral-700 font-medium">{selectedLookPost.title}</span>
                </p>

                {/* Comment Link inside Lightbox */}
                <button
                  type="button"
                  onClick={() => {
                    const look = selectedLookPost;
                    setSelectedLookPost(null);
                    setCommentModalPost(look);
                  }}
                  className="text-[11px] text-neutral-400 hover:text-neutral-700 mt-1 block cursor-pointer"
                >
                  {(postComments[selectedLookPost.id]?.length > 0)
                    ? `Lihat semua ${postComments[selectedLookPost.id].length} komentar...`
                    : 'Tulis komentar untuk postingan ini...'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: KOMENTAR & DISKUSI POSTINGAN FEED ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {commentModalPost && (
          <div className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 bg-black/75 backdrop-blur-xs`}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-200 shrink-0 flex items-center justify-center">
                    <img src={commentModalPost.img} alt={commentModalPost.title} className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xs text-neutral-900 truncate">
                      Komentar & Diskusi Postingan
                    </h4>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {commentModalPost.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentModalPost(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-400 hover:text-black cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="p-3.5 overflow-y-auto space-y-3 flex-1 min-h-[180px] max-h-[320px]">
                {((postComments[commentModalPost.id] || []).length === 0) ? (
                  <div className="text-center py-8 text-neutral-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">Belum ada komentar atau tanya jawab.</p>
                    <p className="text-[10px] mt-0.5">Jadilah yang pertama bertanya mengenai gaya rambut ini!</p>
                  </div>
                ) : (
                  (postComments[commentModalPost.id] || []).map((cmt) => (
                    <div key={cmt.id} className="flex gap-2.5 text-xs">
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-[11px] ${
                        cmt.isBarber 
                          ? 'bg-[#285844] text-white border border-[#1E4334]' 
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}>
                        {cmt.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-neutral-50 rounded-2xl p-2.5 border border-neutral-150">
                        <div className="flex items-center justify-between mb-0.5 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[11.5px] text-neutral-900">{cmt.name}</span>
                            {cmt.isBarber && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[8.5px] font-bold">
                                Barber
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] text-neutral-400">{cmt.time}</span>
                        </div>
                        <p className="text-neutral-700 leading-relaxed text-[11.5px]">{cmt.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <form 
                onSubmit={(e) => handleAddComment(commentModalPost.id, e)}
                className="p-3 border-t border-neutral-200 bg-white space-y-2"
              >
                <input
                  type="text"
                  value={commentInputName}
                  onChange={(e) => setCommentInputName(e.target.value)}
                  placeholder="Nama kamu (opsional)"
                  className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 focus:bg-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInputText}
                    onChange={(e) => setCommentInputText(e.target.value)}
                    placeholder="Tulis pertanyaan atau komentar gaya ini..."
                    className="flex-1 px-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-neutral-900 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!commentInputText.trim()}
                    className="p-2 rounded-xl bg-[#285844] hover:bg-[#1E4334] disabled:opacity-40 text-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    title="Kirim Komentar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
