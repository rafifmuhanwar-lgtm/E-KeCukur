import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  User, 
  MapPin, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Sparkles, 
  BarChart2, 
  Palette, 
  QrCode, 
  Share2, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Globe, 
  ArrowUpRight,
  X,
  Smartphone,
  Calendar,
  MessageCircle,
  Camera,
  UploadCloud,
  RefreshCw,
  Sliders,
  Users,
  Coffee,
  ArrowDownToLine,
  Landmark,
  Save,
  Wallet,
  TrendingUp,
  Receipt,
  AlertCircle,
  Crown,
  Download,
  Send
} from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';
import BarberBioLink from '../customer/BarberBioLink';
import { compressImage } from '../../lib/imageUploader';
import { getAppDomain } from '../../lib/domain';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const computeWeeklyChartData = (bookingsList) => {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = Date.now();
  const last7 = [];
  const list = Array.isArray(bookingsList) ? bookingsList : [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayName = days[d.getDay()];
    const isoDate = d.toISOString().split('T')[0];
    const count = list.filter(b => {
      if (!b) return false;
      let bDate = '';
      if (typeof b.createdAt === 'string') {
        bDate = b.createdAt.split('T')[0];
      } else if (typeof b.date === 'string') {
        bDate = b.date;
      }
      return bDate === isoDate;
    }).length;
    last7.push({ day: dayName, count });
  }
  const maxVal = Math.max(...last7.map(x => x.count), 5);
  return { last7, maxVal };
};

