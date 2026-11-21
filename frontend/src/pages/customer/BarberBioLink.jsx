import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  Crown,
  Globe,
  Heart,
  Bookmark,
  Grid,
  List,
  MessageSquare,
  Send,
  Camera,
  Ticket,
  Phone,
  ChevronLeft
} from 'lucide-react';
import { useStore } from '../../store';
import { getAppDomain } from '../../lib/domain';
import Logo from '../../components/Logo';
import VerifiedBadge from '../../components/VerifiedBadge';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createQrisPayment, checkQrisPaymentStatus, getDynamicQrisImageUrl } from '../../lib/qrisPayment';
import { fetchBookingTracking } from '../../lib/bookingTracking';
import { 
  DEFAULT_OPERATING_HOURS, 
  generateTimeSlots, 
  timeToMinutes, 
  minutesToTime, 
  parseServiceDurationMinutes, 
  formatDurationLabel,
  isSlotInBreakTime 
} from '../../lib/operatingHours';

const getJakartaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatDateKey = (dateKey, options) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
};

const getCalendarDays = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array(firstDay.getUTCDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    })
  ];
};

const shiftMonth = (monthKey, amount) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getCapsterStatus = (member) => {
  const status = String(member?.status || 'AVAILABLE').toUpperCase();
  if (status === 'OFF') return 'OFF';
  if (status === 'CUTTING' || status === 'IN_SERVICE') return 'CUTTING';
  return 'AVAILABLE';
};

const generateBookingCode = () => `ECK-${Math.floor(100 + Math.random() * 900)}`;