export default function BarberDashboard() {
  const appDomain = getAppDomain();
  const navigate = useNavigate();

  // Zustand state
  const barbers = useStore((state) => state.barbers);
  const setActiveBarberId = useStore((state) => state.setActiveBarberId);
  const updateBarber = useStore((state) => state.updateBarber);
  const addBarberService = useStore((state) => state.addBarberService);
  const updateBarberService = useStore((state) => state.updateBarberService);
  const deleteBarberService = useStore((state) => state.deleteBarberService);
  const toggleBarberService = useStore((state) => state.toggleBarberService);
  const addBarberLookbook = useStore((state) => state.addBarberLookbook);
  const deleteBarberLookbook = useStore((state) => state.deleteBarberLookbook);
  const addBarberCustomLink = useStore((state) => state.addBarberCustomLink);
  const deleteBarberCustomLink = useStore((state) => state.deleteBarberCustomLink);
  const toggleBarberCustomLink = useStore((state) => state.toggleBarberCustomLink);
  const addBarberTeamMember = useStore((state) => state.addBarberTeamMember);
  const deleteBarberTeamMember = useStore((state) => state.deleteBarberTeamMember);
  const updateBarberTippingConfig = useStore((state) => state.updateBarberTippingConfig);
  const requestBarberWithdrawal = useStore((state) => state.requestBarberWithdrawal);
  const bookings = useStore((state) => state.bookings);
  const updateBookingStatus = useStore((state) => state.updateBookingStatus);
  const uploadBarberPhoto = useStore((state) => state.uploadBarberPhoto);
  const uploadBarberPortfolioPhoto = useStore((state) => state.uploadBarberPortfolioPhoto);
  const uploadBarberBanner = useStore((state) => state.uploadBarberBanner);
  const fetchBookingsFromSupabase = useStore((state) => state.fetchBookingsFromSupabase);
  const subscribeToBookings = useStore((state) => state.subscribeToBookings);
  const signOutUser = useStore((state) => state.signOutUser);
  const activeBarber = useStore((state) => state.activeBarber);
  const authUser = useStore((state) => state.authUser);
  const isLoading = useStore((state) => state.isLoading);
  const matchActiveBarber = useStore((state) => state.matchActiveBarber);
  const [unreadChatSummary, setUnreadChatSummary] = useState({ userId: '', count: 0 });
  const unreadChatCount = unreadChatSummary.userId === authUser?.id ? unreadChatSummary.count : 0;

  // File upload state & ref
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Banner Header upload state & ref
  const bannerFileInputRef = useRef(null);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);
  const [pendingBannerPreview, setPendingBannerPreview] = useState(null);
  const [pendingBannerFile, setPendingBannerFile] = useState(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerStats, setBannerStats] = useState(null);

  const [searchParams] = useSearchParams();
  const querySlug = (searchParams.get('slug') || searchParams.get('id') || '').toLowerCase().trim();
  const queryTab = searchParams.get('tab');

  // Auth Protection: Jika belum login, redirect ke /login
  useEffect(() => {
    if (!isLoading && !authUser && isSupabaseConfigured) {
      navigate('/login');
      return;
    }
    if (authUser) {
      matchActiveBarber(authUser);
    }
  }, [authUser, isLoading, matchActiveBarber, navigate]);

  // Match barber by query parameter (e.g. ?slug=ojean)
  useEffect(() => {
    if (querySlug && barbers.length > 0) {
      const match = barbers.find(b => 
        (b.slug && b.slug.toLowerCase() === querySlug) || 
        (b.id && b.id.toLowerCase() === querySlug) ||
        (b.name && b.name.toLowerCase() === querySlug)
      );
      if (match && (!activeBarber || activeBarber.id !== match.id)) {
        setActiveBarberId(match.id);
      }
    }
  }, [querySlug, barbers, activeBarber, setActiveBarberId]);

  // Active Barber Data: Utamakan query slug -> profil user yang sedang login -> activeBarber
  const queryMatchedBarber = querySlug ? barbers.find((b) => 
    (b.slug && b.slug.toLowerCase() === querySlug) || 
    (b.id && b.id.toLowerCase() === querySlug) ||
    (b.name && b.name.toLowerCase() === querySlug)
  ) : null;

  const userMatchedBarber = authUser ? barbers.find((b) => 
    b.user_id === authUser.id || b.email?.toLowerCase() === authUser.email?.toLowerCase()
  ) : null;

  const barber = queryMatchedBarber || userMatchedBarber || activeBarber;

  useEffect(() => {
    if (!isSupabaseConfigured || !authUser?.id) {
      return undefined;
    }

    let active = true;
    const refreshUnreadChatCount = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('barber_unread_count')
        .eq('barber_id', authUser.id);

      if (error) {
        console.error('Unable to load unread consultation count:', error);
        return;
      }

      if (active) {
        setUnreadChatSummary({
          userId: authUser.id,
          count: (data || []).reduce(
            (total, conversation) => total + (Number(conversation.barber_unread_count) || 0),
            0
          )
        });
      }
    };

    refreshUnreadChatCount();
    const channel = supabase
      .channel(`dashboard-chat-unread:${authUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `barber_id=eq.${authUser.id}`
      }, refreshUnreadChatCount)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Consultation unread Realtime subscription failed: ${status}`);
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  // Sync Supabase Bookings on mount & setup realtime subscription
  useEffect(() => {
    if (typeof fetchBookingsFromSupabase === 'function') {
      fetchBookingsFromSupabase();
    }
    if (typeof subscribeToBookings === 'function') {
      const unsubscribe = subscribeToBookings();
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [fetchBookingsFromSupabase, subscribeToBookings]);

  // Filter bookings for this barber (memoized to avoid unnecessary re-filtering)
  const barberBookings = React.useMemo(() => {
    if (!barber) return [];
    const barberId = String(barber.id || '').toLowerCase().trim();
    const barberSlug = String(barber.slug || '').toLowerCase().trim();
    const barberName = String(barber.name || '').toLowerCase().trim();

    return bookings.filter((b) => {
      const bBarberId = String(b.barberId || '').toLowerCase().trim();
      const bBarberName = String(b.barberName || '').toLowerCase().trim();

      if (barberId && bBarberId === barberId) return true;
      if (barberSlug && (bBarberId === barberSlug || bBarberName === barberSlug)) return true;
      if (barberName && bBarberName === barberName) return true;
      return false;
    });
  }, [barber, bookings]);

  const weeklyChartData = React.useMemo(() => computeWeeklyChartData(barberBookings), [barberBookings]);

  // Finansial Terpadu (Layanan Booking + Tip Kopi)
  const paidBookings = React.useMemo(() => {
    return barberBookings.filter(b => 
      b.paymentStatus === 'PAID' || 
      b.status === 'Terkonfirmasi' || 
      b.status === 'Selesai' || 
      b.status === 'CONFIRMED' || 
      b.status === 'COMPLETED'
    );
  }, [barberBookings]);

  const totalBookingRevenue = React.useMemo(() => {
    return paidBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  }, [paidBookings]);

  const tipsList = React.useMemo(() => {
    return Array.isArray(barber?.tipsHistory) ? barber.tipsHistory : [];
  }, [barber]);

  const totalTipRevenue = React.useMemo(() => {
    return tipsList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [tipsList]);

  const totalCombinedRevenue = totalBookingRevenue + totalTipRevenue;

  const totalWithdrawn = React.useMemo(() => {
    return (barber?.withdrawalsHistory || []).reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  }, [barber]);

  const availableBalance = Math.max(0, totalCombinedRevenue - totalWithdrawn);

  // Gabungan Aktivitas Transaksi Masuk Terkini (Realtime Feed)
  const combinedRecentTransactions = React.useMemo(() => {
    const list = [];
    paidBookings.forEach(b => {
      list.push({
        id: b.id,
        type: 'BOOKING',
        title: `Layanan: ${b.serviceName || 'Layanan Barbershop'}`,
        customerName: b.customerName || 'Pelanggan',
        amount: Number(b.price) || 0,
        date: b.createdAt || b.date,
        badge: 'Reservasi'
      });
    });
    tipsList.forEach(t => {
      list.push({
        id: t.id,
        type: 'TIP',
        title: `Tip Kopi: ${t.coffeeLabel || 'Traktir Kopi'}`,
        customerName: t.customerName || 'Pelanggan Setia',
        amount: Number(t.amount) || 0,
        date: t.date,
        badge: 'Tip Kopi'
      });
    });
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 15);
  }, [paidBookings, tipsList]);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState(queryTab || 'profile');
  
  // Mobile drawer toggle for phone preview
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Toast notification
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2400);
  };

  // Modals state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45m');
  const [newServiceTag, setNewServiceTag] = useState('Best Seller');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  const [profileStats, setProfileStats] = useState(null);

  // Lookbook / Portofolio modal state
  const [isAddLookbookOpen, setIsAddLookbookOpen] = useState(false);
  const [newLookbookTitle, setNewLookbookTitle] = useState('');
  const [newLookbookImg, setNewLookbookImg] = useState('');
  const [newLookbookTag, setNewLookbookTag] = useState('Daily Vibe');
  const [lookbookFile, setLookbookFile] = useState(null);
  const [isCompressingLookbook, setIsCompressingLookbook] = useState(false);
  const [lookbookCompressionStats, setLookbookCompressionStats] = useState(null);
  const [isDraggingLookbook, setIsDraggingLookbook] = useState(false);
  const lookbookFileInputRef = useRef(null);

  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Team Member modal state
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSpecialty, setNewTeamSpecialty] = useState('');
  const [newTeamSchedule, setNewTeamSchedule] = useState('Setiap Hari');
  const [newTeamPhoto, setNewTeamPhoto] = useState('');
  const [teamPhotoStats, setTeamPhotoStats] = useState(null);
  const [isCompressingTeamPhoto, setIsCompressingTeamPhoto] = useState(false);
  const teamPhotoInputRef = useRef(null);

  // Mode & Feature Toggle helpers
  const handleToggleFeature = (featureKey) => {
    // Validasi hak akses paket langganan
    if (featureKey === 'team' && !isBarberPlan) {
      setIsUpgradeModalOpen(true);
      showToast('🔒 Fitur Tim Capster eksklusif untuk Paket Barber Studio (Rp 99K/bln)');
      return;
    }
    if (featureKey === 'location' && !isBarberPlan) {
      setIsUpgradeModalOpen(true);
      showToast('🔒 Fitur Lokasi Studio & Maps eksklusif untuk Paket Barber Studio (Rp 99K/bln)');
      return;
    }

    const currentFeatures = barber?.features || {
      booking: true,
      services: true,
      lookbook: true,
      team: false,
      location: true,
      tipping: true,
    };
    const updated = {
      ...currentFeatures,
      [featureKey]: !currentFeatures[featureKey]
    };
    updateBarber(barber.id, { features: updated });
    showToast(`Fitur ${featureKey} ${updated[featureKey] ? 'diaktifkan' : 'dinonaktifkan'}`);
  };

  const handleApplyPreset = (type) => {
    if (type === 'barbershop' && !isBarberPlan) {
      setIsUpgradeModalOpen(true);
      showToast('Mode Barbershop & Studio eksklusif untuk Paket Barber (Rp 99.000/bln)');
      return;
    }
    if (type === 'barber') {
      updateBarber(barber.id, {
        profileType: 'barber',
        features: {
          booking: true,
          services: true,
          lookbook: true,
          team: false,
          location: true,
          tipping: true,
        }
      });
      showToast('Mode Capster Mandiri diaktifkan');
    } else {
      updateBarber(barber.id, {
        profileType: 'barbershop',
        features: {
          booking: true,
          services: true,
          lookbook: true,
          team: true,
          location: true,
          tipping: true,
        }
      });
      showToast('Mode Barbershop & Studio diaktifkan');
    }
  };

  // Bio Link full URL
  const publicUrl = `${window.location.origin}/${barber?.slug || barber?.id || ''}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      showToast('Link bio berhasil disalin ke clipboard!');
    }
  };

  // Profile Field updates
  const handleProfileFieldChange = (field, value) => {
    updateBarber(barber.id, { [field]: value });
  };

  // Local state for smooth slug / username editing (prevents UUID snapback when backspacing)
  const [slugInput, setSlugInput] = useState(barber?.slug || '');
  const [prevBarberSlug, setPrevBarberSlug] = useState(barber?.slug);
  const [slugStatus, setSlugStatus] = useState({ valid: true, msg: '' });

  if (barber?.slug !== undefined && barber?.slug !== prevBarberSlug) {
    setPrevBarberSlug(barber?.slug);
    setSlugInput(barber?.slug || '');
  }

  const handleSlugChange = (raw) => {
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    setSlugInput(cleaned);

    if (cleaned.length < 3 && cleaned.length > 0) {
      setSlugStatus({ valid: false, msg: 'Minimal 3 karakter' });
    } else {
      setSlugStatus({ valid: true, msg: '' });
      handleProfileFieldChange('slug', cleaned);
    }
  };

  const handleSlugBlur = () => {
    let finalSlug = slugInput.trim().replace(/^-+|-+$/g, '');
    if (!finalSlug || finalSlug.length < 2) {
      finalSlug = (barber.name || 'barber').toLowerCase().replace(/[^a-z0-9]/g, '') || 'barber';
    }
    setSlugInput(finalSlug);
    setSlugStatus({ valid: true, msg: '' });
    if (finalSlug !== barber.slug) {
      handleProfileFieldChange('slug', finalSlug);
      showToast(`Username disimpan: ${appDomain}/${finalSlug}`);
    }
  };

  // ─── TIPPING CONFIG & SIMULATION HANDLERS ───
  const tippingConfig = barber?.tippingConfig || {
    title: 'Traktir Kopi Capster',
    message: 'Puas dengan hasil potongan? Beri sedikit apresiasi agar capster favoritmu makin semangat berkarya!',
    qrisImage: '',
    bankName: 'BCA / QRIS',
    accountNumber: '',
    accountHolder: '',
    thankYouMessage: 'Terima kasih banyak atas tip kopinya! Sehat dan sukses selalu bro 🙏',
    presets: [
      { id: 'p1', amount: 5000, label: 'Kopi Tubruk', price: '5K', active: true, emoji: '☕' },
      { id: 'p2', amount: 10000, label: 'Es Kopi Susu', price: '10K', active: true, emoji: '🥤' },
      { id: 'p3', amount: 20000, label: 'Roti & Kopi', price: '20K', active: true, emoji: '🥐' },
      { id: 'p4', amount: 35000, label: 'Paket Makan Siang', price: '35K', active: true, emoji: '🍱' },
      { id: 'p5', amount: 50000, label: 'Traktir Sultan', price: '50K', active: true, emoji: '👑' },
      { id: 'p6', amount: 100000, label: 'Super Fan Cukur', price: '100K', active: false, emoji: '🔥' },
    ]
  };

  const handleTippingFieldChange = (field, value) => {
    updateBarberTippingConfig(barber.id, { [field]: value });
  };

  const handlePresetChange = (index, fieldOrUpdates, value) => {
    const current = tippingConfig.presets || [];
    const newPresets = current.map((p, i) => {
      if (i !== index) return p;
      if (typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null) {
        return { ...p, ...fieldOrUpdates };
      }
      return { ...p, [fieldOrUpdates]: value };
    });
    updateBarberTippingConfig(barber.id, { presets: newPresets });
  };

  const handleTogglePreset = (index) => {
    const newPresets = [...(tippingConfig.presets || [])];
    const target = newPresets[index];
    const currentActive = target.active !== false;
    const validatedAmount = Math.max(5000, Number(target.amount) || 5000);
    newPresets[index] = { 
      ...target, 
      amount: validatedAmount,
      price: `${Math.round(validatedAmount / 1000)}K`,
      active: !currentActive 
    };
    updateBarberTippingConfig(barber.id, { presets: newPresets });
    showToast(newPresets[index].active ? `Paket ${newPresets[index].label || ''} diaktifkan!` : `Paket ${newPresets[index].label || ''} dinonaktifkan`);
  };

  const handleAddPreset = () => {
    const newPresets = [...(tippingConfig.presets || [])];
    const newId = `p-${Date.now()}`;
    newPresets.push({
      id: newId,
      amount: 5000,
      label: 'Kopi Baru',
      price: '5K',
      active: true,
      emoji: '☕'
    });
    updateBarberTippingConfig(barber.id, { presets: newPresets });
    showToast('Pilihan paket tip baru berhasil ditambahkan!');
  };

  const handleDeletePreset = (index) => {
    const newPresets = [...(tippingConfig.presets || [])];
    if (newPresets.length <= 1) {
      showToast('Minimal harus ada 1 pilihan paket tip');
      return;
    }
    const removed = newPresets.splice(index, 1);
    updateBarberTippingConfig(barber.id, { presets: newPresets });
    showToast(`Pilihan paket ${removed[0]?.label || ''} dihapus`);
  };

  // ─── WITHDRAWAL / PENCAIRAN SALDO STATE (MIN. RP 15.000) ───
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // ─── SUBSCRIPTION PLAN & QUOTA HELPERS ───
  const currentPlan = barber?.plan || 'free';
  const isFreePlan = currentPlan === 'free';
  const isCapsterPlan = currentPlan === 'capster';
  const isBarberPlan = currentPlan === 'barber';

  const serviceCount = (barber?.services || []).length;
  const isServiceLimitReached = isFreePlan && serviceCount >= 5;

  const lookbookCount = (barber?.lookbook || []).length;
  const isLookbookLimitReached = isFreePlan && lookbookCount >= 10;

  const handleSwitchPlan = async (targetPlan) => {
    try {
      await updateBarber(barber.id, { plan: targetPlan });
      const planNames = { free: 'Paket Free', capster: 'Paket Capster (Rp 49K)', barber: 'Paket Barber Studio (Rp 99K)' };
      showToast(`✓ Berhasil beralih ke ${planNames[targetPlan] || targetPlan}`);
      setIsUpgradeModalOpen(false);
    } catch {
      showToast('Gagal mengubah paket berlangganan');
    }
  };

  const handleExportCSV = () => {
    if (!combinedRecentTransactions || combinedRecentTransactions.length === 0) {
      showToast('Belum ada data transaksi untuk diekspor');
      return;
    }

    const headers = ['ID Transaksi', 'Tanggal & Waktu', 'Tipe', 'Deskripsi / Layanan', 'Nama Pelanggan', 'Nominal (Rp)', 'Status'];
    const rows = combinedRecentTransactions.map(tx => [
      `"${tx.id}"`,
      `"${new Date(tx.date).toLocaleString('id-ID')}"`,
      `"${tx.badge || tx.type}"`,
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${(tx.customerName || '').replace(/"/g, '""')}"`,
      Number(tx.amount || 0),
      `"${tx.status || 'Berhasil'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_transaksi_${barber.slug || 'barber'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Laporan keuangan berhasil diunduh (CSV)');
  };
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState(barber?.payoutAccount?.bankName || 'BCA');
  const [withdrawAccNumber, setWithdrawAccNumber] = useState(barber?.payoutAccount?.accountNumber || '');
  const [withdrawAccHolder, setWithdrawAccHolder] = useState(barber?.payoutAccount?.accountHolder || barber?.name || '');
  const handleOpenWithdrawModal = () => {
    setWithdrawBank(barber?.payoutAccount?.bankName || 'BCA');
    setWithdrawAccNumber(barber?.payoutAccount?.accountNumber || '');
    setWithdrawAccHolder(barber?.payoutAccount?.accountHolder || barber?.name || '');
    setWithdrawAmount('');
    setIsWithdrawModalOpen(true);
  };

  const handleSavePayoutAccount = (e) => {
    e?.preventDefault?.();
    if (!withdrawAccNumber.trim() || !withdrawAccHolder.trim()) {
      showToast('Harap lengkapi nomor rekening dan nama pemilik');
      return;
    }
    updateBarber(barber.id, {
      payoutAccount: {
        bankName: withdrawBank,
        accountNumber: withdrawAccNumber.trim(),
        accountHolder: withdrawAccHolder.trim()
      }
    });
    showToast('Rekening pencairan berhasil disimpan!');
  };

  const handleSubmitWithdraw = (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt < 15000) {
      showToast('Minimal penarikan saldo adalah Rp 15.000');
      return;
    }
    if (amt > availableBalance) {
      showToast(`Saldo tidak mencukupi (Saldo siap ditarik: ${formatRupiah(availableBalance)})`);
      return;
    }
    if (!withdrawAccNumber.trim() || !withdrawAccHolder.trim()) {
      showToast('Harap lengkapi nomor rekening dan nama pemilik rekening tujuan');
      return;
    }

    const res = requestBarberWithdrawal(barber.id, {
      amount: amt,
      maxAvailable: availableBalance,
      bankName: withdrawBank,
      accountNumber: withdrawAccNumber.trim(),
      accountHolder: withdrawAccHolder.trim()
    });

    if (res.success) {
      showToast(res.message);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
    } else {
      showToast(res.message);
    }
  };

  // ─── PHOTO UPLOAD (KOMPRESI OTOMATIS KE SUPABASE STORAGE / BASE64 FALLBACK) ───
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/') && !file.name?.match(/\.(jpe?g|png|webp|gif|bmp)$/i)) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WebP)');
      return;
    }
    setIsUploadingPhoto(true);
    const res = await uploadBarberPhoto(barber.id, file);
    setIsUploadingPhoto(false);
    if (res.success) {
      if (res.stats) {
        setProfileStats(res.stats);
        showToast(`Foto profil dikompres: ${res.stats.originalFormatted} → ${res.stats.compressedFormatted} (hemat ${res.stats.savedPercent}%)`);
      } else {
        showToast(
          res.source === 'supabase_storage' 
            ? 'Foto berhasil diupload!' 
            : 'Foto profil berhasil diperbarui & disimpan!'
        );
      }
    } else {
      showToast(`Gagal mengupload foto: ${res.error || 'Terjadi kesalahan'}`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handleDropPhoto = (e) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  // ─── BANNER HEADER FILE SELECT & IMMEDIATE LIVE PREVIEW ───
  const handleBannerFileSelect = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/') && !file.name?.match(/\.(jpe?g|png|webp|gif|bmp)$/i)) {
      showToast('Harap pilih file gambar (JPG, PNG, atau WebP)');
      return;
    }

    try {
      setIsCompressingBanner(true);
      const compressed = await compressImage(file, {
        maxDimension: 1200,
        quality: 0.82,
        cropSquare: false,
        format: 'image/jpeg'
      });

      setPendingBannerFile(file);
      setPendingBannerPreview(compressed.dataUrl);
      setBannerStats(compressed);
      setIsCompressingBanner(false);
      showToast('📸 Foto banner dimuat! Cek pratinjau di layar HP lalu klik "Simpan Banner"');
    } catch (err) {
      setIsCompressingBanner(false);
      showToast('Gagal memproses gambar banner');
      console.error(err);
    }
  };

  // ─── SIMPAN BANNER KE SUPABASE STORAGE & DATABASE ───
  const handleSaveBanner = async () => {
    if (!pendingBannerFile && !pendingBannerPreview) {
      showToast('Pilih foto banner terlebih dahulu');
      return;
    }

    setIsSavingBanner(true);
    try {
      if (pendingBannerFile) {
        const res = await uploadBarberBanner(barber.id, pendingBannerFile);
        if (res.success) {
          setPendingBannerFile(null);
          setPendingBannerPreview(null);
          if (res.stats) setBannerStats(res.stats);
          showToast('✓ Banner berhasil disimpan & aktif di halaman preview!');
        } else {
          showToast(`Gagal menyimpan banner: ${res.error || 'Terjadi kesalahan'}`);
        }
      } else if (pendingBannerPreview) {
        await updateBarber(barber.id, { bannerImage: pendingBannerPreview });
        setPendingBannerPreview(null);
        showToast('✓ Banner berhasil disimpan & aktif di halaman preview!');
      }
    } catch {
      showToast('Terjadi kesalahan saat menyimpan banner');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleCancelPendingBanner = () => {
    setPendingBannerFile(null);
    setPendingBannerPreview(null);
    setBannerStats(null);
    showToast('Perubahan banner dibatalkan');
  };

  const handleDeleteBanner = async () => {
    setPendingBannerFile(null);
    setPendingBannerPreview(null);
    setBannerStats(null);
    await updateBarber(barber.id, { bannerImage: '' });
    showToast('Banner berhasil dihapus');
  };

  // ─── LOOKBOOK / PORTOFOLIO FILE COMPRESSION & SELECTION ───
  const handleLookbookFileSelect = async (file) => {
    if (!file) return;
    if (isLookbookLimitReached) {
      setIsUpgradeModalOpen(true);
      showToast('Batas kuota 10 foto portofolio untuk Paket Free telah tercapai. Upgrade ke Capster untuk unlimited!');
      return;
    }
    if (!file.type?.startsWith('image/') && !file.name?.match(/\.(jpe?g|png|webp|gif|bmp)$/i)) {
      showToast('Harap pilih file gambar yang valid');
      return;
    }

    try {
      setIsCompressingLookbook(true);
      // Kompres otomatis foto portofolio (pertahankan rasio aspek potret/lanskap, max 1080px, quality 0.82)
      const compressed = await compressImage(file, {
        maxDimension: 1080,
        quality: 0.82,
        cropSquare: false,
        format: 'image/jpeg'
      });

      setLookbookFile(file);
      setNewLookbookImg(compressed.dataUrl);
      setLookbookCompressionStats(compressed);
      setIsCompressingLookbook(false);
    } catch (err) {
      setIsCompressingLookbook(false);
      showToast('Gagal memproses foto gambar');
      console.error(err);
    }
  };

  // ─── TEAM MEMBER PHOTO COMPRESSION & SELECTION ───
  const handleTeamPhotoSelect = async (file) => {
    if (!file) return;
    try {
      setIsCompressingTeamPhoto(true);
      const compressed = await compressImage(file, {
        maxDimension: 500,
        quality: 0.82,
        cropSquare: true,
        format: 'image/jpeg'
      });
      setNewTeamPhoto(compressed.dataUrl);
      setTeamPhotoStats(compressed);
      setIsCompressingTeamPhoto(false);
    } catch {
      setIsCompressingTeamPhoto(false);
      showToast('Gagal memproses foto capster');
    }
  };

  // Service Handlers
  const handleOpenAddService = () => {
    if (isServiceLimitReached) {
      setIsUpgradeModalOpen(true);
      showToast('Batas kuota 5 layanan untuk Paket Free telah tercapai. Upgrade ke Capster untuk unlimited!');
      return;
    }
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceDuration('45m');
    setNewServiceTag('Best Seller');
    setNewServiceDesc('');
    setIsAddServiceOpen(true);
  };

  const handleOpenEditService = (srv) => {
    setEditingServiceId(srv.id);
    setNewServiceName(srv.name);
    setNewServicePrice(srv.price.toString());
    setNewServiceDuration(srv.duration || '45m');
    setNewServiceTag(srv.tag || 'Favorit');
    setNewServiceDesc(srv.desc || '');
    setIsAddServiceOpen(true);
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const numericPrice = parseInt(newServicePrice.replace(/\D/g, ''), 10) || 0;

    if (editingServiceId) {
      updateBarberService(barber.id, editingServiceId, {
        name: newServiceName.trim(),
        price: numericPrice,
        duration: newServiceDuration,
        tag: newServiceTag,
        desc: newServiceDesc.trim()
      });
      showToast('Layanan berhasil diperbarui');
    } else {
      addBarberService(barber.id, {
        name: newServiceName.trim(),
        price: numericPrice,
        duration: newServiceDuration,
        tag: newServiceTag,
        desc: newServiceDesc.trim(),
        active: true
      });
      showToast('Layanan baru ditambahkan ke Bio Link');
    }

    setIsAddServiceOpen(false);
  };

  // Lookbook / Feed Post Handlers
  const handleSaveLookbook = async (e) => {
    e.preventDefault();
    if (!newLookbookImg.trim()) {
      showToast('Harap pilih foto terlebih dahulu');
      return;
    }

    const postCaption = newLookbookTitle.trim() || 'Momen Baru ✨';
    const cleanTag = (newLookbookTag.trim() || 'Feed').replace(/^#+/, '');

    if (lookbookFile && uploadBarberPortfolioPhoto) {
      setIsUploadingPhoto(true);
      const res = await uploadBarberPortfolioPhoto(barber.id, lookbookFile, {
        title: postCaption,
        tag: cleanTag
      });
      setIsUploadingPhoto(false);

      if (res.success) {
        const stats = res.stats || lookbookCompressionStats;
        const savingsMsg = stats ? ` (${stats.originalFormatted} → ${stats.compressedFormatted}, hemat ${stats.savedPercent}%)` : '';
        showToast(`Postingan feed berhasil dibagikan${savingsMsg}!`);
      } else {
        addBarberLookbook(barber.id, {
          title: postCaption,
          img: newLookbookImg.trim(),
          tag: cleanTag
        });
        showToast('Postingan feed berhasil dibagikan');
      }
    } else {
      addBarberLookbook(barber.id, {
        title: postCaption,
        img: newLookbookImg.trim(),
        tag: cleanTag
      });
      showToast('Postingan feed berhasil dibagikan');
    }

    setIsAddLookbookOpen(false);
    setNewLookbookTitle('');
    setNewLookbookImg('');
    setNewLookbookTag('Daily Vibe');
    setLookbookFile(null);
    setLookbookCompressionStats(null);
  };

  // Custom Link Handlers
  const handleSaveCustomLink = (e) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    addBarberCustomLink(barber.id, {
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`
    });

    setIsAddLinkOpen(false);
    setNewLinkTitle('');
    setNewLinkUrl('');
    showToast('Tautan kustom berhasil dipasang');
  };

  // Formatting currency
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatLedgerDate = (val) => {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!barber) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 text-center max-w-sm w-full shadow-lg">
          <Scissors className="w-10 h-10 text-[#285844] mx-auto mb-3 animate-bounce" />
          <h2 className="font-display font-extrabold text-lg text-[#171717]">Memuat Data ...</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5">Menghubungkan ...</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Masuk / Ganti Akun
          </button>
        </div>
      </div>
    );
  }

  // Live preview barber with pending banner if available
  const previewBarber = barber ? {
    ...barber,
    bannerImage: pendingBannerPreview !== null ? pendingBannerPreview : (barber.bannerImage || '')
  } : null;

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans selection:bg-[#285844] selection:text-white pb-24 lg:pb-0 lg:h-screen lg:overflow-hidden flex flex-col">
      
      {/* Toast alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#171717] text-white px-5 py-2.5 text-xs font-semibold rounded-full shadow-2xl flex items-center gap-2 border border-neutral-700"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ TOP NAVBAR: STUDIO COMMAND BAR ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ TOP NAVBAR: SLEEK CREATOR STUDIO ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-1.5 overflow-x-hidden">
        
        {/* Brand & Barber Name */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Link to="/" className="flex items-center shrink-0 group py-0.5" title="Beranda E Cukur">
            <Logo variant="compact" size="sm" />
          </Link>

          <span className="text-neutral-300 hidden xs:inline shrink-0">/</span>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-xs text-[#171717] truncate max-w-[80px] xs:max-w-[110px] sm:max-w-[180px] whitespace-nowrap">
              {barber.name}
            </span>
            <span className="text-neutral-400 font-mono text-[11px] hidden md:inline truncate">
              ({barber.handle ? barber.handle.replace(/\.ecukur$/, '') : `@${barber.slug}`})
            </span>
          </div>
        </div>

        {/* Action Controls & Bio Link Quick Access */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Bio URL copy */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono">
            <span className="text-neutral-500">{appDomain}/<strong>{barber.slug || barber.id}</strong></span>
            <button 
              onClick={handleCopyLink} 
              className="text-neutral-500 hover:text-[#171717] p-0.5 transition-colors cursor-pointer"
              title="Salin Link Bio"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Open Public Bio */}
          <button
            type="button"
            onClick={() => navigate('/barber/messages')}
            className="relative hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#285844] hover:bg-emerald-50 border border-emerald-200 transition-colors whitespace-nowrap shrink-0"
            title="Buka percakapan konsultasi"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Pesan</span>
            {unreadChatCount > 0 && (
              <span
                className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                aria-label={`${unreadChatCount} pesan belum dibaca`}
              >
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          {/* Open Public Bio */}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black border border-neutral-200 hover:border-neutral-300 transition-colors whitespace-nowrap shrink-0"
            title="Buka Link Bio di Tab Baru"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
            <span className="hidden sm:inline">Buka Link Bio</span>
            <span className="sm:hidden text-[11px]">Bio</span>
          </a>

          {/* Plan Badge & Upgrade Trigger */}
          <button
            type="button"
            onClick={() => setIsUpgradeModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
              isBarberPlan
                ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                : isCapsterPlan
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
            }`}
            title="Kelola Paket Berlangganan"
          >
            {isBarberPlan ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Barber Studio</span>
                <span className="sm:hidden">Studio</span>
              </>
            ) : isCapsterPlan ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Capster Pro</span>
                <span className="sm:hidden">Pro</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                <span>Free</span>
                <span className="text-[10px] bg-[#285844] text-white px-1.5 py-0.2 rounded font-semibold">Upgrade</span>
              </>
            )}
          </button>

          {/* Mobile Preview Button Toggle */}
          <button
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 bg-[#171717] text-white rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 active:scale-95 transition-transform"
            title="Lihat Pratinjau Tampilan HP"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] sm:text-xs">Preview</span>
          </button>

          {/* Logout */}
          <button 
            type="button"
            onClick={async () => {
              await signOutUser();
              showToast('Berhasil keluar dari akun');
              navigate('/login');
            }} 
            className="flex items-center justify-center w-8 h-8 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            title="Keluar dari Akun"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MAIN WORKSPACE (SPLIT VIEW) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 lg:py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start lg:overflow-hidden">
        
        {/* ─── LEFT COLUMN: STUDIO CONFIG TABS & EDITOR (8 COLS, INDEPENDENT SCROLL) ─── */}
        <div className="lg:col-span-8 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-3 lg:pb-16 custom-scrollbar">

          {/* Category Tabs: Sleek Segmented Controller */}
          <div className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs p-1 flex items-center gap-1 overflow-x-auto hide-scrollbar no-scrollbar touch-pan-x">
            {[
              { id: 'mode', label: 'Mode & Fitur', icon: Sliders },
              { id: 'profile', label: 'Profil & Bio', icon: User },
              { id: 'services', label: 'Menu Layanan', icon: Scissors, show: barber.features?.services !== false },
              { id: 'team', label: 'Tim Capster', icon: Users, show: barber.features?.team === true, badge: (barber.teamMembers || []).length },
              { id: 'bookings', label: 'Reservasi', icon: Calendar, badge: barberBookings.filter(b => b.status === 'Menunggu').length, show: barber.features?.booking !== false },
              { id: 'tipping', label: 'Tip Kopi', icon: Coffee, show: barber.features?.tipping !== false, badge: (barber.tipsHistory || []).length || null },
              { id: 'lookbook', label: 'Portofolio', icon: Eye, show: barber.features?.lookbook !== false },
              { id: 'links', label: 'Tautan', icon: Globe },
              { id: 'design', label: 'Tema', icon: Palette },
              { id: 'stats', label: 'Statistik', icon: BarChart2 },
              { id: 'qrcode', label: 'QR Code', icon: QrCode },
            ].filter(tab => tab.show !== false).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-[#171717] text-white shadow-2xs' 
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════ */}
          {/* TAB 0: MODE & FITUR MODULAR               */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'mode' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Preset Cards */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
                <div>
                  <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#285844]" />
                    <span>Mode Penggunaan Akun</span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Tidak ada batasan akun kaku. Pilih preset cepat di bawah atau aktifkan/nonaktifkan modul apa pun secara bebas sesuai kebutuhan.
                  </p>
                </div>

                {isFreePlan ? (
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#285844]/5 via-[#F7F6F2] to-[#285844]/10 border border-[#285844]/20 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#285844] text-white flex items-center justify-center shadow-xs shrink-0">
                          <Crown className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-extrabold text-sm sm:text-base text-[#171717]">
                              Buka Mode Khusus Bisnismu
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              Eksklusif Pro & Studio
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Saat ini akunmu menggunakan Paket Free. Tingkatkan paket untuk memilih preset khusus usahamu.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Pilih Paket & Upgrade</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div 
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="p-4 rounded-xl bg-white border border-neutral-200/90 hover:border-[#285844]/60 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">💈</span>
                            <span className="text-[10px] font-bold text-[#285844] bg-[#D9E5DC]/60 px-2.5 py-0.5 rounded-full">
                              Paket Capster (Rp 49K)
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[#171717] group-hover:text-[#285844] transition-colors">
                            Mode Capster Mandiri
                          </h4>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                            Khusus tukang cukur perorangan & freelance. Portofolio tanpa batas, tip sawer kopi digital, dan bio link personal.
                          </p>
                        </div>
                        <span className="text-[10.5px] font-bold text-[#285844] mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Aktifkan Mode Capster →
                        </span>
                      </div>

                      <div 
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="p-4 rounded-xl bg-white border border-neutral-200/90 hover:border-[#285844]/60 transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🏢</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              Paket Barber Studio (Rp 99K)
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[#171717] group-hover:text-[#285844] transition-colors">
                            Mode Barbershop & Studio
                          </h4>
                          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                            Khusus barbershop & studio pangkas. Manajemen tim multi-capster, jam toko, lokasi fisik Google Maps, dan branding resmi.
                          </p>
                        </div>
                        <span className="text-[10.5px] font-bold text-amber-700 mt-3 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Aktifkan Mode Barbershop →
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {/* Preset 1: Capster Mandiri */}
                    <div 
                      onClick={() => handleApplyPreset('barber')}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        (barber.profileType || 'barber') === 'barber'
                          ? 'border-[#285844] bg-[#D9E5DC]/20 shadow-xs'
                          : 'border-neutral-200 bg-neutral-50/60 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">💈</span>
                          {(barber.profileType || 'barber') === 'barber' && (
                            <span className="px-2 py-0.5 rounded-full bg-[#285844] text-white text-[10px] font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-sm text-[#171717]">Mode Capster Mandiri</h3>
                        <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                          Untuk capster / tukang cukur perorangan & freelance. Tampilkan portofolio karya, menu tarif, dan terima booking langsung ke jadwalmu.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-[#285844] mt-3 block">
                        Fokus Personal Branding →
                      </span>
                    </div>

                    {/* Preset 2: Barbershop & Studio */}
                    <div 
                      onClick={() => handleApplyPreset('barbershop')}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        barber.profileType === 'barbershop'
                          ? 'border-[#285844] bg-[#D9E5DC]/20 shadow-xs'
                          : 'border-neutral-200 bg-neutral-50/60 hover:border-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">🏢</span>
                          {barber.profileType === 'barbershop' && (
                            <span className="px-2 py-0.5 rounded-full bg-[#285844] text-white text-[10px] font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-sm text-[#171717]">Mode Barbershop & Studio</h3>
                        <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                          Untuk pemilik barbershop / studio pangkas. Dilengkapi lokasi fisik Google Maps, jam operasional toko, dan manajemen tim capster.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-[#285844] mt-3 block">
                        Dilengkapi Manajemen Tim Capster →
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modular Feature Toggles */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#171717]">Saklar Fitur Bebas (On / Off)</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">Nyalakan atau matikan modul kapan saja. Perubahan langsung terlihat di preview HP secara realtime.</p>
                  </div>
                </div>

                <div className="divide-y divide-neutral-100">
                  {[
                    {
                      key: 'booking',
                      name: 'Sistem Booking Jadwal Mandiri Online',
                      desc: 'Pelanggan bisa memilih tanggal & jam slot langsung di web tanpa harus chat bolak-balik.',
                      icon: Calendar,
                      active: barber.features?.booking !== false,
                      isLocked: false
                    },
                    {
                      key: 'services',
                      name: 'Daftar Layanan & Transparansi Tarif',
                      desc: 'Menampilkan menu potong rambut, durasi pengerjaan, dan harga yang jelas untuk pelanggan.',
                      icon: Scissors,
                      active: barber.features?.services !== false,
                      isLocked: false
                    },
                    {
                      key: 'lookbook',
                      name: 'Galeri Portofolio Hasil Potong (Lookbook)',
                      desc: 'Pamerkan foto hasil guntingan terbaik. Matikan jika kamu belum sempat mengunggah foto portofolio.',
                      icon: Sparkles,
                      active: barber.features?.lookbook !== false,
                      isLocked: false
                    },
                    {
                      key: 'tipping',
                      name: 'Sawer Tip Digital (Tip Kopi)',
                      desc: 'Beri opsi bagi pelanggan yang puas untuk mengirim tip apresiasi kopi secara digital via QRIS.',
                      icon: Coffee,
                      active: barber.features?.tipping !== false,
                      isLocked: false
                    },
                    {
                      key: 'location',
                      name: 'Lokasi Studio Fisik & Google Maps',
                      desc: 'Menampilkan alamat lengkap dan rute navigasi. Khusus barbershop studio toko fisik.',
                      icon: MapPin,
                      active: isBarberPlan && barber.features?.location !== false,
                      isLocked: !isBarberPlan,
                      lockLabel: 'Paket Barber Studio'
                    },
                    {
                      key: 'team',
                      name: 'Tim Capster (Banyak Tukang Cukur)',
                      desc: 'Aktifkan jika usahamu memiliki beberapa capster. Pelanggan bisa memilih capster saat booking jadwal.',
                      icon: Users,
                      active: isBarberPlan && barber.features?.team === true,
                      isLocked: !isBarberPlan,
                      lockLabel: 'Paket Barber Studio'
                    }
                  ].map((feat) => {
                    const Icon = feat.icon;
                    return (
                      <div key={feat.key} className="py-3.5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            feat.isLocked 
                              ? 'bg-amber-100/70 text-amber-700' 
                              : feat.active ? 'bg-[#D9E5DC] text-[#285844]' : 'bg-neutral-100 text-neutral-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-[#171717]">{feat.name}</span>
                              {feat.isLocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeature(feat.key)}
                                  className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-200 transition-colors cursor-pointer"
                                  title="Fitur terkunci, klik untuk upgrade"
                                >
                                  <span>🔒 {feat.lockLabel}</span>
                                </button>
                              ) : (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                  feat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                                }`}>
                                  {feat.active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleFeature(feat.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1 ${
                            feat.isLocked 
                              ? 'bg-neutral-200 border border-neutral-300' 
                              : feat.active ? 'bg-[#285844]' : 'bg-neutral-300'
                          }`}
                          title={feat.isLocked ? `Fitur khusus ${feat.lockLabel}` : feat.active ? 'Klik untuk mematikan' : 'Klik untuk menyalakan'}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform flex items-center justify-center text-[8px] ${
                            feat.isLocked ? 'left-1 text-neutral-400' : feat.active ? 'right-1' : 'left-1'
                          }`}>
                            {feat.isLocked && '🔒'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB: TIM CAPSTER (KELOLA CAPSTER TOKO)     */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'team' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {!isBarberPlan ? (
                <div className="bg-white p-8 sm:p-12 rounded-2xl border border-neutral-200 text-center max-w-lg mx-auto space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-2xs">
                    <Crown className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      Eksklusif Paket Barber (Rp 99K/bln)
                    </span>
                    <h3 className="font-display font-black text-xl text-[#171717] mt-3">
                      Manajemen Tim & Multi-Capster
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed mt-1.5 max-w-sm mx-auto">
                      Kelola profil seluruh staf capster tokomu, jadwal kerja terpisah, dan fitur pemilihan capster oleh pelanggan saat booking online.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="px-6 py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      Tingkatkan ke Paket Barber
                    </button>
                  </div>
                </div>
              ) : (
                <>
              
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#285844]" />
                      <span>Daftar Tim Capster ({ (barber.teamMembers || []).length })</span>
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Tambahkan tukang cukur (capster) yang bekerja di barbershop ini agar pelanggan bisa memilih saat booking.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTeamName('');
                      setNewTeamSpecialty('');
                      setNewTeamSchedule('Setiap Hari');
                      setNewTeamPhoto('');
                      setIsAddTeamOpen(true);
                    }}
                    className="px-3.5 py-2 bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Capster</span>
                  </button>
                </div>

                {/* Team member cards */}
                {(barber.teamMembers || []).length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-neutral-200 text-neutral-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-neutral-400" />
                    <p className="text-xs font-semibold text-neutral-700">Belum ada capster yang didaftarkan</p>
                    <p className="text-[11px] text-neutral-500 mt-1 max-w-sm mx-auto">
                      Klik tombol "Tambah Capster" di atas untuk menambahkan tukang cukur pertama di barbershopmu.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {(barber.teamMembers || []).map((m) => (
                      <div key={m.id} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0">
                            {m.photo ? (
                              <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-sm text-neutral-500">
                                {m.name?.charAt(0) || 'C'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display font-bold text-sm text-[#171717] truncate">{m.name}</h4>
                            <p className="text-[11px] text-neutral-500 truncate">{m.specialty || 'Capster Professional'}</p>
                            <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">{m.schedule || 'Shift Harian'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            deleteBarberTeamMember(barber.id, m.id);
                            showToast(`Capster ${m.name} berhasil dihapus`);
                          }}
                          className="p-2 text-neutral-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus Capster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            
                </>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 1: PROFIL & IDENTITAS BARBER           */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-neutral-200/90 shadow-2xs space-y-5">
                <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#285844]" />
                  <span>Identitas & Foto Profil</span>
                </h2>

                {/* ─── REAL PHOTO UPLOADER (SUPABASE STORAGE & DATA URL) ─── */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-2">
                    Foto Profil Barber
                  </label>
                  
                  {/* Hidden native file input */}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={handleDropPhoto}
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center gap-5 ${
                      isDraggingPhoto 
                        ? 'border-[#285844] bg-[#D9E5DC]/30 scale-[1.01]' 
                        : 'border-neutral-200 bg-neutral-50/80 hover:border-neutral-300'
                    }`}
                  >
                    {/* Avatar circle with interactive camera hover */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white shadow-md group cursor-pointer shrink-0 bg-neutral-100 flex items-center justify-center"
                      title="Klik untuk memilih foto dari galeri/perangkat"
                    >
                      {barber.photo ? (
                        <img 
                          src={barber.photo} 
                          alt={barber.name} 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <span className="font-display font-black text-2xl text-neutral-400">
                          {(barber.name || 'B').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Pilih Foto</span>
                      </div>
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-[10px] font-bold">
                          <RefreshCw className="w-5 h-5 animate-spin mb-1 text-emerald-400" />
                          <span>Mengupload...</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons & explanation */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="px-3.5 py-2 bg-[#171717] hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{isUploadingPhoto ? 'Mengupload...' : 'Pilih Foto Baru'}</span>
                        </button>

                        {barber.photo && (
                          <button
                            type="button"
                            onClick={() => {
                              handleProfileFieldChange('photo', '');
                              showToast('Foto profil berhasil dihapus');
                            }}
                            className="px-3 py-2 bg-neutral-100 hover:bg-red-50 hover:text-red-600 text-neutral-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          Tarik & lepas foto langsung atau klik tombol di atas.
                        </p>
                        {profileStats ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Dikompres otomatis: {profileStats.originalFormatted} → {profileStats.compressedFormatted} (hemat {profileStats.savedPercent}%)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-neutral-400 text-[11px]">
                            <Sparkles className="w-3 h-3 text-[#285844]" />
                            <span>Otomatis dikompres & dipotong 1:1 persegi.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── BANNER HEADER UPLOADER (COVER PROFILE) ─── */}
                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-700 block">
                      Foto Banner Header (Cover Bio Link)
                    </label>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Tampil di bagian atas profil bio link
                    </span>
                  </div>

                  {/* Hidden file input for banner */}
                  <input 
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBannerFileSelect(file);
                      e.target.value = '';
                    }}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  {/* Banner Display or Upload Dropzone */}
                  {(pendingBannerPreview || barber?.bannerImage) ? (
                    <div className="space-y-3 mb-3">
                      {/* Banner Preview Card */}
                      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 h-36 sm:h-44 group shadow-sm">
                        <img 
                          src={pendingBannerPreview || barber?.bannerImage} 
                          alt="Banner Preview" 
                          className="w-full h-full object-cover opacity-90 transition-transform group-hover:scale-102"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />

                        {/* Logo & Share mock */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <div className="flex items-center gap-1.5 opacity-90">
                            <Logo variant="compact" size="sm" className="text-white drop-shadow" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/20 text-[10px] font-semibold flex items-center gap-1">
                            <Share2 className="w-3 h-3" /> Share
                          </span>
                        </div>

                        {/* Top banner status badge */}
                        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                          {pendingBannerPreview ? (
                            <span className="px-2.5 py-1 rounded-md bg-amber-500/90 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Pratinjau Baru (Belum Disimpan)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-[#285844]/90 text-white text-[10px] font-semibold backdrop-blur-sm shadow-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Banner Aktif di Link Bio
                            </span>
                          )}
                        </div>

                        {/* Loading indicator */}
                        {(isCompressingBanner || isSavingBanner) && (
                          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs font-bold z-20">
                            <RefreshCw className="w-6 h-6 animate-spin mb-1.5 text-emerald-400" />
                            <span>{isCompressingBanner ? 'Mengompres Foto Banner...' : 'Menyimpan Banner ke Database...'}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions: Simpan, Ganti & Hapus */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Tombol Simpan Banner */}
                        <button
                          type="button"
                          onClick={handleSaveBanner}
                          disabled={isSavingBanner || isCompressingBanner}
                          className={`px-4 py-2 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                            pendingBannerPreview 
                              ? 'bg-[#285844] hover:bg-[#1E4334] text-white ring-2 ring-[#285844]/30 active:scale-95' 
                              : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                          } disabled:opacity-50`}
                        >
                          {isSavingBanner ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>{pendingBannerPreview ? 'Simpan Banner Sekarang' : 'Simpan Banner'}</span>
                            </>
                          )}
                        </button>

                        {/* Tombol Ganti Banner */}
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          disabled={isSavingBanner || isCompressingBanner}
                          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Ganti Foto</span>
                        </button>

                        {/* Tombol Batal jika sedang pratinjau banner baru */}
                        {pendingBannerPreview && (
                          <button
                            type="button"
                            onClick={handleCancelPendingBanner}
                            disabled={isSavingBanner}
                            className="px-3 py-2 text-neutral-500 hover:text-neutral-700 text-xs font-medium cursor-pointer"
                          >
                            Batal
                          </button>
                        )}

                        {/* Tombol Hapus Banner */}
                        <button
                          type="button"
                          onClick={handleDeleteBanner}
                          disabled={isSavingBanner || isCompressingBanner}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Banner</span>
                        </button>
                      </div>

                      {/* Compression Stats Badge */}
                      {bannerStats && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Dikompres: {bannerStats.originalFormatted} → {bannerStats.compressedFormatted} (hemat {bannerStats.savedPercent}%)</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="relative rounded-2xl border-2 border-dashed border-neutral-300 hover:border-[#285844] bg-neutral-50/70 hover:bg-[#D9E5DC]/15 p-6 sm:p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group mb-3 shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 group-hover:border-[#285844]/40 group-hover:bg-[#D9E5DC]/30 text-neutral-600 group-hover:text-[#285844] flex items-center justify-center transition-all shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[#171717] group-hover:text-[#285844] block">
                          Unggah Foto Banner Toko
                        </span>
                        <p className="text-[11px] text-neutral-500 max-w-sm leading-relaxed mx-auto">
                          Pilih foto dari galeri HP atau komputer. Foto langsung terlihat di preview layar HP sebelum disimpan.
                        </p>
                      </div>
                      <div className="mt-1 px-4 py-2 bg-[#171717] group-hover:bg-[#285844] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Pilih Foto Banner</span>
                      </div>

                      {isCompressingBanner && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center text-[#171717] text-xs font-bold rounded-2xl z-20">
                          <RefreshCw className="w-6 h-6 animate-spin mb-1.5 text-[#285844]" />
                          <span>Mengompres & Menyiapkan Pratinjau...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Kota / Wilayah (Pill Lokasi Profil) */}
                  <div className="pt-1">
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Kota / Wilayah (Pill Lokasi Profil)
                    </label>
                    <input 
                      type="text"
                      value={barber.locationCity || ''}
                      onChange={(e) => handleProfileFieldChange('locationCity', e.target.value)}
                      placeholder="e.g. Jakarta, Bandung, Surabaya, Medan, Denpasar, dll"
                      className="w-full text-xs font-medium p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>

                {/* Name & Handle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Nama Barber / Toko</label>
                    <input 
                      type="text"
                      value={barber.name}
                      onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                      placeholder="e.g. Reza Fade"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-neutral-700">Username / Slug Bio Link</label>
                      {slugStatus.msg ? (
                        <span className="text-[11px] text-rose-500 font-medium">{slugStatus.msg}</span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-mono font-medium">{appDomain}/{slugInput || '...'}</span>
                      )}
                    </div>
                    <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded-xl px-3 focus-within:border-neutral-900 focus-within:bg-white transition-colors">
                      <span className="text-xs font-mono text-neutral-400 select-none">{appDomain}/</span>
                      <input 
                        type="text"
                        value={slugInput}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        onBlur={handleSlugBlur}
                        placeholder="username-kamu"
                        className="w-full text-sm font-mono font-medium p-3 bg-transparent outline-none text-[#171717]"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Hanya huruf kecil, angka, dan tanda hubung (-).
                    </p>
                  </div>
                </div>

                {/* Bio text */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700">Bio Singkat</label>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {(barber.bio || '').length} / 160 karakter
                    </span>
                  </div>
                  <textarea 
                    rows={3}
                    maxLength={160}
                    value={barber.bio}
                    onChange={(e) => handleProfileFieldChange('bio', e.target.value)}
                    placeholder="Ceritakan pengalaman, gaya potongan andalan, dan komitmen layanan kamu..."
                    className="w-full text-sm font-normal p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

              </div>

              {/* Lokasi Alamat Barbershop */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#285844]" />
                  <span>Lokasi & Alamat Barbershop</span>
                </h2>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Alamat Lengkap Barbershop</label>
                  <input 
                    type="text"
                    value={barber.address || ''}
                    onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                    placeholder="e.g. Jl. Sudirman No. 12 / Ruko Grand Mall Blok A"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 2: DAFTAR BOOKING MASUK DARI LINK BIO  */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'bookings' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#171717]">Reservasi & Booking Masuk</h2>
                  <p className="text-xs text-neutral-500">
                    Pelanggan yang memesan jam cukur langsung dari link bio kamu.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-[#D9E5DC] text-[#285844] px-3 py-1.5 rounded-xl font-bold">
                    {barberBookings.length} Total Reservasi
                  </span>
                </div>
              </div>

              {/* Bookings List */}
              <div className="space-y-3">
                {barberBookings.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-neutral-300 text-neutral-500">
                    <Calendar className="w-10 h-10 mx-auto mb-3 text-neutral-400" />
                    <p className="font-semibold text-sm">Belum ada booking masuk dari link bio.</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Bagikan link biomu agar followers bisa mulai booking slot waktu.
                    </p>
                  </div>
                ) : (
                  barberBookings.map((b) => (
                    <div 
                      key={b.id} 
                      className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#285844] bg-[#D9E5DC] px-2 py-0.5 rounded">
                            {b.id}
                          </span>
                          <span className="font-display font-bold text-sm text-[#171717]">
                            {b.customerName}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            b.status === 'Terkonfirmasi' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : b.status === 'Selesai'
                              ? 'bg-neutral-100 text-neutral-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-600 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#285844]">{b.serviceName}</span>
                          <span>•</span>
                          <span className="font-mono font-medium">{formatRupiah(b.price)}</span>
                        </div>

                        <div className="text-xs text-neutral-500 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" /> 
                            <strong>{b.date} • {b.time} WIB</strong>
                          </span>
                          <span>•</span>
                          <span className="font-mono">WA: {b.customerPhone}</span>
                        </div>

                        {b.note && (
                          <p className="text-[11px] text-neutral-500 italic bg-neutral-50 p-2 rounded-lg mt-1">
                            " {b.note} "
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <a
                          href={`https://wa.me/${b.customerPhone.replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(b.customerName)},%20saya%20${encodeURIComponent(barber.name)}.%20Booking%20jadwal%20cukur%20kamu%20(${b.serviceName})%20pada%20${b.date}%20jam%20${b.time}%20WIB%20sudah%20kami%20catat.`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat WA</span>
                        </a>

                        {(b.status === 'Menunggu' || (
                          b.status === 'Menunggu pembayaran' &&
                          (b.paymentMethod !== 'QRIS' || b.paymentStatus === 'PAID')
                        )) && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateBookingStatus(b.id, 'Terkonfirmasi');
                                showToast(`Booking ${b.id} dikonfirmasi!`);
                              } catch (error) {
                                showToast(`Gagal memperbarui booking: ${error.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                          >
                            Konfirmasi
                          </button>
                        )}

                        {b.status === 'Terkonfirmasi' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateBookingStatus(b.id, 'Menunggu antrean');
                                showToast(`Booking ${b.id} masuk antrean.`);
                              } catch (error) {
                                showToast(`Gagal memperbarui booking: ${error.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Masukkan antrean
                          </button>
                        )}

                        {(b.status === 'Menunggu antrean' || b.status === 'Tiba di Lokasi') && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateBookingStatus(b.id, 'Sedang dilayani');
                                showToast(`Layanan booking ${b.id} dimulai.`);
                              } catch (error) {
                                showToast(`Gagal memperbarui booking: ${error.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                          >
                            Mulai layanan
                          </button>
                        )}

                        {b.status === 'Sedang dilayani' && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateBookingStatus(b.id, 'Selesai');
                                showToast(`Booking ${b.id} selesai!`);
                              } catch (error) {
                                showToast(`Gagal memperbarui booking: ${error.message}`);
                              }
                            }}
                            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Tandai selesai
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════ */}
          {/* TAB: SAWER TIP DIGITAL (MODEL SAWERIA)     */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'tipping' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* 1. SAWERIA-STYLE PRESET MANAGER */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4 flex-wrap">
                  <div>
                    <h3 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                      <Coffee className="w-5 h-5 text-amber-600" />
                      <span>Pilihan Paket Sawer Tip (Model Saweria)</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Kelola nominal cepat yang tampil di link bio kamu. Paling kecil mulai dari <strong>Rp 5.000</strong> dan bisa diaktifkan/dinonaktifkan kapan saja.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddPreset}
                      className="px-3.5 py-2 bg-[#171717] hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pilihan</span>
                    </button>

                  </div>
                </div>

                {/* Preset List Cards (Saweria Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(tippingConfig.presets || []).map((preset, idx) => {
                    const isActive = preset.active !== false;
                    const amountNum = Number(preset.amount || 0);
                    const isBelowMin = preset.amount !== '' && preset.amount !== null && preset.amount !== undefined && amountNum < 5000;

                    return (
                      <div 
                        key={preset.id || idx} 
                        className={`p-4 rounded-xl border transition-all space-y-3 min-w-0 overflow-hidden ${
                          isActive 
                            ? 'bg-white border-neutral-200 shadow-2xs hover:border-neutral-300' 
                            : 'bg-neutral-50/70 border-neutral-200/70 opacity-60'
                        }`}
                      >
                        {/* Header: Nomor Pilihan & Switch Aktif di Bio + Delete */}
                        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-neutral-800 truncate" title={preset.label || `Paket ${idx + 1}`}>
                              {preset.label || `Paket ${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePreset(idx)}
                              className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                  : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                              }`}
                              title={isActive ? 'Klik untuk nonaktifkan di bio link' : 'Klik untuk aktifkan di bio link'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                              <span>{isActive ? 'Aktif di Bio' : 'Nonaktif'}</span>
                            </button>

                            {(tippingConfig.presets || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeletePreset(idx)}
                                className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Hapus paket ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Input Nama Paket & Emoji */}
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                            Nama Paket & Emoji
                          </label>
                          <div className="flex items-center gap-1.5 w-full min-w-0">
                            <input 
                              type="text" 
                              value={preset.emoji || '☕'}
                              onChange={(e) => handlePresetChange(idx, 'emoji', e.target.value)}
                              maxLength={4}
                              className="w-10 h-8 shrink-0 text-center bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-900 focus:bg-white transition-colors"
                              title="Ganti emoji"
                            />
                            <input 
                              type="text" 
                              value={preset.label || ''}
                              onChange={(e) => handlePresetChange(idx, 'label', e.target.value)}
                              placeholder="e.g. Kopi Tubruk"
                              maxLength={30}
                              className="flex-1 min-w-0 h-8 px-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold focus:border-neutral-900 focus:bg-white outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* Input Nominal Rp (Min 5.000) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-neutral-700">
                              Nominal Traktir
                            </label>
                            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                              Min. Rp 5.000
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 w-full min-w-0">
                            <div className="relative flex-1 min-w-0">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 font-mono pointer-events-none">
                                Rp
                              </span>
                              <input 
                                type="text" 
                                inputMode="numeric"
                                value={preset.amount !== '' && preset.amount !== null && preset.amount !== undefined ? (Number(preset.amount) === 0 ? '' : Number(preset.amount).toLocaleString('id-ID')) : ''}
                                onChange={(e) => {
                                  const cleanDigits = e.target.value.replace(/\D/g, '');
                                  const numVal = cleanDigits === '' ? '' : parseInt(cleanDigits, 10);
                                  handlePresetChange(idx, {
                                    amount: numVal,
                                    price: numVal ? `${Math.round(numVal / 1000)}K` : ''
                                  });
                                }}
                                onBlur={() => {
                                  const num = Number(preset.amount);
                                  if (!num || num < 5000) {
                                    handlePresetChange(idx, {
                                      amount: 5000,
                                      price: '5K'
                                    });
                                    showToast('Nominal minimal adalah Rp 5.000 (disesuaikan otomatis)');
                                  }
                                }}
                                placeholder="5.000"
                                className={`w-full h-8 pl-8 pr-2 bg-neutral-50 border rounded-lg text-xs font-mono font-bold outline-none transition-all ${
                                  isBelowMin
                                    ? 'border-rose-400 bg-rose-50/20 text-rose-600 focus:border-rose-500'
                                    : 'border-neutral-200 text-neutral-900 focus:border-neutral-900 focus:bg-white'
                                }`}
                              />
                            </div>

                            {/* Quick Stepper Shortcut Buttons */}
                            <button
                              type="button"
                              disabled={amountNum <= 5000}
                              onClick={() => {
                                const current = amountNum || 5000;
                                const nextVal = Math.max(5000, current - 5000);
                                handlePresetChange(idx, {
                                  amount: nextVal,
                                  price: `${Math.round(nextVal / 1000)}K`
                                });
                              }}
                              className="h-8 px-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-35 disabled:hover:bg-neutral-100 text-neutral-700 rounded-lg text-[10px] font-bold font-mono transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
                              title="Kurangi Rp 5.000"
                            >
                              -5K
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const current = amountNum || 5000;
                                const nextVal = current + 5000;
                                handlePresetChange(idx, {
                                  amount: nextVal,
                                  price: `${Math.round(nextVal / 1000)}K`
                                });
                              }}
                              className="h-8 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-bold font-mono transition-colors shrink-0 cursor-pointer"
                              title="Tambah Rp 5.000"
                            >
                              +5K
                            </button>
                          </div>

                          {isBelowMin && (
                            <p className="text-[10px] text-rose-500 font-medium mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>Di bawah Rp 5.000 tidak bisa (klik luar untuk reset 5K)</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info Text */}
                <p className="text-[11px] text-neutral-400 italic pt-1">
                  * Catatan: Hanya pilihan dengan status <strong className="text-emerald-700">Aktif di Bio</strong> yang akan tampil sebagai tombol traktir cepat di halaman bio link pelanggan.
                </p>
              </div>

              {/* 2. PENGATURAN AJAKAN DI BIO LINK */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Teks Ajakan & Ucapan Terima Kasih</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Sesuaikan pesan sapaan traktir kopi yang dibaca pelanggan di bio kamu.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Judul Ajakan di Bio
                    </label>
                    <input 
                      type="text" 
                      value={tippingConfig.title || ''}
                      onChange={(e) => handleTippingFieldChange('title', e.target.value)}
                      placeholder="Traktir Kopi Capster"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:border-neutral-900 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Pesan Ucapan Terima Kasih
                    </label>
                    <input 
                      type="text" 
                      value={tippingConfig.thankYouMessage || ''}
                      onChange={(e) => handleTippingFieldChange('thankYouMessage', e.target.value)}
                      placeholder="Terima kasih banyak atas tip kopinya!"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:border-neutral-900 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. RIWAYAT TRANSAKSI TIP MASUK */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-neutral-700" />
                      <span>Riwayat Tip Diterima</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Daftar seluruh apresiasi tip kopi yang dikirimkan pelanggan melalui link bio kamu.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg">
                    {tipsList.length} Transaksi
                  </span>
                </div>

                {tipsList.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400">
                    <Coffee className="w-6 h-6 mx-auto mb-2 opacity-40 text-neutral-500" />
                    <p className="text-xs font-medium text-neutral-600">Belum ada tip yang masuk</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Tip dari pelanggan akan otomatis tercatat di sini dan di menu Statistik.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 text-[11px]">
                          <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                          <th className="py-2.5 px-3 font-semibold">Nominal</th>
                          <th className="py-2.5 px-3 font-semibold">Paket</th>
                          <th className="py-2.5 px-3 font-semibold">Pesan Apresiasi</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {tipsList.map((tip) => (
                          <tr key={tip.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-3 font-semibold text-neutral-900">
                              {tip.customerName || 'Pelanggan'}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700 font-mono">
                              +Rp {Number(tip.amount || 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-3 text-neutral-600">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200/60">
                                {tip.coffeeLabel || 'Kopi'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-neutral-600 max-w-xs truncate italic">
                              "{tip.message || '-'}"
                            </td>
                            <td className="py-3 px-3 text-neutral-400 font-mono text-right text-[11px]">
                              {formatLedgerDate(tip.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 3: MENU LAYANAN & TARIF HARGA          */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'services' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#171717]">Daftar Layanan & Tarif</h2>
                  <p className="text-xs text-neutral-500">
                    Layanan ini akan tampil di profil bio kamu dengan harga transparan dan estimasi waktu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddService}
                  className="px-4 py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Layanan</span>
                </button>
              </div>

              {/* Kuota Layanan Status Banner */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium ${
                isFreePlan 
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-900' 
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  {isFreePlan ? <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span>
                    {isFreePlan ? (
                      <>Kuota Menu Layanan: <strong className="font-bold">{serviceCount}/5</strong> digunakan (Paket Free)</>
                    ) : (
                      <>Menu Layanan <strong>Unlimited</strong> (${serviceCount} aktif pada Paket ${isBarberPlan ? 'Barber' : 'Capster'})</>
                    )}
                  </span>
                </div>
                {isFreePlan && (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="text-xs font-bold text-[#285844] hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    Tingkatkan ke Unlimited →
                  </button>
                )}
              </div>

              {/* Service Cards List */}
              <div className="space-y-3">
                {(barber.services || []).length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-neutral-300 text-neutral-500">
                    <Scissors className="w-10 h-10 mx-auto mb-3 text-neutral-400" />
                    <p className="font-semibold text-sm">Belum ada layanan yang ditambahkan.</p>
                    <button
                      onClick={handleOpenAddService}
                      className="mt-3 px-4 py-2 bg-[#285844] text-white text-xs font-semibold rounded-xl"
                    >
                      Buat Layanan Pertama
                    </button>
                  </div>
                ) : (
                  (barber.services || []).map((srv) => (
                    <div 
                      key={srv.id} 
                      className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        srv.active !== false ? 'border-neutral-200 shadow-sm' : 'border-neutral-200 opacity-60 bg-neutral-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-bold text-base text-[#171717]">{srv.name}</h3>
                          {srv.tag && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D9E5DC] text-[#285844] font-semibold">
                              {srv.tag}
                            </span>
                          )}
                          <span className="text-xs font-mono text-neutral-400">• {srv.duration}</span>
                        </div>
                        {srv.desc && (
                          <p className="text-xs text-neutral-600 line-clamp-1">{srv.desc}</p>
                        )}
                        <span className="font-mono font-bold text-sm text-[#285844] mt-1 block">
                          {formatRupiah(srv.price)}
                        </span>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => toggleBarberService(barber.id, srv.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            srv.active !== false 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {srv.active !== false ? 'Aktif' : 'Disembunyikan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditService(srv)}
                          className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
                          title="Edit Layanan"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBarberService(barber.id, srv.id)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Layanan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 4: PORTFOLIO & LOOKBOOK               */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'lookbook' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#171717]">Feed & Galeri</h2>
                  <p className="text-xs text-neutral-500">
                    Unggah foto untuk feed profil Anda 
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isLookbookLimitReached) {
                      setIsUpgradeModalOpen(true);
                      showToast('Batas kuota 10 foto portofolio untuk Paket Free telah tercapai');
                      return;
                    }
                    setIsAddLookbookOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Postingan Baru</span>
                </button>
              </div>

              {/* Kuota Portofolio Status Banner */}
              <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium ${
                isFreePlan 
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-900' 
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  {isFreePlan ? <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  <span>
                    {isFreePlan ? (
                      <>Kuota Feed & Portofolio: <strong className="font-bold">{lookbookCount}/10</strong> diunggah (Paket Free)</>
                    ) : (
                      <>Feed Postingan <strong>Unlimited</strong> ({lookbookCount} foto pada Paket {isBarberPlan ? 'Barber' : 'Capster'})</>
                    )}
                  </span>
                </div>
                {isFreePlan && (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="text-xs font-bold text-[#285844] hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    Tingkatkan ke Unlimited →
                  </button>
                )}
              </div>

              {/* Lookbook Grid (Instagram Style) */}
              {(barber.lookbook || []).length === 0 ? (
                <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-neutral-300 text-neutral-500">
                  <Eye className="w-9 h-9 mx-auto mb-2 text-neutral-400" />
                  <p className="font-semibold text-sm">Belum ada postingan feed.</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Unggah foto.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddLookbookOpen(true)}
                    className="mt-3.5 px-4 py-2 bg-[#285844] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Buat Postingan Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {(barber.lookbook || []).map((item) => (
                    <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-200 shadow-sm flex flex-col">
                      <div className="aspect-square w-full overflow-hidden bg-neutral-950 relative flex items-center justify-center p-1">
                        <img 
                          src={item.img} 
                          alt={item.title} 
                          className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-300" 
                        />
                        <button
                          type="button"
                          onClick={() => deleteBarberLookbook(barber.id, item.id)}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {item.tag && (
                          <span className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-sm">
                            #{item.tag}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-display font-medium text-xs text-[#171717] line-clamp-2 leading-snug">{item.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 5: TAUTAN TAMBAHAN & MEDSOS            */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'links' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Social Channels */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#285844]" />
                  <span>Akun Media Sosial Utama</span>
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Instagram URL</label>
                    <input 
                      type="text" 
                      value={barber.instagram || ''} 
                      onChange={(e) => handleProfileFieldChange('instagram', e.target.value)}
                      placeholder="https://instagram.com/username" 
                      className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">TikTok URL</label>
                    <input 
                      type="text" 
                      value={barber.tiktok || ''} 
                      onChange={(e) => handleProfileFieldChange('tiktok', e.target.value)}
                      placeholder="https://tiktok.com/@username" 
                      className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Bio Buttons */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-base text-[#171717]">Tombol Tautan Kustom</h2>
                    <p className="text-xs text-neutral-500">Tambahkan link ke Google Maps, Tokopedia pomade, atau YouTube.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddLinkOpen(true)}
                    className="px-3.5 py-2 bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Link</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(barber.customLinks || []).length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-300 text-neutral-500">
                      <p className="text-xs font-semibold">Belum ada tautan kustom</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Tambahkan tautan Google Maps, link WhatsApp, atau katalog produk.</p>
                    </div>
                  ) : (
                    (barber.customLinks || []).map((link) => (
                      <div key={link.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between gap-3">
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-xs text-[#171717] block truncate">{link.title}</span>
                          <span className="font-mono text-[10px] text-neutral-400 block truncate">{link.url}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleBarberCustomLink(barber.id, link.id)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded ${
                              link.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {link.active ? 'Aktif' : 'Off'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBarberCustomLink(barber.id, link.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 6: DESAIN & TEMA WARNA                 */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'design' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <div>
                  <h2 className="font-display font-bold text-base text-[#171717]">Pilihan Tema Visual Profil</h2>
                  <p className="text-xs text-neutral-500">
                    Sesuaikan warna bio-link kamu agar mencerminkan karakter barbershop atau gaya cukurmu.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {[
                    {
                      id: 'forest',
                      title: 'E Cukur Forest (Default)',
                      desc: 'Warna resmi E Cukur. Nuansa natural, sejuk, dan maskulin.',
                      preview: 'bg-[#F7F6F2] border-[#285844]',
                      dot: 'bg-[#285844]'
                    },
                    {
                      id: 'charcoal',
                      title: 'Studio Dark Charcoal',
                      desc: 'Gelap premium, modern lounge, dan kontras tajam.',
                      preview: 'bg-[#171717] text-white border-neutral-700',
                      dot: 'bg-[#10B981]'
                    },
                    {
                      id: 'asgar',
                      title: 'Asgar Heritage Linen',
                      desc: 'Hangat, ramah, tradisional turun-temurun khas pangkas Asgar.',
                      preview: 'bg-[#FAF6EE] border-[#B85D3B]',
                      dot: 'bg-[#B85D3B]'
                    },
                    {
                      id: 'monochrome',
                      title: 'Clean Minimal Monochrome',
                      desc: 'Hitam-putih tegas, bersih, dan modern tanpa distraksi.',
                      preview: 'bg-white border-black',
                      dot: 'bg-black'
                    }
                  ].map((thm) => (
                    <button
                      key={thm.id}
                      type="button"
                      onClick={() => handleProfileFieldChange('theme', thm.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                        (barber.theme || 'forest') === thm.id 
                          ? 'border-[#285844] shadow-md ring-2 ring-[#285844]/20' 
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${thm.dot}`} />
                        <h4 className="font-display font-bold text-sm text-[#171717]">{thm.title}</h4>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">{thm.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Shape Customizer */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-base text-[#171717]">Bentuk Tombol (Button Shape)</h2>
                
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'rounded', label: 'Rounded Soft', class: 'rounded-xl' },
                    { id: 'pill', label: 'Full Pill', class: 'rounded-full' },
                    { id: 'square', label: 'Sharp Modern', class: 'rounded-md' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => handleProfileFieldChange('buttonStyle', btn.id)}
                      className={`py-3 px-2 border-2 text-xs font-semibold transition-all ${btn.class} ${
                        (barber.buttonStyle || 'rounded') === btn.id 
                          ? 'border-[#285844] bg-[#D9E5DC]/40 text-[#285844]' 
                          : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════ */}
          {/* TAB 7: STATISTIK & FINANSIAL TERPADU        */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="border-b border-neutral-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold text-xl text-[#171717] flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-[#285844]" />
                    <span>Pusat Statistik & Finansial</span>
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Laporan terpadu seluruh pendapatan dari booking layanan cukur dan tip kopi pelanggan.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    title="Unduh laporan riwayat transaksi dalam format CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWithdrawModal}
                    className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Tarik Saldo</span>
                  </button>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    100% Cashless QRIS
                  </span>
                </div>
              </div>

              {/* 1. HERO CARD: SALDO DOMPET & TOTAL OMSET (ELEGANT LIGHT FINTECH THEME) */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-neutral-200/90 shadow-sm relative overflow-hidden space-y-6">
                {/* Top Subtle Brand Gradient Line */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#285844] via-emerald-500 to-amber-500" />
                
                {/* Ambient Soft Mesh Glow */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-50/60 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-50/40 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-neutral-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Saldo Siap Ditarik</span>
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium">Dompet Capster</span>
                    </div>

                    <div className="flex items-baseline gap-2 pt-1">
                      <h1 className="font-display font-black text-3xl sm:text-4xl text-[#171717] tracking-tight">
                        {formatRupiah(availableBalance)}
                      </h1>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Total omset masuk dikurangi penarikan yang sudah dicairkan ke rekening kamu.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:justify-end shrink-0">
                    <button
                      type="button"
                      onClick={handleOpenWithdrawModal}
                      disabled={availableBalance < 20000}
                      className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                        availableBalance >= 20000
                          ? 'bg-[#285844] hover:bg-[#1E4334] text-white cursor-pointer active:scale-95 shadow-emerald-900/10'
                          : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                      }`}
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>{availableBalance >= 20000 ? 'Tarik Saldo Sekarang' : 'Min. Tarik Rp 20.000'}</span>
                    </button>
                  </div>
                </div>

                {/* 3 Sumber Rincian Pendapatan (Color Coded & Modern) */}
                <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Omset Booking */}
                  <div className="bg-gradient-to-br from-emerald-50/70 to-emerald-50/20 p-4 rounded-xl border border-emerald-100 hover:border-emerald-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Scissors className="w-3.5 h-3.5" />
                        </span>
                        <span>Omset Booking</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
                        Layanan
                      </span>
                    </div>
                    <div className="font-display font-extrabold text-xl text-[#171717]">
                      {formatRupiah(totalBookingRevenue)}
                    </div>
                    <span className="text-[11px] text-emerald-700/80 font-medium mt-1 block">
                      {paidBookings.length} booking terbayar QRIS
                    </span>
                  </div>

                  {/* Total Tip Kopi */}
                  <div className="bg-gradient-to-br from-amber-50/70 to-amber-50/20 p-4 rounded-xl border border-amber-100 hover:border-amber-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Coffee className="w-3.5 h-3.5" />
                        </span>
                        <span>Total Tip Kopi</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800">
                        Sawer
                      </span>
                    </div>
                    <div className="font-display font-extrabold text-xl text-amber-900">
                      {formatRupiah(totalTipRevenue)}
                    </div>
                    <span className="text-[11px] text-amber-700/80 font-medium mt-1 block">
                      {tipsList.length} apresiasi pelanggan
                    </span>
                  </div>

                  {/* Sudah Dicairkan */}
                  <div className="bg-gradient-to-br from-neutral-50 to-neutral-50/40 p-4 rounded-xl border border-neutral-200/80 hover:border-neutral-300 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                        <span className="w-6 h-6 rounded-lg bg-neutral-200/80 text-neutral-700 flex items-center justify-center shrink-0">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </span>
                        <span>Sudah Dicairkan</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        Payout
                      </span>
                    </div>
                    <div className="font-display font-extrabold text-xl text-neutral-900">
                      {formatRupiah(totalWithdrawn)}
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium mt-1 block">
                      {(barber?.withdrawalsHistory || []).length} kali penarikan dana
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. REKENING PENCAIRAN DEFAULT CARD */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-neutral-700" />
                      <span>Rekening Tujuan Pencairan Saldo</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Rekening bank atau e-wallet utama kamu untuk menerima transfer hasil penarikan saldo.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-neutral-100 text-neutral-800 rounded-lg">
                    {barber?.payoutAccount?.bankName || 'BCA'} • {barber?.payoutAccount?.accountNumber || 'Belum diisi'}
                  </span>
                </div>

                <form onSubmit={handleSavePayoutAccount} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">
                        Bank / E-Wallet Tujuan
                      </label>
                      <select 
                        value={withdrawBank}
                        onChange={(e) => setWithdrawBank(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:border-neutral-900 focus:bg-white outline-none cursor-pointer"
                      >
                        <optgroup label="Bank Transfer">
                          <option value="BCA">BCA</option>
                          <option value="Mandiri">Bank Mandiri</option>
                          <option value="BRI">Bank BRI</option>
                          <option value="BNI">Bank BNI</option>
                          <option value="Bank Jago">Bank Jago</option>
                          <option value="SeaBank">SeaBank</option>
                          <option value="CIMB Niaga">CIMB Niaga</option>
                        </optgroup>
                        <optgroup label="E-Wallet">
                          <option value="GoPay">GoPay</option>
                          <option value="DANA">DANA</option>
                          <option value="OVO">OVO</option>
                          <option value="ShopeePay">ShopeePay</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">
                        Nomor Rekening / No. HP
                      </label>
                      <input 
                        type="text" 
                        value={withdrawAccNumber}
                        onChange={(e) => setWithdrawAccNumber(e.target.value)}
                        placeholder="Contoh: 8271928192"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-mono font-medium focus:border-neutral-900 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">
                        Atas Nama Pemilik Rekening
                      </label>
                      <input 
                        type="text" 
                        value={withdrawAccHolder}
                        onChange={(e) => setWithdrawAccHolder(e.target.value)}
                        placeholder="Nama lengkap di rekening"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:border-neutral-900 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-sm"
                    >
                      Simpan Rekening Pencairan
                    </button>
                  </div>
                </form>
              </div>

              {/* 3. RIWAYAT PENARIKAN DANA (WITHDRAWALS LEDGER) */}
              {(barber?.withdrawalsHistory || []).length > 0 && (
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                        <ArrowDownToLine className="w-4 h-4 text-neutral-700" />
                        <span>Riwayat Penarikan Dana</span>
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Catatan pencairan dana dari saldo platform ke rekening pribadi kamu.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg">
                      {(barber?.withdrawalsHistory || []).length} Penarikan
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 text-[11px]">
                          <th className="py-2.5 px-3 font-semibold">Ref ID</th>
                          <th className="py-2.5 px-3 font-semibold">Nominal</th>
                          <th className="py-2.5 px-3 font-semibold">Rekening Tujuan</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {(barber?.withdrawalsHistory || []).map((wd) => (
                          <tr key={wd.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-3 font-mono text-neutral-500 text-[11px]">
                              {wd.referenceId || wd.id}
                            </td>
                            <td className="py-3 px-3 font-bold text-neutral-900 font-mono">
                              -{formatRupiah(wd.amount)}
                            </td>
                            <td className="py-3 px-3 text-neutral-600">
                              {wd.bankName} - {wd.accountNumber} ({wd.accountHolder})
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {wd.status || 'Berhasil Ditransfer'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-neutral-400 font-mono text-right text-[11px]">
                              {formatLedgerDate(wd.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. METRICS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 hover:border-neutral-300 shadow-2xs hover:shadow-xs transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold">
                      Total Reservasi
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-[#285844]" />
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-3xl text-[#171717]">
                    {barberBookings.length}
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium block">
                    <span className="text-emerald-700 font-bold">{paidBookings.length}</span> terbayar • {barberBookings.length - paidBookings.length} menunggu
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 hover:border-neutral-300 shadow-2xs hover:shadow-xs transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold">
                      Rata-rata Pesanan
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-[#285844]" />
                    </span>
                  </div>
                  <div className="font-display font-extrabold text-2xl text-[#285844]">
                    {formatRupiah(paidBookings.length > 0 ? Math.round(totalBookingRevenue / paidBookings.length) : 0)}
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium block">
                    per transaksi reservasi cukur
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 hover:border-neutral-300 shadow-2xs hover:shadow-xs transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold">
                      Layanan Terpopuler
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    </span>
                  </div>
                  <div className="font-display font-bold text-base text-[#171717] truncate">
                    {(() => {
                      const counts = {};
                      barberBookings.forEach(b => {
                        const name = b.serviceName || 'Layanan';
                        counts[name] = (counts[name] || 0) + 1;
                      });
                      const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
                      return top || (barber.services?.[0]?.name || 'Belum ada pesanan');
                    })()}
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium block">
                    Paling sering dipilih pelanggan
                  </span>
                </div>
              </div>

              {/* 5. REALTIME 7-DAY BOOKINGS DISTRIBUTION */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-sm text-[#171717]">Aktivitas Reservasi (7 Hari Terakhir)</h3>
                  <span className="text-xs font-mono text-neutral-500">Realtime Database</span>
                </div>

                {barberBookings.length > 0 ? (
                  <div className="h-40 flex items-end justify-between gap-2 pt-6">
                    {weeklyChartData.last7.map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-500">{bar.count}</span>
                        <div 
                          style={{ height: `${Math.max(12, (bar.count / weeklyChartData.maxVal) * 100)}%` }}
                          className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                            bar.count > 0 ? 'bg-gradient-to-t from-[#285844] to-emerald-500 hover:to-emerald-400' : 'bg-neutral-200/80'
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-neutral-600">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-neutral-400">
                    <p className="text-sm font-medium">Belum ada aktivitas reservasi dalam 7 hari terakhir.</p>
                    <p className="text-xs text-neutral-400 mt-1">Grafik aktivitas akan otomatis terbentuk seiring masuknya pesanan via link bio Anda.</p>
                  </div>
                )}
              </div>

              {/* 6. GABUNGAN RIWAYAT TRANSAKSI TERAKHIR (BOOKING & TIP) */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-neutral-700" />
                      <span>Aliran Transaksi Terkini (Booking & Tip Kopi)</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Catatan gabungan seluruh pembayaran masuk yang telah terverifikasi via QRIS.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg">
                    {combinedRecentTransactions.length} Transaksi Terakhir
                  </span>
                </div>

                {combinedRecentTransactions.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400">
                    <Receipt className="w-7 h-7 mx-auto mb-2 opacity-40 text-neutral-500" />
                    <p className="text-xs font-medium text-neutral-600">Belum ada transaksi yang terverifikasi</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Transaksi booking dan tip yang berhasil akan otomatis muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 text-[11px]">
                          <th className="py-2.5 px-3 font-semibold">Tipe</th>
                          <th className="py-2.5 px-3 font-semibold">Deskripsi Layanan / Paket</th>
                          <th className="py-2.5 px-3 font-semibold">Pelanggan</th>
                          <th className="py-2.5 px-3 font-semibold">Nominal</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {combinedRecentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                                tx.type === 'BOOKING'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                {tx.badge}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-medium text-neutral-900">
                              {tx.title}
                            </td>
                            <td className="py-3 px-3 text-neutral-600">
                              {tx.customerName}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700 font-mono">
                              +{formatRupiah(tx.amount)}
                            </td>
                            <td className="py-3 px-3 text-neutral-400 font-mono text-right text-[11px]">
                              {formatLedgerDate(tx.date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* TAB 8: CETAK & BAGIKAN QR CODE             */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'qrcode' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-neutral-200 shadow-sm text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#D9E5DC] text-[#285844] flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h2 className="font-display font-black text-xl text-[#171717]">QR Code Siap Cetak</h2>
                <p className="text-xs text-neutral-500 mt-1 mb-6">
                  Cetak dan tempelkan QR Code ini di meja kasir atau cermin barber agar pelanggan langsung scan untuk pilih jam & booking.
                </p>

                {/* Simulated High-Res QR Placard */}
                <div className="p-6 bg-[#F7F6F2] rounded-2xl border-2 border-neutral-300 inline-block shadow-inner mb-6 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-3 text-xs font-bold font-display text-[#285844]">
                    <Scissors className="w-4 h-4" />
                    <span>{barber.name}</span>
                  </div>

                  {/* QR Code Graphic */}
                  <div className="w-44 h-44 bg-white p-3 rounded-xl border border-neutral-300 mx-auto shadow-sm flex items-center justify-center relative">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="font-mono text-[11px] text-[#171717] font-bold mt-3">
                    {appDomain}/{barber.slug || barber.id}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Scan untuk Menu & Booking Jadwal</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-3 px-4 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm transition-transform active:scale-95"
                  >
                    Cetak / Simpan PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-[#171717] font-semibold text-xs rounded-xl border border-neutral-300 transition-colors"
                  >
                    Salin Tautan Bio
                  </button>
                </div>
              </div>

            </motion.div>
          )}

        </div>

        {/* ─── RIGHT COLUMN: STATIONARY LIVE SMARTPHONE PREVIEW (4 COLS) ─── */}
        <div className="hidden lg:flex lg:col-span-4 lg:h-full flex-col justify-center items-center py-2 select-none">
          
          <div className="w-[270px] xl:w-[285px] mb-2 flex items-center justify-between px-1 shrink-0">
            <span className="text-[11px] font-mono text-neutral-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Phone Preview
            </span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#285844] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Buka Tab Baru</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Smartphone Hardware Frame - Stationary & Never Scrolls With Page */}
          <div className="w-[270px] xl:w-[285px] bg-[#171717] rounded-[42px] p-2.5 shadow-2xl border-[3px] border-neutral-800 text-[#171717] relative shrink-0">
            
            {/* Phone Camera Notch & Ear Speaker */}
            <div className="w-20 h-3 bg-neutral-900 rounded-full mx-auto mb-1.5 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-800 mr-1.5" />
              <div className="w-6 h-0.5 rounded-full bg-neutral-800" />
            </div>

            {/* Inner Mobile Screen Content - Scrollable Inside Phone */}
            <div className="rounded-[32px] overflow-hidden border border-neutral-300/30 h-[440px] xl:h-[480px] 2xl:h-[520px] max-h-[calc(100vh-170px)] overflow-y-auto scrollbar-none shadow-inner bg-white relative">
              <BarberBioLink customBarber={previewBarber || barber} isPreview={true} />
            </div>

          </div>

        </div>

      </main>

      <button
        type="button"
        onClick={() => navigate('/barber/messages')}
        className="fixed md:hidden right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-[#285844] px-4 py-3 text-sm font-semibold text-white shadow-[0_5px_0_#173829,0_10px_22px_rgba(40,88,68,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1E4334] active:translate-y-0"
        aria-label={`Buka pesan${unreadChatCount > 0 ? `, ${unreadChatCount} belum dibaca` : ''}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span>Pesan</span>
        {unreadChatCount > 0 && (
          <span className="min-w-5 h-5 px-1 rounded-full bg-white text-[#285844] text-[10px] font-bold flex items-center justify-center shadow-sm">
            {unreadChatCount > 99 ? '99+' : unreadChatCount}
          </span>
        )}
      </button>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: ADD / EDIT SERVICE ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddServiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddServiceOpen(false)}
                className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-display font-bold text-lg text-[#171717] mb-1">
                {editingServiceId ? 'Edit Layanan Cukur' : 'Tambah Layanan Baru'}
              </h3>
              <p className="text-xs text-neutral-500 mb-5">
                Masukkan detail nama treatment, tarif, dan estimasi waktu.
              </p>

              <form onSubmit={handleSaveService} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Nama Layanan</label>
                  <input 
                    type="text"
                    required
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Classic Cut & Wash"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Harga (Rp)</label>
                    <input 
                      type="number"
                      required
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full text-sm font-mono font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Durasi</label>
                    <input 
                      type="text"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(e.target.value)}
                      placeholder="e.g. 45m"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Tag Kategori (Opsional)</label>
                  <input 
                    type="text"
                    value={newServiceTag}
                    onChange={(e) => setNewServiceTag(e.target.value)}
                    placeholder="e.g. Best Seller, Trending, Hemat"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Deskripsi Singkat</label>
                  <textarea 
                    rows={2}
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                    placeholder="Penjelasan apa saja yang didapat pelanggan..."
                    className="w-full text-xs font-normal p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddServiceOpen(false)}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm"
                  >
                    {editingServiceId ? 'Simpan Perubahan' : 'Tambahkan Layanan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: BUAT POSTINGAN FEED (INSTAGRAM STYLE) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddLookbookOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-neutral-200 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => {
                  setIsAddLookbookOpen(false);
                  setLookbookFile(null);
                  setLookbookCompressionStats(null);
                }}
                className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full cursor-pointer transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="p-2 rounded-xl bg-[#D9E5DC] text-[#285844]">
                  <Camera className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#171717]">
                    Buat Postingan Feed
                  </h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Unggah foto untuk galeri feed & portofolio
              </p>

              {/* Hidden native file input */}
              <input 
                type="file"
                ref={lookbookFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLookbookFileSelect(file);
                }}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <form onSubmit={handleSaveLookbook} className="space-y-4">
                {/* 1. PHOTO SELECTION ZONE */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                    Foto Postingan
                  </label>

                  {newLookbookImg ? (
                    <div className="relative rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-900 p-3 flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-800 relative flex items-center justify-center">
                        <img 
                          src={newLookbookImg} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 text-white space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Foto Siap Diposting</span>
                        </div>

                        {lookbookCompressionStats && (
                          <div className="text-[11px] text-neutral-300 space-y-0.5">
                            <p className="font-mono">
                              {lookbookCompressionStats.originalFormatted} → <span className="text-emerald-300 font-bold">{lookbookCompressionStats.compressedFormatted}</span>
                              <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">
                                Hemat {lookbookCompressionStats.savedPercent}%
                              </span>
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              Dimensi: {lookbookCompressionStats.width} × {lookbookCompressionStats.height} px (Rasio asli terjaga)
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => lookbookFileInputRef.current?.click()}
                          className="mt-1 text-xs text-neutral-300 hover:text-white underline cursor-pointer inline-block"
                        >
                          Ganti foto lain
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingLookbook(true); }}
                      onDragLeave={() => setIsDraggingLookbook(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingLookbook(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleLookbookFileSelect(file);
                      }}
                      onClick={() => lookbookFileInputRef.current?.click()}
                      className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isDraggingLookbook 
                          ? 'border-[#285844] bg-[#D9E5DC]/30 scale-[1.01]' 
                          : 'border-neutral-300 hover:border-[#285844] bg-neutral-50 hover:bg-neutral-50/50'
                      }`}
                    >
                      {isCompressingLookbook ? (
                        <div className="py-3 flex flex-col items-center">
                          <RefreshCw className="w-7 h-7 text-[#285844] animate-spin mb-2" />
                          <p className="text-xs font-semibold text-[#171717]">Mengoptimalkan gambar...</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Menyesuaikan resolusi tanpa memotong proporsi</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-2.5">
                            <Camera className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-[#171717]">
                            Pilih foto dari galeri HP / Komputer atau seret ke sini
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-snug">
                            Mendukung JPG, PNG, atau WebP.
                          </p>
                          <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md font-medium border border-emerald-200">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kompresi cerdas: Rasio aspek asli tidak dipotong</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. CAPTION INPUT (INSTAGRAM STYLE TEXTAREA) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      Caption Postingan
                    </label>
                  </div>
                  <textarea 
                    rows={3}
                    value={newLookbookTitle}
                    onChange={(e) => setNewLookbookTitle(e.target.value)}
                    placeholder="Tulis caption postinganmu..."
                    className="w-full text-xs font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844] resize-none leading-relaxed"
                  />
                </div>

                {/* 3. TAG CHIPS & CUSTOM HASHTAG */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      Topik / Hashtag (Opsional)
                    </label>
                    {newLookbookTag && (
                      <button
                        type="button"
                        onClick={() => setNewLookbookTag('')}
                        className="text-[10px] text-neutral-400 hover:text-red-600 cursor-pointer"
                      >
                        Hapus tag
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['Daily Vibe', 'Suasana Studio', 'Hasil Cukur', 'Grooming & Tools', 'Promo', 'Behind The Scene'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewLookbookTag(newLookbookTag === tag ? '' : tag)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                          newLookbookTag === tag 
                            ? 'bg-[#285844] text-white shadow-xs' 
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text"
                    value={newLookbookTag}
                    onChange={(e) => setNewLookbookTag(e.target.value)}
                    placeholder="e.g. #barberlife #weekend #chill (atau ketik tag sendiri)"
                    className="w-full text-xs font-medium p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-[#285844]"
                  />
                </div>

                {/* MODAL ACTION BUTTONS */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddLookbookOpen(false);
                      setLookbookFile(null);
                      setLookbookCompressionStats(null);
                    }}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingPhoto || isCompressingLookbook || !newLookbookImg}
                    className="flex-1 py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Memposting ke Feed...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Bagikan ke Feed</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: ADD CUSTOM LINK ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddLinkOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddLinkOpen(false)}
                className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-display font-bold text-lg text-[#171717] mb-1">
                Tambah Tautan Kustom
              </h3>
              <p className="text-xs text-neutral-500 mb-4">
                Pasang tombol link ke Google Maps, toko online, atau artikel.
              </p>

              <form onSubmit={handleSaveCustomLink} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Judul Tombol</label>
                  <input 
                    type="text"
                    required
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g. 📍 Petunjuk Arah Google Maps"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">URL Tujuan</label>
                  <input 
                    type="text"
                    required
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddLinkOpen(false)}
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm"
                  >
                    Pasang Link
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: TAMBAH CAPSTER (TIM) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddTeamOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAddTeamOpen(false)}
                className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-display font-bold text-lg text-[#171717] mb-1">
                Tambah Capster Baru
              </h3>
              <p className="text-xs text-neutral-500 mb-5">
                Daftarkan tukang cukur yang bertugas di barbershop ini.
              </p>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTeamName.trim()) return;
                  addBarberTeamMember(barber.id, {
                    name: newTeamName.trim(),
                    specialty: newTeamSpecialty.trim() || 'Capster Professional',
                    schedule: newTeamSchedule.trim() || 'Setiap Hari',
                    photo: newTeamPhoto.trim() || '',
                    status: 'AVAILABLE'
                  });
                  setIsAddTeamOpen(false);
                  showToast(`Capster ${newTeamName.trim()} berhasil ditambahkan!`);
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Nama Capster</label>
                  <input 
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g. Mas Doni / Bang Ical"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Keahlian / Spesialisasi</label>
                  <input 
                    type="text"
                    value={newTeamSpecialty}
                    onChange={(e) => setNewTeamSpecialty(e.target.value)}
                    placeholder="e.g. Fade Master, Two Block, Shaving & Beard"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Jadwal Shift / Hari Kerja</label>
                  <input 
                    type="text"
                    value={newTeamSchedule}
                    onChange={(e) => setNewTeamSchedule(e.target.value)}
                    placeholder="e.g. Senin - Sabtu (10:00 - 20:00)"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Foto Capster (Unggah & Kompres Otomatis)
                  </label>
                  
                  {/* Hidden file input for team photo */}
                  <input
                    type="file"
                    ref={teamPhotoInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleTeamPhotoSelect(file);
                    }}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />

                  <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                    <div 
                      onClick={() => teamPhotoInputRef.current?.click()}
                      className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0 flex items-center justify-center cursor-pointer relative group"
                    >
                      {newTeamPhoto ? (
                        <img src={newTeamPhoto} alt="Capster" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-neutral-400 group-hover:text-black" />
                      )}
                      {isCompressingTeamPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => teamPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-neutral-300 hover:border-[#285844] text-xs font-semibold rounded-lg text-neutral-700 hover:text-black cursor-pointer shadow-xs"
                      >
                        {newTeamPhoto ? 'Ganti Foto' : 'Pilih Foto dari HP'}
                      </button>
                      {teamPhotoStats ? (
                        <p className="text-[10px] text-emerald-700 font-medium mt-1">
                          ✓ Terkompresi: {teamPhotoStats.originalFormatted} → {teamPhotoStats.compressedFormatted} (-{teamPhotoStats.savedPercent}%)
                        </p>
                      ) : (
                        <p className="text-[10px] text-neutral-400 mt-1">
                          Otomatis dikompres 1:1 persegi (max 500px)
                        </p>
                      )}
                    </div>
                  </div>

                  <input 
                    type="url"
                    value={newTeamPhoto}
                    onChange={(e) => {
                      setNewTeamPhoto(e.target.value);
                      setTeamPhotoStats(null);
                    }}
                    placeholder="Atau tempel link URL foto..."
                    className="w-full text-xs font-mono p-2.5 mt-2 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddTeamOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#285844] hover:bg-[#1E4334] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Simpan Capster
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: TARIK SALDO TIP (MIN. RP 15.000) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MOBILE BOTTOM DRAWER FOR PHONE PREVIEW ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {showMobilePreview && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[#F7F6F2] rounded-t-3xl h-[90vh] flex flex-col p-4 border-t border-neutral-300 shadow-2xl relative"
            >
              <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0" />
              <div className="flex justify-between items-center mb-3 px-2 shrink-0">
                <span className="font-display font-bold text-sm text-[#171717]">Live Preview Asli di Layar HP</span>
                <button 
                  onClick={() => setShowMobilePreview(false)}
                  className="p-1.5 bg-neutral-200 rounded-full text-neutral-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Real BarberBioLink inside Drawer */}
              <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-neutral-200 shadow-sm relative">
                <BarberBioLink customBarber={previewBarber || barber} isPreview={true} />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ MODAL: KELOLA & UPGRADE PAKET BERLANGGANAN ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-neutral-200 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsUpgradeModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-black rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center max-w-md mx-auto mb-6">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#285844] font-bold">
                  Paket & Kuota Akun
                </span>
                <h3 className="font-display font-extrabold text-2xl text-[#171717] mt-1">
                  Pilih Paket Sesuai Kebutuhan
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Tingkatkan paket untuk menambah kuota layanan, portofolio tanpa batas, dan fitur tim barbershop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                
                {/* 1. Paket Free */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  isFreePlan ? 'border-2 border-neutral-900 bg-neutral-50/60 shadow-xs' : 'border-neutral-200 bg-white'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-800">Free</span>
                      {isFreePlan && (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[9.5px] font-bold">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="font-display font-black text-xl text-[#171717] mb-2">
                      Rp 0 <span className="text-[10px] text-neutral-400 font-mono font-normal">/selamanya</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-neutral-600 mb-4">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Maks. <strong>5 layanan</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Maks. <strong>10 portofolio</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Booking & QRIS</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Sawer Tip Kopi</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isFreePlan}
                    onClick={() => handleSwitchPlan('free')}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isFreePlan 
                        ? 'bg-neutral-200 text-neutral-500 cursor-default' 
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    {isFreePlan ? 'Paket Aktif' : 'Pilih Free'}
                  </button>
                </div>

                {/* 2. Paket Capster */}
                <div className={`p-4 rounded-2xl border-2 flex flex-col justify-between relative transition-all ${
                  isCapsterPlan ? 'border-[#285844] bg-[#D9E5DC]/25 shadow-xs' : 'border-[#285844]/60 bg-white'
                }`}>
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#285844] text-white text-[9px] font-bold">
                      🔥 Populer
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2 mt-1">
                      <span className="text-xs font-bold text-[#285844]">Capster Pro</span>
                      {isCapsterPlan && (
                        <span className="px-2 py-0.5 rounded-full bg-[#285844] text-white text-[9.5px] font-bold">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="font-display font-black text-xl text-[#171717] mb-2">
                      Rp 49.000 <span className="text-[10px] text-neutral-400 font-mono font-normal">/bln</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-neutral-700 mb-4">
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Layanan <strong>Unlimited</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Foto <strong>Unlimited</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Mode Home Service</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Centang Emas Pro</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isCapsterPlan}
                    onClick={() => handleSwitchPlan('capster')}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCapsterPlan 
                        ? 'bg-emerald-200 text-emerald-900 cursor-default' 
                        : 'bg-[#285844] hover:bg-[#1E4334] text-white shadow-sm'
                    }`}
                  >
                    {isCapsterPlan ? 'Paket Aktif' : 'Pilih Capster'}
                  </button>
                </div>

                {/* 3. Paket Barber */}
                <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  isBarberPlan ? 'border-2 border-amber-500 bg-amber-50/40 shadow-xs' : 'border-neutral-200 bg-white'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span>Barber Studio</span>
                      </span>
                      {isBarberPlan && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9.5px] font-bold">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="font-display font-black text-xl text-[#171717] mb-2">
                      Rp 99.000 <span className="text-[10px] text-neutral-400 font-mono font-normal">/bln</span>
                    </div>
                    <ul className="space-y-2 text-[11px] text-neutral-700 mb-4">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Semua fitur Capster</span>
                      </li>
                      <li className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Tim Multi-Capster</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Pilih Capster saat booking</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Ekspor CSV & Official Studio</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isBarberPlan}
                    onClick={() => handleSwitchPlan('barber')}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isBarberPlan 
                        ? 'bg-amber-200 text-amber-900 cursor-default' 
                        : 'border-2 border-[#285844] text-[#285844] hover:bg-[#285844] hover:text-white'
                    }`}
                  >
                    {isBarberPlan ? 'Paket Aktif' : 'Pilih Barber'}
                  </button>
                </div>

              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-[11px] text-neutral-500">
                💡 Kamu dapat berganti paket kapan saja. Perubahan paket dan batasan kuota berlaku seketika pada akun bio link kamu.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PENARIKAN SALDO DARI STATISTIK */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full border border-neutral-200 shadow-xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-black rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="font-display font-bold text-lg text-[#171717] flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-emerald-700" />
                  <span>Tarik Saldo Pendapatan</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pencairan saldo omset booking & tip ke rekening bank atau e-wallet kamu.
                </p>
              </div>

              {/* Saldo Dompet Info Card (Light Emerald Theme) */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-teal-50/40 border border-emerald-200/80 mb-4">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Saldo Siap Ditarik</span>
                  </span>
                  <span className="text-[10.5px] text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md font-bold">Min. Rp 20.000</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <span className="font-display font-black text-2xl tracking-tight text-[#171717]">
                    {formatRupiah(availableBalance)}
                  </span>
                  {availableBalance >= 20000 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(availableBalance))}
                      className="text-xs font-bold text-[#285844] hover:text-[#1E4334] underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Tarik Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Form Penarikan */}
              <form onSubmit={handleSubmitWithdraw} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Nominal Penarikan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      Rp
                    </span>
                    <input 
                      type="number" 
                      required
                      min="20000"
                      step="1000"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="20000"
                      className="w-full text-sm font-bold pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[20000, 50000, 100000, 200000].map((amt) => {
                      const isAvailable = availableBalance >= amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setWithdrawAmount(String(amt))}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                            Number(withdrawAmount) === amt 
                              ? 'bg-[#285844] text-white border-[#285844] shadow-xs'
                              : isAvailable 
                                ? 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200' 
                                : 'bg-neutral-50 text-neutral-300 border-neutral-100 cursor-not-allowed'
                          }`}
                        >
                          Rp {amt.toLocaleString('id-ID')}
                        </button>
                      );
                    })}
                  </div>

                  {withdrawAmount && Number(withdrawAmount) < 20000 && (
                    <p className="text-[11px] text-rose-600 mt-1.5">
                      Batas minimal penarikan adalah Rp 20.000
                    </p>
                  )}
                  {withdrawAmount && Number(withdrawAmount) > availableBalance && (
                    <p className="text-[11px] text-rose-600 mt-1.5">
                      Nominal melebihi saldo dompet yang tersedia
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Bank / E-Wallet Tujuan
                    </label>
                    <select
                      value={withdrawBank}
                      onChange={(e) => setWithdrawBank(e.target.value)}
                      className="w-full text-xs font-medium p-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none focus:border-neutral-900 focus:bg-white cursor-pointer"
                    >
                      <optgroup label="Bank">
                        <option value="BCA">BCA</option>
                        <option value="Mandiri">Bank Mandiri</option>
                        <option value="BRI">Bank BRI</option>
                        <option value="BNI">Bank BNI</option>
                        <option value="Bank Jago">Bank Jago</option>
                        <option value="SeaBank">SeaBank</option>
                        <option value="Permata">Bank Permata</option>
                        <option value="CIMB Niaga">CIMB Niaga</option>
                      </optgroup>
                      <optgroup label="E-Wallet">
                        <option value="DANA">DANA</option>
                        <option value="GoPay">GoPay</option>
                        <option value="OVO">OVO</option>
                        <option value="ShopeePay">ShopeePay</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Nomor Rekening / No. HP
                    </label>
                    <input 
                      type="text" 
                      required
                      value={withdrawAccNumber}
                      onChange={(e) => setWithdrawAccNumber(e.target.value)}
                      placeholder="Nomor rekening / HP"
                      className="w-full text-xs font-mono font-medium p-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Atas Nama Pemilik Rekening
                  </label>
                  <input 
                    type="text" 
                    required
                    value={withdrawAccHolder}
                    onChange={(e) => setWithdrawAccHolder(e.target.value)}
                    placeholder="Nama lengkap di rekening"
                    className="w-full text-xs font-medium p-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Summary Box */}
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
                  <div className="flex justify-between text-neutral-600">
                    <span>Nominal:</span>
                    <span className="font-medium text-neutral-900">
                      Rp {Number(withdrawAmount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Biaya Admin:</span>
                    <span className="font-medium text-emerald-600">Gratis (Rp 0)</span>
                  </div>
                  <div className="pt-1.5 border-t border-neutral-200 flex justify-between font-bold text-neutral-900">
                    <span>Total Diterima:</span>
                    <span>
                      Rp {Number(withdrawAmount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !withdrawAmount || 
                      Number(withdrawAmount) < 20000 || 
                      Number(withdrawAmount) > availableBalance ||
                      !withdrawAccNumber.trim() || 
                      !withdrawAccHolder.trim()
                    }
                    className="px-5 py-2.5 bg-[#285844] hover:bg-[#1E4334] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    Kirim Penarikan
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