export default function BarberBioLink({ customBarber = null, isPreview = false }) {
  const appDomain = getAppDomain();
  const navigate = useNavigate();
  const { id } = useParams();

  const barbers = useStore((state) => state.barbers);
  const activeBarber = useStore((state) => state.activeBarber);
  const authUser = useStore((state) => state.authUser);
  const addBooking = useStore((state) => state.addBooking);
  const bookings = useStore((state) => state.bookings || []);
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
  const activeServices = useMemo(
    () => (Array.isArray(barber?.services) && barber.services.length > 0)
      ? barber.services.filter(s => s.active !== false)
      : [],
    [barber]
  );

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
  const [bookingStep, setBookingStep] = useState('form'); // 'form' | 'qris' | 'success'
  const [selectedService, setSelectedService] = useState(null);
  const [isCapsterLocked, setIsCapsterLocked] = useState(false);
  const [isServiceLocked, setIsServiceLocked] = useState(false);
  const [todayIso, setTodayIso] = useState(() => getJakartaDateKey());
  const [selectedDate, setSelectedDate] = useState(() => getJakartaDateKey());
  const [calendarMonth, setCalendarMonth] = useState(() => getJakartaDateKey().slice(0, 7));
  const operatingHours = barber?.features?.operatingHours || DEFAULT_OPERATING_HOURS;
  const timeSlots = useMemo(() => generateTimeSlots(operatingHours), [operatingHours]);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedCapsterId, setSelectedCapsterId] = useState('');
  const [liveTeamMembers, setLiveTeamMembers] = useState(barber?.teamMembers || []);
  const [availabilityBookings, setAvailabilityBookings] = useState([]);
  const [availabilityReady, setAvailabilityReady] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const paymentMethod = 'QRIS';
  const [noteStyle, setNoteStyle] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [bookingQrisData, setBookingQrisData] = useState(null);
  const [copiedBookingAmount, setCopiedBookingAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTicket, setActiveTicket] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('ecukur_active_ticket');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) return parsed;
        }
      }
    } catch {}
    return null;
  });

  // Platform Broadcast Announcement Listener
  const [broadcastInfo, setBroadcastInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('ecukur_platform_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('ecukur_platform_settings');
        setBroadcastInfo(saved ? JSON.parse(saved) : null);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const teamMembers = liveTeamMembers;
  const teamBookingEnabled = barber?.profileType === 'barbershop'
    && barber?.features?.team === true
    && teamMembers.length > 0;
  const selectedCapster = teamMembers.find((member) => member.id === selectedCapsterId) || null;
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const calendarMonthLabel = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, 1)));
  }, [calendarMonth]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getJakartaDateKey();
      setTodayIso((previousDate) => {
        if (previousDate === currentDate) return previousDate;
        setSelectedDate((prevDate) => (prevDate < currentDate ? currentDate : prevDate));
        setCalendarMonth((prevMonth) => (prevMonth < currentDate.slice(0, 7) ? currentDate.slice(0, 7) : prevMonth));
        return currentDate;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (!active) return;
      setLiveTeamMembers(barber?.teamMembers || []);
    })();
    return () => {
      active = false;
    };
  }, [barber?.id, barber?.teamMembers]);

  useEffect(() => {
    const barberId = barber?.id;
    if (!isSupabaseConfigured || isPreview || !barberId || !barber?.features?.team) return undefined;

    let active = true;
    const refreshTeamStatus = async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('team_members')
        .eq('id', barberId)
        .maybeSingle();

      if (error) {
        console.warn('Capster status refresh failed:', error);
        return;
      }
      if (active && Array.isArray(data?.team_members)) {
        setLiveTeamMembers(data.team_members);
      }
    };

    refreshTeamStatus();
    const interval = setInterval(refreshTeamStatus, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [barber?.id, barber?.features?.team, isPreview]);

  const isSlotAvailable = useCallback((slot) => {
    if (!availabilityReady || availabilityDate !== selectedDate || availabilityError) return false;
    if (teamBookingEnabled && (
      !selectedCapster || getCapsterStatus(selectedCapster) !== 'AVAILABLE'
    )) return false;
    const start = timeToMinutes(slot);
    const duration = parseServiceDurationMinutes(selectedService || activeServices[0]);
    const end = start + duration;
    if (!Number.isFinite(start)) return false;

    // Batasan jam operasional tutup studio (selesai pengerjaan tidak boleh melebihi jam tutup)
    const closeMinutes = timeToMinutes(operatingHours?.close || DEFAULT_OPERATING_HOURS.close);
    if (end > closeMinutes) return false;

    // Batasan jam istirahat studio / Jumat (tidak boleh bentrok dengan waktu istirahat)
    if (isSlotInBreakTime(slot, duration, operatingHours, selectedDate)) {
      return false;
    }

    // Jika tanggal yang dipilih adalah hari ini atau sebelumnya, jam yang sudah lewat tidak bisa dipilih
    if (selectedDate <= todayIso) {
      const now = new Date();
      const currentJakartaMinutes = ((now.getUTCHours() + 7) % 24) * 60 + now.getUTCMinutes();
      if (start <= currentJakartaMinutes) return false;
    }

    // Pengecekan multi-slot bentrok dengan jadwal booking lain (+ buffer jeda antar tamu jika ada)
    const buffer = Number(operatingHours?.bufferMinutes) || 0;
    return !availabilityBookings.some((booking) => {
      const bookingStart = timeToMinutes(booking.start_time);
      const bookingDuration = booking.duration_minutes || (booking.end_time ? timeToMinutes(booking.end_time) - bookingStart : 45);
      const bookingEnd = booking.end_time
        ? timeToMinutes(booking.end_time)
        : bookingStart + bookingDuration;
      const bufferedEnd = bookingEnd + buffer;
      return start < bufferedEnd && (end + buffer) > bookingStart;
    });
  }, [availabilityReady, availabilityDate, selectedDate, todayIso, availabilityError, availabilityBookings, selectedService, activeServices, teamBookingEnabled, selectedCapster, operatingHours]);

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.resolve();
      if (!active) return;
      if (selectedTime && !isSlotAvailable(selectedTime)) {
        setSelectedTime('');
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedTime, isSlotAvailable, selectedDate]);

  useEffect(() => {
    if (!isBookingOpen || isPreview) return undefined;

    let active = true;
    let refreshTimer;
    const barberId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(barber?.id))
      ? barber.id
      : null;

    const refreshAvailability = async () => {
      await Promise.resolve();
      if (!active) return;
      if (!isSupabaseConfigured) {
        setAvailabilityBookings([]);
        setAvailabilityReady(true);
        setAvailabilityDate(selectedDate);
        setAvailabilityError('');
        return;
      }

      if (teamBookingEnabled && !selectedCapsterId) {
        setAvailabilityBookings([]);
        setAvailabilityReady(true);
        setAvailabilityDate(selectedDate);
        setAvailabilityError('');
        return;
      }

      try {
        const { data, error } = teamBookingEnabled && selectedCapsterId
          ? await supabase.rpc('get_public_capster_booking_availability', {
              p_barber_id: barberId,
              p_booking_date: selectedDate,
              p_barber_name: barber?.name || null,
              p_capster_id: selectedCapsterId
            })
          : await supabase.rpc('get_public_booking_availability', {
              p_barber_id: barberId,
              p_booking_date: selectedDate,
              p_barber_name: barber?.name || null
            });
        if (error) throw error;
        if (active) {
          setAvailabilityBookings(Array.isArray(data) ? data : []);
          setAvailabilityReady(true);
          setAvailabilityDate(selectedDate);
          setAvailabilityError('');
        }
      } catch (error) {
        console.warn('Booking availability fetch failed, switching to local store fallback:', error);
        if (active) {
          // Fallback lokal: gunakan bookings dari memory store agar jam tetap bisa dipilih
          const localBookings = (bookings || []).filter((b) => {
            const dateMatch = b.dateIso === selectedDate || b.date === selectedDate;
            const capsterMatch = !teamBookingEnabled || !selectedCapsterId ||
              String(b.capsterId) === String(selectedCapsterId) ||
              String(b.capsterName || '').toLowerCase() === String(selectedCapster?.name || '').toLowerCase();
            const isActive = !['Batal', 'CANCELLED', 'EXPIRED', 'Selesai', 'COMPLETED'].includes(b.status);
            return dateMatch && capsterMatch && isActive;
          }).map((b) => ({
            start_time: b.time || '10:00',
            end_time: null,
            booking_status: b.status
          }));

          setAvailabilityBookings(localBookings);
          setAvailabilityReady(true);
          setAvailabilityDate(selectedDate);
          setAvailabilityError('');
        }
      }
    };

    Promise.resolve().then(() => {
      if (active) refreshAvailability();
    });
    refreshTimer = setInterval(refreshAvailability, 5000);
    return () => {
      active = false;
      clearInterval(refreshTimer);
    };
  }, [isBookingOpen, isPreview, selectedDate, selectedCapsterId, teamBookingEnabled, barber?.id, barber?.name, bookings, selectedCapster]);

  // Auto-listen when customer is on QRIS payment step
  useEffect(() => {
    if (bookingStep !== 'qris' || !bookingQrisData?.bookingId) return;

    let active = true;
    const pollBooking = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { booking: data } = await fetchBookingTracking(
          bookingQrisData.bookingId,
          bookingQrisData.ticketToken
        );

        if (data && (data.paymentStatus === 'PAID' || data.status === 'CONFIRMED')) {
          if (active) {
            const successPayload = {
              id: bookingQrisData.bookingId,
              ticketToken: bookingQrisData.ticketToken,
              customerName,
              customerPhone,
              capsterName: selectedCapster?.name || null,
              serviceName: selectedService?.name || activeServices[0]?.name,
              date: formatDateKey(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
              time: selectedTime,
              price: bookingQrisData.basePrice || bookingQrisData.totalAmount,
              paymentMethod: 'QRIS (Lunas Otomatis)'
            };
            setBookingSuccessData(successPayload);
            setActiveTicket(successPayload);
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem('ecukur_active_ticket', JSON.stringify(successPayload));
              }
            } catch {}
            setBookingStep('success');
          }
        }
      } catch (err) {
        console.warn('Booking payment status check failed:', err);
      }
    };

    const interval = setInterval(pollBooking, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingStep, bookingQrisData, customerName, customerPhone, selectedCapster, selectedService, activeServices, selectedDate, selectedTime]);

  // Tipping Modal State
  const [isTippingOpen, setIsTippingOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(25000);
  const [selectedCoffeeLabel, setSelectedCoffeeLabel] = useState('Kopi Susu');
  const [tipperName, setTipperName] = useState('');
  const tipperNameRef = useRef(tipperName);
  useEffect(() => {
    tipperNameRef.current = tipperName;
  }, [tipperName]);
  const [tipperMessage, setTipperMessage] = useState('');
  const [tipPaid, setTipPaid] = useState(false);
  const [tipQrisData, setTipQrisData] = useState(null);
  const [tipQrisLoading, setTipQrisLoading] = useState(false);
  const [tipQrisError, setTipQrisError] = useState('');
  const [copiedTipAmount, setCopiedTipAmount] = useState(false);

  const barberId = barber?.id;
  const tippingQrisImage = barber?.tippingConfig?.qrisImage || null;

  // Auto-generate QRIS tagihan dengan kode unik saat modal tip dibuka
  useEffect(() => {
    if (!isTippingOpen || tipPaid || !barberId) return undefined;
    let isCancelled = false;
    let pollInterval = null;

    (async () => {
      await Promise.resolve();
      if (isCancelled) return;

      setTipQrisLoading(true);
      setTipQrisError('');

      try {
        const res = await createQrisPayment({
          type: 'TIP',
          amount: tipAmount,
          barberId,
          customerName: tipperNameRef.current || 'Pelanggan',
          qrisImageUrl: tippingQrisImage
        });

        if (isCancelled) return;
        setTipQrisLoading(false);

        if (res?.success && res.payment) {
          setTipQrisData(res.payment);

          // Polling status tiap 2.5 detik untuk mendeteksi notifikasi MacroDroid
          pollInterval = setInterval(async () => {
            const statusRes = await checkQrisPaymentStatus(res.payment.referenceId);
            if (statusRes?.success && statusRes.status === 'PAID') {
              clearInterval(pollInterval);
              setTipPaid(true);
            }
          }, 2500);
        } else {
          setTipQrisError(res?.error || 'Tagihan QRIS gagal dibuat. Coba lagi.');
        }
      } catch (error) {
        console.error('Gagal membuat tagihan tip QRIS:', error);
        if (!isCancelled) setTipQrisError('Tagihan QRIS gagal dibuat. Coba lagi.');
      } finally {
        if (!isCancelled) setTipQrisLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isTippingOpen, tipAmount, tipPaid, barberId, tippingQrisImage]);

  // Share link copy
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2400);
    }
  };

  const handleOpenBooking = (service = null, capsterId = '') => {
    setSelectedService(service || activeServices[0]);
    const firstAvailableCapster = teamMembers.find((member) => getCapsterStatus(member) === 'AVAILABLE');
    setSelectedCapsterId(capsterId || firstAvailableCapster?.id || '');
    // Lock capster jika dipilih dari Tab Capster (capsterId dikirim)
    setIsCapsterLocked(!!capsterId);
    // Lock layanan jika dipilih dari Tab Layanan (service dikirim tanpa capsterId)
    setIsServiceLocked(!!service && !capsterId);
    setBookingSuccessData(null);
    setBookingQrisData(null);
    setBookingStep('form');
    setIsBookingOpen(true);
  };

  const hasConsultationAccount = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barber?.user_id || '');

  const handleConsultation = () => {
    const barberUserId = barber?.user_id;
    if (!hasConsultationAccount || authUser?.id === barberUserId) return;
    navigate(`/messages?barberId=${encodeURIComponent(barberUserId)}${barber?.slug ? `&profileSlug=${encodeURIComponent(barber.slug)}` : ''}`);
  };
  const isOwnProfile = Boolean(authUser?.id && authUser.id === barber?.user_id);

  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('628')) {
      val = '08' + val.slice(3);
    }
    if (val.length > 13) {
      val = val.slice(0, 13);
    }
    setCustomerPhone(val);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    if (!trimmedName || !trimmedPhone) {
      window.alert('Silakan lengkapi nama dan nomor WhatsApp Anda.');
      return;
    }
    if (!/^08[0-9]{8,11}$/.test(trimmedPhone)) {
      window.alert('Nomor WhatsApp tidak valid. Nomor wajib diawali 08 dan memiliki panjang 10–13 angka (maksimal 13 digit).');
      return;
    }
    if (teamBookingEnabled && (
      !selectedCapster || getCapsterStatus(selectedCapster) !== 'AVAILABLE'
    )) {
      window.alert('Pilih capster yang sedang free sebelum melanjutkan booking.');
      return;
    }
    if (isSupabaseConfigured && (!availabilityReady || !isSlotAvailable(selectedTime))) {
      window.alert(availabilityError || 'Slot ini tidak lagi tersedia. Silakan pilih jadwal lain.');
      return;
    }

    setIsSubmitting(true);
    const bookingCode = generateBookingCode();
    const basePrice = Number(selectedService ? selectedService.price : (activeServices[0]?.price || 50000));

    // Kode unik acak 3-digit untuk verifikasi otomatis via QRIS Listener
    const uniqueCode = paymentMethod === 'QRIS' ? Math.floor(100 + Math.random() * 899) : 0;
    const finalPrice = basePrice + uniqueCode;

    const serviceDuration = parseServiceDurationMinutes(selectedService || activeServices[0]);
    const startMin = timeToMinutes(selectedTime);
    const calculatedEndTime = minutesToTime(startMin + serviceDuration);

    const newBooking = {
      id: bookingCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      barberId: barber.id,
      barberName: barber.name,
      capsterId: teamBookingEnabled ? selectedCapster.id : null,
      capsterName: teamBookingEnabled ? selectedCapster.name : null,
      serviceName: selectedService ? selectedService.name : activeServices[0].name,
      date: formatDateKey(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      dateIso: selectedDate,
      time: selectedTime,
      startTime: selectedTime,
      endTime: calculatedEndTime,
      durationMinutes: serviceDuration,
      serviceId: selectedService?.id || activeServices[0]?.id,
      status: paymentMethod === 'QRIS' ? 'Menunggu' : 'Terkonfirmasi',
      paymentMethod,
      price: basePrice, // Nominal bersih layanan cukur (tanpa kode unik untuk dashboard barber & admin)
      note: noteStyle.trim()
    };

    let saved;
    try {
      saved = await addBooking(newBooking);
    } catch (error) {
      saved = { success: false, error: error.message };
    }
    setIsSubmitting(false);
    if (!saved?.id) {
      window.alert(saved?.error || 'Booking gagal disimpan. Silakan coba lagi.');
      return;
    }
    const resolvedId = saved.id;

    // Catat ke tabel qris_payments dengan kode unik untuk verifikasi otomatis
    if (paymentMethod === 'QRIS') {
      try {
        if (isSupabaseConfigured && supabase) {
          supabase.from('qris_payments').insert({
            reference_id: `ECK-${bookingCode}-${uniqueCode}`,
            type: 'BOOKING',
            booking_id: String(resolvedId),
            barber_id: barber.id ? String(barber.id) : null,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            base_amount: basePrice,
            unique_code: uniqueCode,
            total_amount: finalPrice,
            qris_image_url: getDynamicQrisImageUrl(finalPrice),
            status: 'PENDING',
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
          }).then(() => {}).catch((err) => console.warn('qris_payments insert notice:', err.message));
        }
      } catch {}
    }

    setBookingQrisData({
      bookingId: resolvedId,
      ticketToken: saved.ticketToken,
      basePrice,
      uniqueCode,
      totalAmount: finalPrice,
      customerName: customerName.trim(),
      qrisImageUrl: getDynamicQrisImageUrl(finalPrice)
    });
    setBookingStep('qris');
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

  // Theme Styling Helper (5 Official E-Cukur Themes + 5 .barb Editorial Themes)
  const getThemeStyles = (themeKey) => {
    let key = (themeKey || 'light').toLowerCase();
    // Legacy theme aliases mapping
    if (key === 'forest') key = 'light';
    if (key === 'charcoal') key = 'dark';
    if (key === 'asgar') key = 'clay';
    if (key === 'monochrome') key = 'editorial';

    switch (key) {
      case 'dark':
        return {
          id: 'dark',
          name: 'Dark Mode',
          isDark: true,
          pageBg: 'bg-[#0f1115]',
          cardBg: 'bg-[#181a1f]',
          cardBorder: 'border-[#262a33]',
          textPrimary: 'text-white',
          textSecondary: 'text-neutral-400',
          pillBg: 'bg-[#22252c] hover:bg-[#2c3038]',
          pillBorder: 'border-[#2e333d]',
          pillText: 'text-neutral-200',
          pillIcon: 'text-emerald-400',
          navBg: 'bg-[#1f2229]',
          navBorder: 'border-[#2b2f38]',
          tabActiveBg: 'bg-[#10B981] text-neutral-950 font-bold',
          tabActiveIcon: 'text-neutral-950',
          tabInactiveText: 'text-neutral-400 hover:text-white',
          tabInactiveIcon: 'text-neutral-400',
          serviceCardBg: 'bg-[#1f2229]',
          serviceCardHover: 'hover:border-[#10B981]/70',
          servicePrice: 'text-emerald-400',
          serviceArrowBg: 'bg-[#282d36] group-hover:bg-[#10B981]',
          serviceArrowText: 'text-neutral-300 group-hover:text-neutral-950',
          accentBg: 'bg-[#10B981] hover:bg-[#059669]',
          accentText: 'text-neutral-950 font-bold',
          outlineBtn: 'bg-[#22252c] hover:bg-[#2a2e36] text-white border border-[#2e333d]',
          badgeBg: 'bg-emerald-950/60',
          badgeText: 'text-emerald-300 border border-emerald-500/30',
          logoTheme: 'light',
          footerBorder: 'border-white/5',
          footerBadgeBg: 'bg-[#22252c]',
          footerBadgeBorder: 'border-[#2e333d]',
          footerBadgeText: 'text-neutral-400',
          proBadge: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30',
          proIcon: 'text-emerald-400',
          studioBadge: 'bg-amber-950/80 text-amber-300 border border-amber-500/30',
          studioIcon: 'text-amber-400',
        };

      case 'pink':
        return {
          id: 'pink',
          name: 'Pink Theme',
          isDark: false,
          pageBg: 'bg-[#FDF2F4]',
          cardBg: 'bg-[#FFF8F9]',
          cardBorder: 'border-[#FBCFE8]/80',
          textPrimary: 'text-[#4C0519]',
          textSecondary: 'text-[#9F1239]/75',
          pillBg: 'bg-[#FCE7EB] hover:bg-[#FBCFE8]',
          pillBorder: 'border-[#F472B6]/40',
          pillText: 'text-[#881337]',
          pillIcon: 'text-[#BE185D]',
          navBg: 'bg-[#FCE7EB]/90',
          navBorder: 'border-[#FBCFE8]',
          tabActiveBg: 'bg-[#BE185D] text-white font-bold',
          tabActiveIcon: 'text-white',
          tabInactiveText: 'text-[#9F1239]/70 hover:text-[#881337]',
          tabInactiveIcon: 'text-[#9F1239]/60',
          serviceCardBg: 'bg-white',
          serviceCardHover: 'hover:border-[#BE185D]/70',
          servicePrice: 'text-[#BE185D]',
          serviceArrowBg: 'bg-[#FCE7EB] group-hover:bg-[#BE185D]',
          serviceArrowText: 'text-[#9F1239] group-hover:text-white',
          accentBg: 'bg-[#BE185D] hover:bg-[#9D174D]',
          accentText: 'text-white font-bold',
          outlineBtn: 'bg-white hover:bg-rose-50/80 text-[#881337] border border-[#FBCFE8] shadow-xs',
          badgeBg: 'bg-[#FCE7EB]',
          badgeText: 'text-[#9D174D] border border-[#F472B6]/30',
          logoTheme: 'dark',
          footerBorder: 'border-rose-900/5',
          footerBadgeBg: 'bg-[#FCE7EB]',
          footerBadgeBorder: 'border-[#FBCFE8]',
          footerBadgeText: 'text-[#9F1239]',
          proBadge: 'bg-[#FCE7EB] text-[#9D174D] border border-[#F472B6]/40',
          proIcon: 'text-[#BE185D]',
          studioBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
          studioIcon: 'text-amber-700',
        };

      case 'green':
        return {
          id: 'green',
          name: 'Green Theme',
          isDark: true,
          pageBg: 'bg-[#121E17]',
          cardBg: 'bg-[#18271E]',
          cardBorder: 'border-[#273F31]',
          textPrimary: 'text-[#F0FDF4]',
          textSecondary: 'text-[#9EB9AA]',
          pillBg: 'bg-[#22352A] hover:bg-[#2B4235]',
          pillBorder: 'border-[#314E3D]',
          pillText: 'text-[#D4E8DC]',
          pillIcon: 'text-[#84A98C]',
          navBg: 'bg-[#203126]',
          navBorder: 'border-[#2D4536]',
          tabActiveBg: 'bg-[#84A98C] text-[#121E17] font-bold',
          tabActiveIcon: 'text-[#121E17]',
          tabInactiveText: 'text-[#9EB9AA] hover:text-white',
          tabInactiveIcon: 'text-[#9EB9AA]',
          serviceCardBg: 'bg-[#1D2E24]',
          serviceCardHover: 'hover:border-[#84A98C]',
          servicePrice: 'text-[#84A98C]',
          serviceArrowBg: 'bg-[#263C2E] group-hover:bg-[#84A98C]',
          serviceArrowText: 'text-[#A3C9A8] group-hover:text-[#121E17]',
          accentBg: 'bg-[#84A98C] hover:bg-[#72977A]',
          accentText: 'text-[#121E17] font-bold',
          outlineBtn: 'bg-[#22352A] hover:bg-[#2B4235] text-[#F0FDF4] border border-[#314E3D]',
          badgeBg: 'bg-[#263D2F]',
          badgeText: 'text-[#A3C9A8] border border-[#3C5D48]',
          logoTheme: 'light',
          footerBorder: 'border-white/5',
          footerBadgeBg: 'bg-[#22352A]',
          footerBadgeBorder: 'border-[#314E3D]',
          footerBadgeText: 'text-[#9EB9AA]',
          proBadge: 'bg-[#263D2F] text-[#A3C9A8] border border-[#3C5D48]',
          proIcon: 'text-[#84A98C]',
          studioBadge: 'bg-amber-950/80 text-amber-300 border border-amber-500/30',
          studioIcon: 'text-amber-400',
        };

      case 'premium':
        return {
          id: 'premium',
          name: 'Premium Theme',
          isDark: true,
          pageBg: 'bg-[#0B0B0C]',
          cardBg: 'bg-[#131315]',
          cardBorder: 'border-amber-500/30',
          textPrimary: 'text-white',
          textSecondary: 'text-neutral-400',
          pillBg: 'bg-[#1D1B16] hover:bg-[#26231C]',
          pillBorder: 'border-amber-500/30',
          pillText: 'text-amber-200',
          pillIcon: 'text-amber-400',
          navBg: 'bg-[#191814]',
          navBorder: 'border-amber-500/25',
          tabActiveBg: 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#B45309] text-neutral-950 font-bold',
          tabActiveIcon: 'text-neutral-950',
          tabInactiveText: 'text-neutral-400 hover:text-amber-300',
          tabInactiveIcon: 'text-neutral-400',
          serviceCardBg: 'bg-[#18181A]',
          serviceCardHover: 'hover:border-amber-500/60',
          servicePrice: 'text-amber-400',
          serviceArrowBg: 'bg-[#23221E] group-hover:bg-[#F59E0B]',
          serviceArrowText: 'text-amber-300 group-hover:text-neutral-950',
          accentBg: 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:opacity-95',
          accentText: 'text-neutral-950 font-bold',
          outlineBtn: 'bg-[#1D1B16] hover:bg-[#26231C] text-amber-200 border border-amber-500/35 shadow-xs',
          badgeBg: 'bg-amber-950/60',
          badgeText: 'text-amber-300 border border-amber-500/30',
          logoTheme: 'light',
          footerBorder: 'border-amber-500/15',
          footerBadgeBg: 'bg-[#1D1B16]',
          footerBadgeBorder: 'border-amber-500/30',
          footerBadgeText: 'text-amber-200',
          proBadge: 'bg-amber-950/60 text-amber-300 border border-amber-500/40',
          proIcon: 'text-amber-400',
          studioBadge: 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold shadow-xs',
          studioIcon: 'text-neutral-950',
          hasGoldWave: true,
        };

      case 'editorial':
        return {
          id: 'editorial',
          name: 'Editorial Theme',
          isDark: false,
          pageBg: 'bg-[#F5EFEB]',
          cardBg: 'bg-[#FAF7F2]',
          cardBorder: 'border-[#E2D8CD]',
          textPrimary: 'text-[#1E1A17]',
          textSecondary: 'text-[#6A625A]',
          pillBg: 'bg-[#EAE2D8] hover:bg-[#DFD6CB]',
          pillBorder: 'border-[#D5C9BC]',
          pillText: 'text-[#2D2621]',
          pillIcon: 'text-[#1E1A17]',
          navBg: 'bg-[#EAE2D8]/80',
          navBorder: 'border-[#D8CCC0]',
          tabActiveBg: 'bg-[#24201D] text-[#FAF7F2] font-bold',
          tabActiveIcon: 'text-[#FAF7F2]',
          tabInactiveText: 'text-[#6A625A] hover:text-[#1E1A17]',
          tabInactiveIcon: 'text-[#6A625A]',
          serviceCardBg: 'bg-[#FAF7F2]',
          serviceCardHover: 'hover:border-[#1E1A17]',
          servicePrice: 'text-[#1E1A17]',
          serviceArrowBg: 'bg-[#EAE2D8] group-hover:bg-[#24201D]',
          serviceArrowText: 'text-[#2D2621] group-hover:text-white',
          accentBg: 'bg-[#24201D] hover:bg-[#38322E]',
          accentText: 'text-[#FAF7F2] font-bold',
          outlineBtn: 'bg-[#FAF7F2] hover:bg-[#EAE2D8] text-[#1E1A17] border border-[#D5C9BC]',
          badgeBg: 'bg-[#EAE2D8]',
          badgeText: 'text-[#2D2621] border border-[#D5C9BC]',
          logoTheme: 'dark',
          footerBorder: 'border-black/5',
          footerBadgeBg: 'bg-[#EAE2D8]',
          footerBadgeBorder: 'border-[#D5C9BC]',
          footerBadgeText: 'text-[#6A625A]',
          proBadge: 'bg-[#EAE2D8] text-[#2D2621] border border-[#D5C9BC]',
          proIcon: 'text-[#1E1A17]',
          studioBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
          studioIcon: 'text-amber-800',
        };

      case 'clay':
        return {
          id: 'clay',
          name: 'Warm Clay Theme',
          isDark: false,
          pageBg: 'bg-[#F8EFE9]',
          cardBg: 'bg-[#FFF9F5]',
          cardBorder: 'border-[#ECCEC2]',
          textPrimary: 'text-[#2E1810]',
          textSecondary: 'text-[#7D5344]',
          pillBg: 'bg-[#F3DFD5] hover:bg-[#EACFC1]',
          pillBorder: 'border-[#E2BAA9]',
          pillText: 'text-[#482216]',
          pillIcon: 'text-[#C86D51]',
          navBg: 'bg-[#F3DFD5]/80',
          navBorder: 'border-[#E2BAA9]',
          tabActiveBg: 'bg-[#C86D51] text-white font-bold',
          tabActiveIcon: 'text-white',
          tabInactiveText: 'text-[#7D5344] hover:text-[#2E1810]',
          tabInactiveIcon: 'text-[#7D5344]',
          serviceCardBg: 'bg-white',
          serviceCardHover: 'hover:border-[#C86D51]',
          servicePrice: 'text-[#C86D51]',
          serviceArrowBg: 'bg-[#F3DFD5] group-hover:bg-[#C86D51]',
          serviceArrowText: 'text-[#7D5344] group-hover:text-white',
          accentBg: 'bg-[#C86D51] hover:bg-[#B3593D]',
          accentText: 'text-white font-bold',
          outlineBtn: 'bg-white hover:bg-[#F8EFE9] text-[#482216] border border-[#ECCEC2]',
          badgeBg: 'bg-[#F3DFD5]',
          badgeText: 'text-[#7D5344] border border-[#E2BAA9]',
          logoTheme: 'dark',
          footerBorder: 'border-[#C86D51]/10',
          footerBadgeBg: 'bg-[#F3DFD5]',
          footerBadgeBorder: 'border-[#E2BAA9]',
          footerBadgeText: 'text-[#7D5344]',
          proBadge: 'bg-[#F3DFD5] text-[#7D5344] border border-[#E2BAA9]',
          proIcon: 'text-[#C86D51]',
          studioBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
          studioIcon: 'text-amber-800',
        };

      case 'modern_blue':
        return {
          id: 'modern_blue',
          name: 'Modern Blue Theme',
          isDark: false,
          pageBg: 'bg-[#EFF4F9]',
          cardBg: 'bg-[#FFFFFF]',
          cardBorder: 'border-[#CFDEED]',
          textPrimary: 'text-[#0F172A]',
          textSecondary: 'text-[#475569]',
          pillBg: 'bg-[#E2EDF8] hover:bg-[#D4E4F3]',
          pillBorder: 'border-[#C5D8EB]',
          pillText: 'text-[#1E293B]',
          pillIcon: 'text-[#0284C7]',
          navBg: 'bg-[#E2EDF8]/80',
          navBorder: 'border-[#C5D8EB]',
          tabActiveBg: 'bg-[#1E293B] text-white font-bold',
          tabActiveIcon: 'text-white',
          tabInactiveText: 'text-[#475569] hover:text-[#0F172A]',
          tabInactiveIcon: 'text-[#475569]',
          serviceCardBg: 'bg-white',
          serviceCardHover: 'hover:border-[#0284C7]',
          servicePrice: 'text-[#0284C7]',
          serviceArrowBg: 'bg-[#E2EDF8] group-hover:bg-[#1E293B]',
          serviceArrowText: 'text-[#475569] group-hover:text-white',
          accentBg: 'bg-[#1E293B] hover:bg-[#0F172A]',
          accentText: 'text-white font-bold',
          outlineBtn: 'bg-white hover:bg-[#EFF4F9] text-[#1E293B] border border-[#CFDEED]',
          badgeBg: 'bg-[#E2EDF8]',
          badgeText: 'text-[#0369A1] border border-[#BAE6FD]',
          logoTheme: 'dark',
          footerBorder: 'border-slate-900/10',
          footerBadgeBg: 'bg-[#E2EDF8]',
          footerBadgeBorder: 'border-[#C5D8EB]',
          footerBadgeText: 'text-[#475569]',
          proBadge: 'bg-[#E2EDF8] text-[#0369A1] border border-[#BAE6FD]',
          proIcon: 'text-[#0284C7]',
          studioBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
          studioIcon: 'text-amber-800',
        };

      case 'vintage':
        return {
          id: 'vintage',
          name: 'Vintage Theme',
          isDark: false,
          pageBg: 'bg-[#EBE6DB]',
          cardBg: 'bg-[#F5F2EB]',
          cardBorder: 'border-[#D9D1C1]',
          textPrimary: 'text-[#202720]',
          textSecondary: 'text-[#566358]',
          pillBg: 'bg-[#DFD8C8] hover:bg-[#D5CCB9]',
          pillBorder: 'border-[#C8BEA7]',
          pillText: 'text-[#2E3A2F]',
          pillIcon: 'text-[#3E4F3E]',
          navBg: 'bg-[#DFD8C8]/80',
          navBorder: 'border-[#C8BEA7]',
          tabActiveBg: 'bg-[#3E4F3E] text-[#F5F2EB] font-bold',
          tabActiveIcon: 'text-[#F5F2EB]',
          tabInactiveText: 'text-[#566358] hover:text-[#202720]',
          tabInactiveIcon: 'text-[#566358]',
          serviceCardBg: 'bg-[#FAF8F3]',
          serviceCardHover: 'hover:border-[#3E4F3E]',
          servicePrice: 'text-[#3E4F3E]',
          serviceArrowBg: 'bg-[#DFD8C8] group-hover:bg-[#3E4F3E]',
          serviceArrowText: 'text-[#566358] group-hover:text-white',
          accentBg: 'bg-[#3E4F3E] hover:bg-[#2E3D2E]',
          accentText: 'text-[#F5F2EB] font-bold',
          outlineBtn: 'bg-[#FAF8F3] hover:bg-[#DFD8C8] text-[#2E3A2F] border border-[#C8BEA7]',
          badgeBg: 'bg-[#DFD8C8]',
          badgeText: 'text-[#3E4F3E] border border-[#C8BEA7]',
          logoTheme: 'dark',
          footerBorder: 'border-[#3E4F3E]/10',
          footerBadgeBg: 'bg-[#DFD8C8]',
          footerBadgeBorder: 'border-[#C8BEA7]',
          footerBadgeText: 'text-[#566358]',
          proBadge: 'bg-[#DFD8C8] text-[#3E4F3E] border border-[#C8BEA7]',
          proIcon: 'text-[#3E4F3E]',
          studioBadge: 'bg-amber-100 text-amber-900 border border-amber-300',
          studioIcon: 'text-amber-800',
        };

      case 'sporty':
        return {
          id: 'sporty',
          name: 'Sporty Theme',
          isDark: true,
          pageBg: 'bg-[#080B12]',
          cardBg: 'bg-[#101624]',
          cardBorder: 'border-[#1E293B]',
          textPrimary: 'text-white',
          textSecondary: 'text-neutral-400',
          pillBg: 'bg-[#182033] hover:bg-[#202B44]',
          pillBorder: 'border-[#283552]',
          pillText: 'text-neutral-200',
          pillIcon: 'text-[#A3E635]',
          navBg: 'bg-[#151D2E]',
          navBorder: 'border-[#222E47]',
          tabActiveBg: 'bg-[#84CC16] text-black font-extrabold',
          tabActiveIcon: 'text-black',
          tabInactiveText: 'text-neutral-400 hover:text-[#A3E635]',
          tabInactiveIcon: 'text-neutral-400',
          serviceCardBg: 'bg-[#141C2C]',
          serviceCardHover: 'hover:border-[#84CC16]',
          servicePrice: 'text-[#A3E635]',
          serviceArrowBg: 'bg-[#1C273D] group-hover:bg-[#84CC16]',
          serviceArrowText: 'text-neutral-300 group-hover:text-black',
          accentBg: 'bg-[#84CC16] hover:bg-[#65A30D]',
          accentText: 'text-black font-extrabold',
          outlineBtn: 'bg-[#182033] hover:bg-[#202B44] text-white border border-[#283552]',
          badgeBg: 'bg-lime-950/60',
          badgeText: 'text-lime-400 border border-lime-500/30',
          logoTheme: 'light',
          footerBorder: 'border-white/5',
          footerBadgeBg: 'bg-[#182033]',
          footerBadgeBorder: 'border-[#283552]',
          footerBadgeText: 'text-neutral-400',
          proBadge: 'bg-lime-950/80 text-lime-400 border border-lime-500/40',
          proIcon: 'text-lime-400',
          studioBadge: 'bg-amber-950/80 text-amber-300 border border-amber-500/30',
          studioIcon: 'text-amber-400',
        };

      case 'light':
      default:
        return {
          id: 'light',
          name: 'Light Mode',
          isDark: false,
          pageBg: 'bg-[#F8FAFC]',
          cardBg: 'bg-white',
          cardBorder: 'border-slate-200',
          textPrimary: 'text-slate-900',
          textSecondary: 'text-slate-500',
          pillBg: 'bg-slate-100 hover:bg-slate-200/80',
          pillBorder: 'border-slate-200',
          pillText: 'text-slate-700',
          pillIcon: 'text-[#285844]',
          navBg: 'bg-white',
          navBorder: 'border-slate-200',
          tabActiveBg: 'bg-[#285844] text-white font-bold',
          tabActiveIcon: 'text-white',
          tabInactiveText: 'text-slate-500 hover:text-slate-900',
          tabInactiveIcon: 'text-slate-400',
          serviceCardBg: 'bg-white',
          serviceCardHover: 'hover:border-[#285844]',
          servicePrice: 'text-[#285844]',
          serviceArrowBg: 'bg-neutral-100 group-hover:bg-[#285844]',
          serviceArrowText: 'text-neutral-500 group-hover:text-white',
          accentBg: 'bg-[#285844] hover:bg-[#1E4334]',
          accentText: 'text-white font-bold',
          outlineBtn: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs',
          badgeBg: 'bg-[#D9E5DC]',
          badgeText: 'text-[#285844]',
          logoTheme: 'dark',
          footerBorder: 'border-black/5',
          footerBadgeBg: 'bg-black/[0.04]',
          footerBadgeBorder: 'border-black/[0.05]',
          footerBadgeText: 'text-neutral-500',
          proBadge: 'bg-[#D9E5DC]/80 text-[#1E4334] border border-[#285844]/20',
          proIcon: 'text-[#285844]',
          studioBadge: 'bg-amber-50 text-amber-900 border border-amber-200/80',
          studioIcon: 'text-amber-600',
        };
    }
  };

  const theme = getThemeStyles(barber.theme || 'forest');

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
          
          {/* Siaran Pengumuman Global dari SuperAdmin */}
          {Boolean(broadcastInfo?.isBroadcastActive && broadcastInfo?.broadcastMessage) && (
            <div className="bg-[#285844] text-white px-4 py-2 text-[11px] font-semibold flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0">📢</span>
                <span className="truncate">{broadcastInfo.broadcastMessage}</span>
              </div>
            </div>
          )}

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
                    <Logo variant="compact" size="sm" theme={theme.logoTheme} className={theme.textPrimary} />
                  </div>
                ) : (
                  <Link 
                    to="/" 
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    title="Ditenagai oleh E Cukur"
                  >
                    <Logo variant="compact" size="sm" theme={theme.logoTheme} className={theme.textPrimary} />
                  </Link>
                )}

                <button 
                  type="button"
                  onClick={handleShare}
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full ${theme.pillBg} ${theme.pillText} border ${theme.pillBorder} text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer`}
                  title="Bagikan Tautan Profil"
                >
                  <Share2 className={`w-3.5 h-3.5 ${theme.pillIcon}`} />
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

            {/* Name with Verified Badge (Hanya untuk Capster Pro & Barber Pro) */}
            <div className="flex flex-col items-center justify-center mt-2.5 text-center">
              <h1 className={`font-display font-black ${isPreview ? 'text-lg' : 'text-xl sm:text-2xl'} tracking-tight ${theme.textPrimary} flex items-center justify-center gap-1.5`}>
                <span>{barber.name}</span>
                {(barber?.plan === 'capster' || barber?.plan === 'barber') && (
                  <VerifiedBadge
                    className={isPreview ? 'w-4 h-4' : 'w-5 h-5'}
                    title={barber?.plan === 'barber' ? 'Official Studio Barbershop Terverifikasi' : 'Capster Pro Terverifikasi'}
                  />
                )}
              </h1>

              {/* Clean Professional Meta Line: Handle (@username) & Subtle Pro Pill */}
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`font-sans font-medium ${isPreview ? 'text-[11px]' : 'text-xs sm:text-[13px]'} ${theme.textSecondary} tracking-tight`}>
                  {barber.handle ? barber.handle.replace(/\.ecukur$/, '') : `@${barber.slug || barber.id}`}
                </span>

                {barber?.plan === 'barber' ? (
                  <>
                    <span className={`${theme.isDark ? 'text-neutral-600' : 'text-neutral-300'} text-[10px] select-none`}>•</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.studioBadge} shadow-3xs`} title="Official Studio Barbershop">
                      <Crown className={`w-2.5 h-2.5 ${theme.studioIcon} shrink-0`} />
                      <span>Official Studio</span>
                    </span>
                  </>
                ) : barber?.plan === 'capster' ? (
                  <>
                    <span className={`${theme.isDark ? 'text-neutral-600' : 'text-neutral-300'} text-[10px] select-none`}>•</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${theme.proBadge} shadow-3xs`} title="Capster Terverifikasi Pro">
                      <Scissors className={`w-2.5 h-2.5 ${theme.proIcon} shrink-0`} />
                      <span>Capster Profesional</span>
                    </span>
                  </>
                ) : null}
              </div>

              {/* Bio Description */}
              {barber.bio && (
                <p className={`${isPreview ? 'text-[10.5px] mt-2 max-w-[270px]' : 'text-xs sm:text-[13px] mt-2 max-w-sm'} text-center leading-relaxed ${theme.textSecondary} font-normal`}>
                  {barber.bio}
                </p>
              )}
            </div>

            {/* ─── 3. HORIZONTAL PILL ROW FOR LINKS & TAGS (AS SHOWN IN REFERENCE IMAGE) ─── */}
            <div className={`flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${isPreview ? 'mt-2.5 mb-2.5' : 'mt-3.5 mb-3.5'} w-full px-2`}>
              
              {/* Location Pill */}
              {(barber.locationCity || barber.address) && (
                <span className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1.5 ${theme.pillBg} ${theme.pillText} border ${theme.pillBorder} shadow-2xs transition-colors`}>
                  <MapPin className={`w-3.5 h-3.5 ${theme.pillIcon}`} />
                  <span>{barber.locationCity || barber.address.split(',')[0].trim()}</span>
                </span>
              )}

              {/* Instagram Pill */}
              {barber.instagram && (
                <a 
                  href={barber.instagram.startsWith('http') ? barber.instagram : `https://instagram.com/${barber.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${theme.pillBg} ${theme.pillText} border ${theme.pillBorder} shadow-2xs transition-all hover:scale-[1.02]`}
                >
                  <Globe className={`w-3.5 h-3.5 ${theme.pillIcon}`} />
                  <span>Instagram</span>
                </a>
              )}

              {/* TikTok Pill */}
              {barber.tiktok && (
                <a 
                  href={barber.tiktok.startsWith('http') ? barber.tiktok : `https://tiktok.com/@${barber.tiktok.replace('@', '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${theme.pillBg} ${theme.pillText} border ${theme.pillBorder} shadow-2xs transition-all hover:scale-[1.02]`}
                >
                  <ExternalLink className={`w-3.5 h-3.5 ${theme.pillIcon}`} />
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
                  className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${theme.pillBg} ${theme.pillText} border ${theme.pillBorder} shadow-2xs transition-all hover:scale-[1.02]`}
                >
                  <Globe className={`w-3.5 h-3.5 ${theme.pillIcon}`} />
                  <span>{lnk.title}</span>
                </a>
              ))}
            </div>

            {/* Profil Anda / Konsultasi Action Button (Sesuai Referensi Gambar) */}
            <div className="px-4 w-full max-w-xs sm:max-w-sm mt-0.5 mb-3.5 flex flex-col items-center">
              <button
                type="button"
                onClick={!isPreview ? handleConsultation : undefined}
                disabled={!isPreview && (!hasConsultationAccount || isOwnProfile)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl ${theme.outlineBtn} px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                title={
                  isPreview
                    ? 'Pratinjau Tombol Profil'
                    : !hasConsultationAccount
                      ? 'Konsultasi belum tersedia untuk profil ini.'
                      : isOwnProfile
                        ? 'Anda sedang melihat profil publik milik sendiri.'
                        : 'Konsultasi langsung dengan pemilik profil'
                }
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80" />
                <span>{isOwnProfile || isPreview ? 'Profil Anda' : 'Konsultasi'}</span>
              </button>
              {!isPreview && !hasConsultationAccount && (
                <p role="status" className="text-[11px] text-amber-700 mt-2">
                  Akun pemilik profil belum terhubung, jadi konsultasi belum dapat dimulai.
                </p>
              )}
            </div>
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
                  className={`flex items-center justify-between p-1 rounded-2xl border ${theme.navBg} ${theme.navBorder} shadow-xs`}
                >
                  {navTabs.map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <React.Fragment key={tab.id}>
                        {idx > 0 && (
                          <div className={`h-5 w-px ${theme.isDark ? 'bg-white/10' : 'bg-neutral-200/80'} shrink-0 mx-0.5`} />
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 py-2 sm:py-2.5 px-2 rounded-xl font-bold active:scale-95 transition-all duration-75 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                            isActive 
                              ? `${theme.tabActiveBg} shadow-xs` 
                              : `${theme.tabInactiveText}`
                          } ${isPreview ? 'text-[10px]' : 'text-xs'}`}
                        >
                          <Icon className={`${isPreview ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isActive ? theme.tabActiveIcon : theme.tabInactiveIcon}`} />
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
                  className={`w-full text-left ${isPreview ? 'p-2.5 rounded-xl' : 'p-4 rounded-2xl'} border transition-all cursor-pointer group flex items-center justify-between ${theme.serviceCardBg} ${theme.cardBorder} ${theme.serviceCardHover} shadow-2xs`}
                >
                  <div className="pr-2 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className={`font-display font-bold ${isPreview ? 'text-xs' : 'text-sm'} tracking-tight truncate ${theme.textPrimary}`}>{item.name}</h3>
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
                      <span className={`font-bold ${theme.servicePrice} ${isPreview ? 'text-[11px]' : 'text-xs'}`}>{formatRupiah(item.price)}</span>
                      <span className={theme.isDark ? 'text-neutral-600' : 'text-neutral-400'}>•</span>
                      <span className={`flex items-center gap-1 ${isPreview ? 'text-[9.5px]' : 'text-xs'} ${theme.textSecondary}`}>
                        <Clock className={`${isPreview ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> {item.duration || '45m'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-[10px] font-bold ${theme.servicePrice} hidden sm:inline-block`}>Pilih Jam</span>
                    <button
                      type="button"
                      className={`${isPreview ? 'p-1.5 rounded-lg' : 'p-2.5 rounded-xl'} ${theme.serviceArrowBg} transition-colors`}
                      title="Booking Layanan Ini"
                    >
                      <ChevronRight className={`${isPreview ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${theme.serviceArrowText}`} />
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
                  className={`block ${isPreview ? 'p-2.5 text-[11px]' : 'p-3.5 text-xs'} text-center font-bold border transition-all shadow-2xs ${theme.cardBg} ${theme.cardBorder} hover:border-[#285844] rounded-2xl`}
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
                  Status Capster
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {teamMembers.length} Capster
                </span>
              </div>

              {teamMembers.length === 0 ? (
                <div className={`${isPreview ? 'p-4 rounded-xl' : 'p-8 rounded-2xl'} text-center border border-dashed ${theme.cardBorder} text-neutral-400`}>
                  <Users className={`${isPreview ? 'w-5 h-5 mb-1.5' : 'w-8 h-8 mb-2'} mx-auto opacity-40`} />
                  <p className={`${isPreview ? 'text-[11px]' : 'text-xs'} font-semibold`}>Belum ada capster yang didaftarkan</p>
                  <p className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} opacity-75 mt-0.5`}>Owner belum menambahkan anggota tim capster di studio ini.</p>
                </div>
              ) : (
                teamMembers.map((member) => {
                  const status = getCapsterStatus(member);
                  const statusLabel = status === 'CUTTING'
                    ? 'Sedang cukur'
                    : status === 'OFF' ? 'Libur' : 'Free';
                  const isAvailable = status === 'AVAILABLE';
                  return (
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
                        </div>
                        <p className={`${isPreview ? 'text-[9.5px]' : 'text-[11px]'} truncate ${theme.textSecondary}`}>{member.specialty || 'Capster'}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                          status === 'CUTTING' ? 'text-amber-700' : status === 'OFF' ? 'text-neutral-400' : 'text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'CUTTING' ? 'bg-amber-500' : status === 'OFF' ? 'bg-neutral-400' : 'bg-emerald-500'}`} />
                          {statusLabel}
                        </span>
                        {member.schedule && (
                          <span className="text-[9px] text-neutral-400 font-mono block mt-0.5">{member.schedule}</span>
                        )}
                      </div>
                    </div>

                    {features.booking !== false && activeServices.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(activeServices[0], member.id)}
                        disabled={!isAvailable}
                        className={`${isPreview ? 'px-2 py-1 text-[10px] rounded-lg' : 'px-3 py-2 text-[11px] rounded-xl'} text-white font-bold shrink-0 transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${theme.accentBg}`}
                      >
                        {isAvailable ? 'Pilih' : statusLabel}
                      </button>
                    )}
                  </div>
                );
                })
              )}
            </motion.div>
          )}

          {/* TAB 2: FEED PORTOFOLIO / BEBAS POSTING */}
          {activeTab === 'lookbook' && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="space-y-3 transform-gpu will-change-transform">
              
              {/* Header Info */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${theme.accentBg} flex items-center justify-center ${theme.accentText} shadow-2xs`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className={`font-display font-bold text-xs ${theme.textPrimary} block leading-tight`}>
                      Feed & Galeri
                    </span>
                    <span className={`text-[10px] ${theme.textSecondary} opacity-75 font-mono`}>
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
                                  {(barber?.plan === 'capster' || barber?.plan === 'barber') && (
                                    <VerifiedBadge className="w-3.5 h-3.5 shrink-0" title="Akun Terverifikasi" />
                                  )}
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
                  { amount: 5000, label: 'Kopi Tubruk', price: '5K', active: true, emoji: '☕' },
                  { amount: 10000, label: 'Es Kopi Susu', price: '10K', active: true, emoji: '🥤' },
                  { amount: 20000, label: 'Roti & Kopi', price: '20K', active: true, emoji: '🥐' },
                  { amount: 35000, label: 'Paket Siang', price: '35K', active: true, emoji: '🍱' },
                  { amount: 50000, label: 'Traktir Sultan', price: '50K', active: true, emoji: '👑' },
                  { amount: 100000, label: 'Super Fan', price: '100K', active: false, emoji: '🔥' },
                ])
                .filter(p => p.active !== false)
                .map((preset) => (
                  <button
                    key={preset.id || preset.amount}
                    type="button"
                    onClick={() => { 
                      setTipAmount(preset.amount); 
                      setSelectedCoffeeLabel(preset.label || 'Kopi');
                      setIsTippingOpen(true); 
                    }}
                    className={`${isPreview ? 'p-1.5 rounded-lg' : 'p-3 rounded-xl'} border text-center transition-all cursor-pointer ${
                      tipAmount === preset.amount 
                        ? `${theme.tabActiveBg} scale-[1.02] shadow-xs` 
                        : `${theme.serviceCardBg} ${theme.cardBorder} hover:opacity-80`
                    }`}
                  >
                    <span className="text-sm block mb-0.5">{preset.emoji || '☕'}</span>
                    <p className={`font-display font-bold ${isPreview ? 'text-xs' : 'text-base'} ${tipAmount === preset.amount ? '' : 'text-amber-600'}`}>
                      {preset.price || `${Math.round((preset.amount || 0) / 1000)}K`}
                    </p>
                    <p className={`text-[8.5px] sm:text-[10px] uppercase font-semibold truncate ${tipAmount === preset.amount ? 'opacity-90' : theme.textSecondary}`}>{preset.label}</p>
                  </button>
                ))}
              </div>

              <button 
                type="button"
                onClick={() => setIsTippingOpen(true)}
                className={`w-full ${isPreview ? 'py-2 text-[11px] rounded-lg' : 'py-3.5 text-xs rounded-xl'} ${theme.accentText} font-bold shadow-sm transition-transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer ${theme.accentBg}`}
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
                <span className={`font-display font-bold ${isPreview ? 'text-[11px]' : 'text-xs'} ${theme.textPrimary} block mb-0.5`}>📍 Alamat Studio:</span>
                <p className={`${isPreview ? 'text-[10px]' : 'text-xs'} leading-relaxed ${theme.textSecondary}`}>
                  {barber.address || 'Alamat belum diatur oleh barber.'}
                </p>
                {barber.mapsUrl && (
                  <a 
                    href={barber.mapsUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`mt-2 inline-flex items-center gap-1 ${isPreview ? 'text-[10px]' : 'text-xs'} ${theme.servicePrice} font-bold hover:underline`}
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

        {/* ─── Decorative Aesthetic Accent (Sesuai Referensi Gambar untuk Tema Premium & Pink) ─── */}
        {theme.hasGoldWave && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 overflow-hidden opacity-35 select-none z-0">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,85 C140,140 330,10 500,70 L500,150 L0,150 Z" fill="url(#premiumGoldGrad)" />
              <defs>
                <linearGradient id="premiumGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#AA7C11" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
        {theme.id === 'pink' && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 overflow-hidden opacity-30 select-none z-0">
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,70 C160,135 340,15 500,70 L500,150 L0,150 Z" fill="#F472B6" />
            </svg>
          </div>
        )}

        {/* ─── Footer (Pure Public Link in Bio - Responsive & Clean on Mobile) ─── */}
        <footer className={`w-full text-center ${isPreview ? 'py-2.5 px-3' : 'pt-6 pb-8 px-4'} ${theme.footerBorder} shrink-0 select-none mt-auto relative z-10`}>
          <div className="flex flex-col items-center justify-center gap-1.5 text-center">
            <Link 
              to="/"
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full ${theme.footerBadgeBg} border ${theme.footerBadgeBorder} text-[10.5px] font-medium tracking-tight transition-all active:scale-95 shadow-2xs`}
              title="Ditenagai oleh E Cukur"
            >
              <span className={theme.footerBadgeText}>
                Ditenagai oleh
              </span>
              <Logo 
                variant="compact" 
                size="xs" 
                theme={theme.logoTheme}
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
                    {bookingStep === 'success' ? 'Tiket Reservasi Berhasil' : bookingStep === 'qris' ? 'Pembayaran QRIS Dinamis' : 'Pilih Jadwal & Jam Cukur'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {bookingStep === 'success' ? 'Tunjukkan tiket ini saat tiba di lokasi' : bookingStep === 'qris' ? 'Nominal otomatis terisi saat di-scan' : `Dengan ${barber.name}`}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => { setIsBookingOpen(false); setBookingSuccessData(null); setBookingQrisData(null); setBookingStep('form'); }}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── STEP 1: QRIS PAYMENT SCREEN ── */}
              {bookingStep === 'qris' && bookingQrisData ? (
                <div className="space-y-4 text-center py-1">
                  
                  {/* Dynamic QRIS Image Container */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-3">
                    <div className="w-44 h-44 mx-auto rounded-2xl bg-white p-2.5 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-xs">
                      <img 
                        src={bookingQrisData.qrisImageUrl} 
                        alt="QRIS Dinamis E-CUKUR" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Nominal Banner with Copy */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                      <span className="text-[10px] font-semibold text-emerald-800 block">
                        Total Nominal Otomatis (Termasuk 3 Digit Kode Unik):
                      </span>
                      <div className="flex items-center justify-center gap-2 mt-0.5">
                        <span className="font-display font-extrabold text-lg text-[#285844] font-mono">
                          Rp {bookingQrisData.totalAmount.toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(bookingQrisData.totalAmount));
                            setCopiedBookingAmount(true);
                            setTimeout(() => setCopiedBookingAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                        >
                          {copiedBookingAmount ? <Check className="w-3 h-3" /> : 'Salin'}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-600 leading-relaxed px-1">
                      Buka aplikasi <strong>BCA, Mandiri, GoPay, OVO, ShopeePay, atau DANA</strong> lalu scan barcode di atas. Nominal pembayaran akan langsung terisi otomatis!
                    </p>
                  </div>

                  {/* Realtime waiting indicator */}
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-neutral-500 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Menunggu verifikasi pembayaran otomatis...</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setBookingStep('form')}
                      className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Batalkan / Ubah Jadwal
                    </button>
                  </div>
                </div>
              ) : bookingStep === 'success' && bookingSuccessData ? (
                /* ── STEP 2: BOOKING SUCCESS TICKET ── */
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
                      Data booking kamu telah terverifikasi dan masuk ke sistem barber.
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
                    {bookingSuccessData.capsterName && (
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Capster:</span>
                        <strong className="text-[#171717]">{bookingSuccessData.capsterName}</strong>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Waktu Kedatangan:</span>
                      <strong className="text-[#285844]">{bookingSuccessData.date} • {bookingSuccessData.time} WIB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Metode:</span>
                      <strong className="text-emerald-700 font-semibold">{bookingSuccessData.paymentMethod || 'QRIS'}</strong>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 pt-2">
                      <span className="text-neutral-500">Total Tarif:</span>
                      <strong className="font-mono text-sm text-[#285844]">{formatRupiah(bookingSuccessData.price)}</strong>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <Link
                      to={`/tiket/${bookingSuccessData.id}#t=${encodeURIComponent(bookingSuccessData.ticketToken || '')}`}
                      className="w-full py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-center"
                    >
                      <Ticket className="w-4 h-4 text-emerald-300" />
                      <span>Buka & Simpan E-Tiket Digital</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        const shortId = `#${String(bookingSuccessData.id).slice(-6).toUpperCase()}`;
                        const ticketUrl = `${window.location.origin}/tiket/${bookingSuccessData.id}#t=${encodeURIComponent(bookingSuccessData.ticketToken || '')}`;
                        const capsterLine = bookingSuccessData.capsterName ? `\nCapster: ${bookingSuccessData.capsterName}` : '';
                        const text = `💈 *TIKET RESERVASI E-CUKUR*\nNo. Tiket: ${shortId}\nJadwal: ${bookingSuccessData.date} • ${bookingSuccessData.time} WIB\nLayanan: ${bookingSuccessData.serviceName}${capsterLine}\nBuka Tiket: ${ticketUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Kirim Ringkasan ke WhatsApp Saya</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsBookingOpen(false); setBookingSuccessData(null); setBookingQrisData(null); setBookingStep('form'); }}
                      className="w-full py-2.5 text-neutral-500 hover:text-neutral-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                /* ── STEP 3: BOOKING FORM ── */
                <form onSubmit={handleSubmitBooking} className="space-y-4 text-left">
                  
                  {/* Select service dropdown / pill */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Layanan Dipilih:{isServiceLocked && <span className="ml-1 text-[10px] text-emerald-700 font-bold">(Terkunci)</span>}</label>
                    <select
                      value={selectedService?.id || activeServices[0].id}
                      onChange={(e) => {
                        if (isServiceLocked) return;
                        const s = activeServices.find(srv => srv.id === e.target.value);
                        setSelectedService(s || activeServices[0]);
                      }}
                      disabled={isServiceLocked}
                      className={`w-full text-xs font-semibold p-3 border rounded-xl outline-none text-[#171717] ${isServiceLocked ? 'bg-neutral-100 border-neutral-200 cursor-not-allowed opacity-70' : 'bg-neutral-50 border-neutral-300 cursor-pointer focus:border-[#285844]'}`}
                    >
                      {activeServices.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name} — {formatRupiah(srv.price)} ({srv.duration})
                        </option>
                      ))}
                    </select>
                  </div>

                  {teamBookingEnabled && (
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Pilih Capster:{isCapsterLocked && <span className="ml-1 text-[10px] text-emerald-700 font-bold">(Terkunci)</span>}</label>
                      <select
                        value={selectedCapsterId}
                        onChange={(e) => {
                          if (isCapsterLocked) return;
                          setSelectedCapsterId(e.target.value);
                        }}
                        disabled={isCapsterLocked}
                        className={`w-full text-xs font-semibold p-3 border rounded-xl outline-none text-[#171717] ${isCapsterLocked ? 'bg-neutral-100 border-neutral-200 cursor-not-allowed opacity-70' : 'bg-neutral-50 border-neutral-300 cursor-pointer focus:border-[#285844]'}`}
                      >
                        <option value="">Pilih capster yang sedang free</option>
                        {teamMembers.map((member) => {
                          const status = getCapsterStatus(member);
                          const label = status === 'OFF' ? '🏖️ Libur Hari Ini' : status === 'CUTTING' ? '✂️ Sedang Cukur' : '🟢 Free';
                          return (
                            <option key={member.id} value={member.id} disabled={status !== 'AVAILABLE'}>
                              {member.name} — {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Pick Date */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-neutral-700">Pilih Tanggal:</label>
                      <span className="text-[10px] text-neutral-500 font-medium">{formatDateKey(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                    <div className="rounded-xl border border-neutral-200 bg-white p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}
                          disabled={calendarMonth <= todayIso.slice(0, 7)}
                          aria-label="Bulan sebelumnya"
                          className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold capitalize text-neutral-800">{calendarMonthLabel}</span>
                        <button
                          type="button"
                          onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}
                          aria-label="Bulan berikutnya"
                          className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 mb-1">
                        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                          <span key={day} className="py-1 text-center text-[9px] font-semibold text-neutral-400">{day}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1">
                        {calendarDays.map((dateKey, index) => {
                          const isPast = dateKey && dateKey < todayIso;
                          return dateKey ? (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() => setSelectedDate(dateKey)}
                              disabled={isPast}
                              aria-pressed={selectedDate === dateKey}
                              className={`mx-auto h-8 w-8 rounded-full text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:text-neutral-300 ${
                                selectedDate === dateKey
                                  ? 'bg-[#285844] text-white'
                                  : dateKey === todayIso
                                  ? 'border border-[#285844] text-[#285844]'
                                  : 'text-neutral-700 hover:bg-neutral-100'
                              }`}
                            >
                              {Number(dateKey.slice(-2))}
                            </button>
                          ) : (
                            <span key={`empty-${index}`} className="h-8" />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Pick Time */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-neutral-700">Pilih Jam Kedatangan:</label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {teamBookingEnabled && !selectedCapster
                          ? 'Pilih capster'
                          : availabilityReady && availabilityDate === selectedDate ? 'WIB' : 'Memuat...'}
                      </span>
                    </div>
                    {availabilityError && (
                      <p role="alert" className="mb-2 text-[10px] text-red-700">{availabilityError}</p>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map((slot) => {
                        const available = isSlotAvailable(slot);
                        const isBreak = isSlotInBreakTime(slot, 15, operatingHours, selectedDate);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            disabled={!available}
                            title={isBreak ? 'Waktu Istirahat Studio' : !available ? 'Slot tidak tersedia' : `Pilih jam ${slot} WIB`}
                            className={`py-2 px-1 rounded-xl border text-center text-xs font-mono font-semibold transition-all relative ${
                              !available
                                ? 'border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed line-through opacity-70'
                                : selectedTime === slot
                                ? 'border-[#285844] bg-[#285844] text-white shadow-xs' 
                                : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700'
                            }`}
                          >
                            <span>{slot}</span>
                            {isBreak && <span className="no-underline ml-1 text-[10px]">☕</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Estimasi Durasi Pengerjaan & Selesai */}
                    {selectedTime && isSlotAvailable(selectedTime) && (
                      <div className="mt-2.5 p-2.5 bg-[#D9E5DC]/30 border border-[#285844]/20 rounded-xl flex items-center justify-between text-xs text-[#285844]">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Estimasi Pengerjaan:</span>
                        </div>
                        <span className="font-mono font-bold">
                          {selectedTime} – {minutesToTime(timeToMinutes(selectedTime) + parseServiceDurationMinutes(selectedService || activeServices[0]))} WIB ({formatDurationLabel(parseServiceDurationMinutes(selectedService || activeServices[0]))})
                        </span>
                      </div>
                    )}

                    <p className="text-[10px] text-neutral-400 mt-1.5 leading-relaxed">
                      * Jam yang dicoret telah terlewat, masuk jam istirahat (☕), ada antrean lain, atau melebihi jam tutup ({operatingHours?.close || '21:00'} WIB).
                    </p>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-neutral-700">Nomor WhatsApp Aktif *</label>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {customerPhone.length}/13 digit
                        </span>
                      </div>
                      <input 
                        type="tel"
                        required
                        maxLength={13}
                        value={customerPhone}
                        onChange={handlePhoneChange}
                        placeholder="081234567890"
                        className={`w-full text-xs font-mono p-3 bg-neutral-50 border rounded-xl outline-none transition-colors ${
                          customerPhone && !customerPhone.startsWith('08')
                            ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                            : 'border-neutral-300 focus:border-[#285844]'
                        }`}
                      />
                      {customerPhone && !customerPhone.startsWith('08') && (
                        <p className="text-[11px] text-red-600 mt-1">Nomor WhatsApp wajib diawali 08.</p>
                      )}
                      {customerPhone && customerPhone.startsWith('08') && customerPhone.length < 10 && (
                        <p className="text-[11px] text-amber-600 mt-1">Nomor terlalu pendek (minimal 10 digit, maks 13 digit).</p>
                      )}
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

                  {/* Pembayaran 100% Cashless */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-950">100% Cashless via QRIS</span>
                      </div>
                      <p className="text-[10px] text-emerald-800 leading-tight">
                        BCA, Mandiri, GoPay, DANA, OVO, ShopeePay (Nominal terkunci otomatis)
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#285844] bg-white px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
                      Auto-Verify
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || (isSupabaseConfigured && (!availabilityReady || !isSlotAvailable(selectedTime)))}
                    className="w-full py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting 
                      ? 'Memproses Reservasi...' 
                      : `Lanjut Bayar QRIS (${formatRupiah(selectedService?.price || activeServices[0].price)})`}
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
                  {tipQrisLoading ? (
                    <p className="rounded-xl bg-neutral-50 p-4 text-center text-xs text-neutral-500" aria-live="polite">
                      Menyiapkan tagihan QRIS...
                    </p>
                  ) : tipQrisError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-700" role="alert">
                      {tipQrisError}
                    </p>
                  ) : tipQrisData ? (
                  <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center space-y-2.5">
                    <div className="w-36 h-36 mx-auto rounded-xl bg-white p-2 border border-neutral-200 flex items-center justify-center overflow-hidden shadow-2xs">
                      <img 
                        src={tipQrisData.qrisImageUrl || getDynamicQrisImageUrl(tipQrisData.totalAmount)}
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
                          Rp {tipQrisData.totalAmount.toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(String(tipQrisData.totalAmount));
                            setCopiedTipAmount(true);
                            setTimeout(() => setCopiedTipAmount(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-bold cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          {copiedTipAmount ? '✓ Disalin' : 'Salin'}
                        </button>
                      </div>
                      <span className="text-[9px] text-amber-700 block mt-0.5">
                        *Kode unik acak: +Rp {tipQrisData.uniqueCode} agar diverifikasi otomatis
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

                  </div>
                  ) : null}

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
                    onClick={() => { setIsTippingOpen(false); setTipPaid(false); }}
                    className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Tutup
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
                      {(barber?.plan === 'capster' || barber?.plan === 'barber') && (
                        <VerifiedBadge className="w-3.5 h-3.5 shrink-0" title="Akun Terverifikasi" />
                      )}
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

      {/* ─── FLOATING ACTIVE TICKET PILL ─── */}
      {activeTicket && !isBookingOpen && !isPreview && (
        <aside aria-label="Tiket Booking Aktif" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 pointer-events-auto">
          <Link
            to={`/tiket/${activeTicket.id}#t=${encodeURIComponent(activeTicket.ticketToken || '')}`}
            className="w-full bg-[#285844] hover:bg-[#1E4334] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-white/20 backdrop-blur-md transition-all active:scale-98 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-emerald-300">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[10px] uppercase font-bold text-emerald-200">Tiket Reservasi Anda Aktif</div>
                <div className="text-xs font-bold text-white truncate">
                  {activeTicket.date} • {activeTicket.time} WIB
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white/20 group-hover:bg-white/30 rounded-lg text-[10px] font-bold text-white shrink-0">
              Buka Tiket →
            </span>
          </Link>
        </aside>
      )}

    </div>
  );
}
