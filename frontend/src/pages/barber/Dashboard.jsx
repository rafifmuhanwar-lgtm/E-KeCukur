import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, 
  User, 
  MapPin, 
  Phone, 
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
  Save
} from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';
import BarberBioLink from '../customer/BarberBioLink';
import { compressImage } from '../../lib/imageUploader';
import { getAppDomain } from '../../lib/domain';
import { isSupabaseConfigured } from '../../lib/supabase';

const computeWeeklyChartData = (bookingsList) => {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = Date.now();
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayName = days[d.getDay()];
    const isoDate = d.toISOString().split('T')[0];
    const count = bookingsList.filter(b => {
      if (!b.createdAt && !b.date) return false;
      const bDate = b.createdAt ? b.createdAt.split('T')[0] : b.date;
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
  const addBarberTip = useStore((state) => state.addBarberTip);
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
    return bookings.filter(
      (b) => b.barberId === barber.id || b.barberName.toLowerCase() === barber.name.toLowerCase() || !b.barberId
    );
  }, [barber, bookings]);

  const weeklyChartData = React.useMemo(() => computeWeeklyChartData(barberBookings), [barberBookings]);

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
  const [newLookbookTag, setNewLookbookTag] = useState('Trending');
  const [lookbookFile, setLookbookFile] = useState(null);
  const [isCompressingLookbook, setIsCompressingLookbook] = useState(false);
  const [lookbookCompressionStats, setLookbookCompressionStats] = useState(null);
  const [isDraggingLookbook, setIsDraggingLookbook] = useState(false);
  const [lookbookInputMode, setLookbookInputMode] = useState('upload'); // 'upload' | 'url'
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
    const currentFeatures = barber.features || {
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

  if (barber?.slug !== undefined && barber.slug !== prevBarberSlug) {
    setPrevBarberSlug(barber.slug);
    setSlugInput(barber.slug);
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
      { amount: 10000, label: 'Kopi Hitam', price: '10K' },
      { amount: 25000, label: 'Kopi Susu', price: '25K' },
      { amount: 50000, label: 'V60 Special', price: '50K' },
    ]
  };

  const handleTippingFieldChange = (field, value) => {
    updateBarberTippingConfig(barber.id, { [field]: value });
  };

  const handlePresetChange = (index, field, value) => {
    const newPresets = [...(tippingConfig.presets || [])];
    newPresets[index] = { ...newPresets[index], [field]: value };
    updateBarberTippingConfig(barber.id, { presets: newPresets });
  };

  const handleSimulateIncomingTip = () => {
    const presets = tippingConfig.presets || [
      { amount: 10000, label: 'Kopi Hitam' },
      { amount: 25000, label: 'Kopi Susu' },
      { amount: 50000, label: 'V60 Special' }
    ];
    const picked = presets[Math.floor(Math.random() * presets.length)];
    const names = ['Rian Pratama', 'Budi Santoso', 'Kevin Ardiansyah', 'Agung Nugroho', 'Fajar Ramadhan', 'Dedi Wijaya'];
    const messages = [
      'Guntingan fade-nya rapi banget bang!',
      'Langganan terus di sini, mantap!',
      'Kopinya buat nemenin cukur ya bro 🙏',
      'Pelayanan top markotop, makasih banyak!',
      'Hasil potongannya pas sesuai request!'
    ];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    addBarberTip(barber.id, {
      customerName: randomName,
      amount: picked.amount,
      coffeeLabel: picked.label,
      message: randomMsg,
      method: 'Payment Gateway QRIS'
    });
    showToast(`Simulasi tip masuk Rp ${picked.amount.toLocaleString('id-ID')} dari ${randomName}!`);
  };

  // ─── WITHDRAWAL / PENCAIRAN SALDO STATE (MIN. RP 15.000) ───
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState(barber?.payoutAccount?.bankName || 'BCA');
  const [withdrawAccNumber, setWithdrawAccNumber] = useState(barber?.payoutAccount?.accountNumber || '');
  const [withdrawAccHolder, setWithdrawAccHolder] = useState(barber?.payoutAccount?.accountHolder || barber?.name || '');
  const [activeLedgerTab, setActiveLedgerTab] = useState('incoming'); // 'incoming' | 'withdrawals'

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
    const currentBal = typeof barber?.tipBalance === 'number' ? barber.tipBalance : 0;
    if (amt > currentBal) {
      showToast(`Saldo tidak mencukupi (Saldo saat ini: Rp ${currentBal.toLocaleString('id-ID')})`);
      return;
    }
    if (!withdrawAccNumber.trim() || !withdrawAccHolder.trim()) {
      showToast('Harap lengkapi nomor rekening dan nama pemilik rekening tujuan');
      return;
    }

    const res = requestBarberWithdrawal(barber.id, {
      amount: amt,
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
            ? 'Foto berhasil diupload ke Supabase Storage!' 
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

  // Lookbook Handlers
  const handleSaveLookbook = async (e) => {
    e.preventDefault();
    if (!newLookbookTitle.trim()) {
      showToast('Harap isi nama model potongan');
      return;
    }
    if (!newLookbookImg.trim()) {
      showToast('Harap pilih foto hasil cukur atau masukkan URL gambar');
      return;
    }

    if (lookbookFile && uploadBarberPortfolioPhoto) {
      setIsUploadingPhoto(true);
      const res = await uploadBarberPortfolioPhoto(barber.id, lookbookFile, {
        title: newLookbookTitle.trim(),
        tag: newLookbookTag
      });
      setIsUploadingPhoto(false);

      if (res.success) {
        const stats = res.stats || lookbookCompressionStats;
        const savingsMsg = stats ? ` (${stats.originalFormatted} → ${stats.compressedFormatted}, hemat ${stats.savedPercent}%)` : '';
        showToast(`Foto portofolio berhasil dikompres & disimpan${savingsMsg}!`);
      } else {
        addBarberLookbook(barber.id, {
          title: newLookbookTitle.trim(),
          img: newLookbookImg.trim(),
          tag: newLookbookTag
        });
        showToast('Foto hasil cukur berhasil ditambahkan');
      }
    } else {
      addBarberLookbook(barber.id, {
        title: newLookbookTitle.trim(),
        img: newLookbookImg.trim(),
        tag: newLookbookTag
      });
      showToast('Foto hasil cukur berhasil ditambahkan');
    }

    setIsAddLookbookOpen(false);
    setNewLookbookTitle('');
    setNewLookbookImg('');
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

  const PRESET_HAIRCUTS = [
    { title: 'Low Taper Fade', url: 'https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600', tag: 'Trending' },
    { title: 'Clean Mid Skin Fade', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600', tag: 'Classic' },
    { title: 'Two-Block Textured Perm', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=600', tag: 'Best Seller' },
    { title: 'Beard Fade & Razor Lineup', url: 'https://images.unsplash.com/photo-1517832606589-715753d4be36?q=80&w=600', tag: 'Sharp' }
  ];

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
          <h2 className="font-display font-extrabold text-lg text-[#171717]">Memuat Data Studio...</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5">Menghubungkan ke database Supabase...</p>
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#285844] hover:bg-emerald-50 border border-emerald-200 transition-colors whitespace-nowrap shrink-0"
            title="Buka percakapan konsultasi"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Pesan</span>
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
                    Tidak ada batasan akun kaku. Pilih preset cepat di bawah atau aktifkan/nonaktifkan modul apa pun secara bebas sesuai kebutuhan usahamu.
                  </p>
                </div>

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
                      active: barber.features?.booking !== false
                    },
                    {
                      key: 'team',
                      name: 'Tim Capster (Banyak Tukang Cukur)',
                      desc: 'Aktifkan jika usahamu memiliki beberapa capster. Pelanggan bisa memilih capster saat booking jadwal.',
                      icon: Users,
                      active: barber.features?.team === true
                    },
                    {
                      key: 'services',
                      name: 'Daftar Layanan & Transparansi Tarif',
                      desc: 'Menampilkan menu potong rambut, durasi pengerjaan, dan harga yang jelas untuk pelanggan.',
                      icon: Scissors,
                      active: barber.features?.services !== false
                    },
                    {
                      key: 'lookbook',
                      name: 'Galeri Portofolio Hasil Potong (Lookbook)',
                      desc: 'Pamerkan foto hasil guntingan terbaik. Matikan jika kamu belum sempat mengunggah foto portofolio.',
                      icon: Sparkles,
                      active: barber.features?.lookbook !== false
                    },
                    {
                      key: 'location',
                      name: 'Lokasi Studio Fisik & Google Maps',
                      desc: 'Menampilkan alamat lengkap dan rute navigasi. Matikan jika kamu melayani panggilan ke rumah (home service).',
                      icon: MapPin,
                      active: barber.features?.location !== false
                    },
                    {
                      key: 'tipping',
                      name: 'Sawer Tip Digital (Tip Kopi)',
                      desc: 'Beri opsi bagi pelanggan yang puas untuk mengirim tip apresiasi kopi secara digital.',
                      icon: Coffee,
                      active: barber.features?.tipping !== false
                    }
                  ].map((feat) => {
                    const Icon = feat.icon;
                    return (
                      <div key={feat.key} className="py-3.5 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            feat.active ? 'bg-[#D9E5DC] text-[#285844]' : 'bg-neutral-100 text-neutral-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#171717]">{feat.name}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                feat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                              }`}>
                                {feat.active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{feat.desc}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleFeature(feat.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1 ${
                            feat.active ? 'bg-[#285844]' : 'bg-neutral-300'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                            feat.active ? 'right-1' : 'left-1'
                          }`} />
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
                          Tarik & lepas foto langsung atau klik tombol di atas. Rekomendasi rasio 1:1 (persegi).
                        </p>
                        {profileStats ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-medium w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Dikompres otomatis: {profileStats.originalFormatted} → {profileStats.compressedFormatted} (hemat {profileStats.savedPercent}%)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-neutral-400 text-[11px]">
                            <Sparkles className="w-3 h-3 text-[#285844]" />
                            <span>Otomatis dikompres & dipotong 1:1 persegi agar loading cepat</span>
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
                  {(pendingBannerPreview || barber.bannerImage) ? (
                    <div className="space-y-3 mb-3">
                      {/* Banner Preview Card */}
                      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 h-36 sm:h-44 group shadow-sm">
                        <img 
                          src={pendingBannerPreview || barber.bannerImage} 
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

                {/* Role / Specialty & Segment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Spesialisasi / Keahlian</label>
                    <input 
                      type="text"
                      value={barber.specialty || ''}
                      onChange={(e) => handleProfileFieldChange('specialty', e.target.value)}
                      placeholder="e.g. Classic Cut & Fade Specialist"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Segmen Usaha</label>
                    <select
                      value={barber.segment || 'capster'}
                      onChange={(e) => handleProfileFieldChange('segment', e.target.value)}
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844] cursor-pointer"
                    >
                      <option value="capster">Capster Mandiri</option>
                      <option value="modern">Barbershop Modern</option>
                      <option value="asgar">Pangkas Tradisional (ASGAR)</option>
                      <option value="freelance">Barber Panggilan / Freelance</option>
                    </select>
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

              {/* ─── JADWAL OPERASIONAL & KETERSEDIAAN BOOKING ─── */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#285844]" />
                  <span>Jadwal Operasional & Ketersediaan Booking</span>
                </h2>

                {/* Status Toggle */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'AVAILABLE', label: '🟢 Buka (Siap Booking)', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                    { id: 'OCCUPIED', label: '🟡 Jadwal Padat', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                    { id: 'BREAK', label: '☕ Sedang Istirahat', color: 'border-blue-500 bg-blue-50 text-blue-900' },
                    { id: 'CLOSED', label: '🔴 Sedang Tutup', color: 'border-neutral-500 bg-neutral-100 text-neutral-800' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleProfileFieldChange('status', st.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                        barber.status === st.id 
                          ? st.color + ' shadow-sm font-bold scale-[1.02]' 
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Jam Buka - Tutup</label>
                    <input 
                      type="text"
                      value={barber.workingHours || ''}
                      onChange={(e) => handleProfileFieldChange('workingHours', e.target.value)}
                      placeholder="e.g. 10:00 - 21:00"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Hari Operasional</label>
                    <input 
                      type="text"
                      value={barber.openDays || ''}
                      onChange={(e) => handleProfileFieldChange('openDays', e.target.value)}
                      placeholder="e.g. Buka Setiap Hari / Senin - Sabtu"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Teks Badge Keterangan di Link Bio</label>
                  <input 
                    type="text"
                    value={barber.schedule || ''}
                    onChange={(e) => handleProfileFieldChange('schedule', e.target.value)}
                    placeholder="e.g. Buka 10:00 - 21:00 • Siap Terima Booking"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>
              </div>

              {/* Lokasi & WhatsApp Booking */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                <h2 className="font-display font-bold text-base text-[#171717] flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#285844]" />
                  <span>Kontak WhatsApp & Lokasi Alamat</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Nomor WhatsApp (awalan 62)</label>
                    <input 
                      type="text"
                      value={barber.whatsapp}
                      onChange={(e) => handleProfileFieldChange('whatsapp', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 6281234567890"
                      className="w-full text-sm font-mono font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Pesan Pembuka Otomatis WhatsApp</label>
                    <input 
                      type="text"
                      value={barber.whatsappMessage || ''}
                      onChange={(e) => handleProfileFieldChange('whatsappMessage', e.target.value)}
                      placeholder="e.g. Halo Mas, saya ingin booking slot cukur"
                      className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>

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

                        {b.status === 'Menunggu' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Terkonfirmasi');
                              showToast(`Booking ${b.id} dikonfirmasi!`);
                            }}
                            className="px-3 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                          >
                            Konfirmasi
                          </button>
                        )}

                        {b.status === 'Terkonfirmasi' && (
                          <button
                            type="button"
                            onClick={() => {
                              updateBookingStatus(b.id, 'Selesai');
                              showToast(`Booking ${b.id} selesai!`);
                            }}
                            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Tandai Selesai
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
          {/* TAB: SALDO TIP & PENARIKAN (WALLET)         */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'tipping' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* 1. WALLET HERO CARD */}
              <div className="bg-[#18181B] text-white p-6 sm:p-7 rounded-2xl border border-neutral-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                  <div>
                    <span className="text-xs font-medium text-neutral-400 block mb-1">
                      Dompet Saldo Tip
                    </span>
                    <div className="flex items-baseline gap-2">
                      <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
                        Rp {(typeof barber.tipBalance === 'number' ? barber.tipBalance : 0).toLocaleString('id-ID')}
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenWithdrawModal}
                      disabled={(barber.tipBalance || 0) < 15000}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                        (barber.tipBalance || 0) >= 15000 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm' 
                          : 'bg-neutral-800/80 text-neutral-400 cursor-not-allowed border border-neutral-700/60'
                      }`}
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Tarik Saldo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateIncomingTip}
                      className="px-3 py-2.5 rounded-xl text-neutral-400 hover:text-white border border-neutral-700/80 hover:border-neutral-600 text-xs font-medium transition-colors cursor-pointer"
                      title="Simulasikan ada pelanggan yang memberikan tip"
                    >
                      + Simulasi Tip (Rp 25.000)
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Minimal penarikan <strong>Rp 15.000</strong></span>
                    <span className="text-neutral-600">•</span>
                    <span>Biaya admin <strong>Gratis</strong></span>
                  </div>

                  {(barber.tipBalance || 0) < 15000 ? (
                    <span className="text-amber-400 font-medium text-[11px]">
                      Kurang Rp {(15000 - (barber.tipBalance || 0)).toLocaleString('id-ID')} lagi untuk tarik saldo
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium text-[11px]">
                      Saldo siap dicairkan ke rekening
                    </span>
                  )}
                </div>
              </div>

              {/* 2. STAT METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-xs font-medium text-neutral-500 block mb-1">
                    Total Tip Masuk
                  </span>
                  <div className="font-display font-bold text-2xl text-[#171717]">
                    Rp {((barber.tipsHistory || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0)).toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-neutral-400 mt-1 block">
                    {(barber.tipsHistory || []).length} transaksi
                  </span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-xs font-medium text-neutral-500 block mb-1">
                    Total Ditarik
                  </span>
                  <div className="font-display font-bold text-2xl text-[#171717]">
                    Rp {((barber.withdrawalsHistory || []).reduce((acc, w) => acc + (Number(w.amount) || 0), 0)).toLocaleString('id-ID')}
                  </div>
                  <span className="text-xs text-neutral-400 mt-1 block">
                    {(barber.withdrawalsHistory || []).length} penarikan berhasil
                  </span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-2xs">
                  <span className="text-xs font-medium text-neutral-500 block mb-1">
                    Rata-rata per Tip
                  </span>
                  <div className="font-display font-bold text-2xl text-[#171717]">
                    {(barber.tipsHistory || []).length > 0
                      ? `Rp ${Math.round(((barber.tipsHistory || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0)) / (barber.tipsHistory || []).length).toLocaleString('id-ID')}`
                      : 'Rp 0'}
                  </div>
                  <span className="text-xs text-neutral-400 mt-1 block">
                    per apresiasi pelanggan
                  </span>
                </div>
              </div>

              {/* 3. REKENING PENCAIRAN DEFAULT */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-neutral-700" />
                    <span>Rekening Tujuan Pencairan</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Data rekening atau e-wallet default untuk transfer hasil tip.
                  </p>
                </div>

                <form onSubmit={handleSavePayoutAccount} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 block mb-1">
                        Bank / E-Wallet
                      </label>
                      <select 
                        value={withdrawBank}
                        onChange={(e) => setWithdrawBank(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs font-medium focus:border-neutral-900 focus:bg-white outline-none cursor-pointer"
                      >
                        <option value="BCA">BCA</option>
                        <option value="Mandiri">Bank Mandiri</option>
                        <option value="BRI">Bank BRI</option>
                        <option value="BNI">Bank BNI</option>
                        <option value="Bank Jago">Bank Jago</option>
                        <option value="SeaBank">SeaBank</option>
                        <option value="GoPay">GoPay</option>
                        <option value="DANA">DANA</option>
                        <option value="OVO">OVO</option>
                        <option value="ShopeePay">ShopeePay</option>
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
                        Atas Nama Pemilik
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
                      className="px-4 py-2 bg-[#171717] hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                    >
                      Simpan Rekening
                    </button>
                  </div>
                </form>
              </div>

              {/* 4. PRESET PAKET TIP DI HALAMAN BIO */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-[#171717] flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-neutral-700" />
                    <span>Pilihan Paket Tip di Bio</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Nominal cepat yang dapat dipilih pelanggan saat mengirim tip.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {(tippingConfig.presets || []).map((preset, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-600">
                        <span>Pilihan {idx + 1}</span>
                        <span className="font-mono text-neutral-900">
                          Rp {Number(preset.amount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                          Nama Paket
                        </label>
                        <input 
                          type="text" 
                          value={preset.label || ''}
                          onChange={(e) => handlePresetChange(idx, 'label', e.target.value)}
                          placeholder="e.g. Kopi Hitam"
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-medium focus:border-neutral-900 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-neutral-600 block mb-1">
                          Nominal (Rp)
                        </label>
                        <input 
                          type="number" 
                          value={preset.amount || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            handlePresetChange(idx, 'amount', val);
                            handlePresetChange(idx, 'price', `${Math.round(val / 1000)}K`);
                          }}
                          placeholder="10000"
                          className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-mono font-medium focus:border-neutral-900 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-neutral-100">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Judul Ajakan
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

              {/* 5. RIWAYAT TRANSAKSI */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveLedgerTab('incoming')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        activeLedgerTab === 'incoming' 
                          ? 'bg-white text-neutral-900 shadow-2xs' 
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Tip Masuk ({(barber.tipsHistory || []).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveLedgerTab('withdrawals')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        activeLedgerTab === 'withdrawals' 
                          ? 'bg-white text-neutral-900 shadow-2xs' 
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      Penarikan ({(barber.withdrawalsHistory || []).length})
                    </button>
                  </div>
                </div>

                {/* Sub Tab: Tip Masuk */}
                {activeLedgerTab === 'incoming' && (
                  <div>
                    {(barber.tipsHistory || []).length === 0 ? (
                      <div className="py-10 text-center text-neutral-400">
                        <Coffee className="w-6 h-6 mx-auto mb-2 opacity-40 text-neutral-500" />
                        <p className="text-xs font-medium text-neutral-600">Belum ada tip yang masuk</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Tip dari pelanggan akan otomatis tercatat di sini.
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
                              <th className="py-2.5 px-3 font-semibold">Pesan</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Waktu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {(barber.tipsHistory || []).map((tip) => (
                              <tr key={tip.id} className="hover:bg-neutral-50/70 transition-colors">
                                <td className="py-3 px-3 font-semibold text-neutral-900">
                                  {tip.customerName || 'Pelanggan'}
                                </td>
                                <td className="py-3 px-3 font-bold text-emerald-700 font-mono">
                                  +Rp {Number(tip.amount || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-3 text-neutral-600">
                                  {tip.coffeeLabel || 'Kopi'}
                                </td>
                                <td className="py-3 px-3 text-neutral-500 max-w-xs truncate">
                                  {tip.message || '-'}
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
                )}

                {/* Sub Tab: Penarikan Dana */}
                {activeLedgerTab === 'withdrawals' && (
                  <div>
                    {(barber.withdrawalsHistory || []).length === 0 ? (
                      <div className="py-10 text-center text-neutral-400">
                        <ArrowDownToLine className="w-6 h-6 mx-auto mb-2 opacity-40 text-neutral-500" />
                        <p className="text-xs font-medium text-neutral-600">Belum ada riwayat penarikan</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Tarik saldo tip ke rekening bank kamu setelah mencapai minimal Rp 15.000.
                        </p>
                      </div>
                    ) : (
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
                            {(barber.withdrawalsHistory || []).map((wd) => (
                              <tr key={wd.id} className="hover:bg-neutral-50/70 transition-colors">
                                <td className="py-3 px-3 font-mono text-neutral-500 text-[11px]">
                                  {wd.referenceId || wd.id}
                                </td>
                                <td className="py-3 px-3 font-bold text-neutral-900 font-mono">
                                  Rp {Number(wd.amount || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-medium text-neutral-900">{wd.bankName} - {wd.accountNumber}</div>
                                  <div className="text-[11px] text-neutral-400">a.n {wd.accountHolder}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {wd.status || 'Berhasil'}
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
                    )}
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
              
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#171717]">Feed & Galeri Foto Bebas</h2>
                  <p className="text-xs text-neutral-500">
                    Unggah foto apa saja untuk feed profil Anda — hasil cukur, suasana studio, alat grooming, atau momen harian.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddLookbookOpen(true)}
                  className="px-4 py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Foto Feed</span>
                </button>
              </div>

              {/* Lookbook Grid (Instagram Style) */}
              {(barber.lookbook || []).length === 0 ? (
                <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-neutral-300 text-neutral-500">
                  <Eye className="w-9 h-9 mx-auto mb-2 text-neutral-400" />
                  <p className="font-semibold text-sm">Belum ada foto feed.</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Unggah foto apa saja untuk mengisi galeri feed profil Anda.</p>
                  <button
                    type="button"
                    onClick={() => setIsAddLookbookOpen(true)}
                    className="mt-3.5 px-4 py-2 bg-[#285844] text-white text-xs font-semibold rounded-xl"
                  >
                    Tambah Foto Pertama
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
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                        <h4 className="font-display font-bold text-xs text-[#171717] truncate">{item.title}</h4>
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
          {/* TAB 7: STATISTIK & ANALITIK               */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="border-b border-neutral-200 pb-2">
                <h2 className="font-display font-bold text-xl text-[#171717]">Performa Bio Link Kamu</h2>
                <p className="text-xs text-neutral-500">
                  Data konversi kunjungan dari Instagram, TikTok, dan QR code selama 30 hari terakhir.
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                  <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold block mb-1">
                    Total Reservasi Masuk
                  </span>
                  <div className="font-display font-extrabold text-3xl text-[#171717]">
                    {barberBookings.length}
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium mt-1 block">
                    {barberBookings.length > 0 ? 'Tercatat di sistem' : 'Belum ada reservasi masuk'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                  <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold block mb-1">
                    Estimasi Omset Layanan
                  </span>
                  <div className="font-display font-extrabold text-2xl text-[#285844]">
                    {formatRupiah(barberBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0))}
                  </div>
                  <span className="text-[11px] text-neutral-500 font-medium mt-1 block">
                    Akumulasi nilai pesanan
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                  <span className="text-[11px] font-mono uppercase text-neutral-500 font-semibold block mb-1">
                    Layanan Terpopuler
                  </span>
                  <div className="font-display font-bold text-base text-[#171717] truncate mt-1">
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
                  <span className="text-[11px] text-neutral-500 font-medium block mt-1">
                    Berdasarkan booking pelanggan
                  </span>
                </div>
              </div>

              {/* Real 7-Day Bookings Distribution */}
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
                            bar.count > 0 ? 'bg-[#285844] hover:bg-[#1E4334]' : 'bg-neutral-200'
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
      {/* ━━━ MODAL: ADD LOOKBOOK PHOTO ━━━ */}
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
                className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-black rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-[#D9E5DC] text-[#285844]">
                  <Scissors className="w-4 h-4" />
                </span>
                <h3 className="font-display font-bold text-lg text-[#171717]">
                  Tambah Foto Hasil Cukur
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                Unggah foto model potongan rambut untuk portofolio. Foto otomatis dikompres agar loading cepat tanpa memotong proporsi rambut.
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

              {/* Input Mode Selector */}
              <div className="flex p-1 bg-neutral-100 rounded-xl mb-4 border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setLookbookInputMode('upload')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    lookbookInputMode === 'upload' 
                      ? 'bg-white text-[#171717] shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#285844]" />
                  <span>Unggah Foto HP (Kompres Otomatis)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLookbookInputMode('url')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    lookbookInputMode === 'url' 
                      ? 'bg-white text-[#171717] shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                  <span>URL / Contoh Cepat</span>
                </button>
              </div>

              <form onSubmit={handleSaveLookbook} className="space-y-4">
                {/* 1. PHOTO SELECTION ZONE */}
                {lookbookInputMode === 'upload' ? (
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                      Foto Potongan Rambut
                    </label>

                    {newLookbookImg ? (
                      <div className="relative rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-900 p-3 flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-800 relative">
                          <img 
                            src={newLookbookImg} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0 text-white space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Foto Berhasil Dikompres</span>
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
                                Dimensi: {lookbookCompressionStats.width} × {lookbookCompressionStats.height} px (Rasio utuh terjaga)
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
                            <p className="text-xs font-semibold text-[#171717]">Sedang mengompres gambar...</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Mengoptimalkan resolusi dan ukuran file</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-11 h-11 rounded-full bg-[#D9E5DC] text-[#285844] flex items-center justify-center mb-2.5">
                              <Camera className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-[#171717]">
                              Klik untuk pilih foto cukur atau seret ke sini
                            </p>
                            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs leading-snug">
                              Mendukung JPG, PNG, atau WebP. Gambar otomatis dikompres hingga 95% lebih ringan tanpa pecah.
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
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">URL Gambar Hasil Cukur</label>
                    <input 
                      type="text"
                      required={!newLookbookImg}
                      value={newLookbookImg}
                      onChange={(e) => {
                        setNewLookbookImg(e.target.value);
                        setLookbookFile(null);
                        setLookbookCompressionStats(null);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                    />

                    {/* Preset Haircuts Quick Pick */}
                    <div className="mt-3">
                      <span className="text-[11px] text-neutral-500 font-semibold block mb-2">Atau Pilih Contoh Cepat:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_HAIRCUTS.map((hc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewLookbookTitle(hc.title);
                              setNewLookbookImg(hc.url);
                              setNewLookbookTag(hc.tag);
                              setLookbookFile(null);
                              setLookbookCompressionStats(null);
                            }}
                            className="p-2 rounded-xl border border-neutral-200 hover:border-[#285844] text-left flex items-center gap-2 bg-neutral-50 cursor-pointer"
                          >
                            <img src={hc.url} alt={hc.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                            <span className="text-[10px] font-semibold text-[#171717] truncate">{hc.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. TITLE INPUT */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Nama Model / Gaya Potongan
                  </label>
                  <input 
                    type="text"
                    required
                    value={newLookbookTitle}
                    onChange={(e) => setNewLookbookTitle(e.target.value)}
                    placeholder="e.g. Low Taper Fade x Textured Fringe"
                    className="w-full text-sm font-medium p-3 bg-neutral-50 border border-neutral-300 rounded-xl outline-none focus:border-[#285844]"
                  />
                </div>

                {/* 3. TAG CHIPS & CUSTOM INPUT */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                    Label Kategori Potongan
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['Trending', 'Classic', 'Fade Master', 'Two-Block', 'Mullet Modern', 'Beard & Razor'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewLookbookTag(tag)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                          newLookbookTag === tag 
                            ? 'bg-[#285844] text-white shadow-xs' 
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text"
                    value={newLookbookTag}
                    onChange={(e) => setNewLookbookTag(e.target.value)}
                    placeholder="e.g. Custom Tag"
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
                    className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingPhoto || isCompressingLookbook || !newLookbookImg}
                    className="flex-1 py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan Foto...</span>
                      </>
                    ) : (
                      <span>Simpan ke Portofolio</span>
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
                <h3 className="font-display font-bold text-lg text-[#171717]">
                  Tarik Saldo Tip
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pencairan dana langsung ke rekening bank atau e-wallet.
                </p>
              </div>

              {/* Saldo Dompet Info Card */}
              <div className="p-4 rounded-xl bg-neutral-900 text-white mb-4">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <span>Saldo Tersedia</span>
                  <span className="text-[11px] text-neutral-300">Min. penarikan Rp 15.000</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display font-bold text-2xl tracking-tight">
                    Rp {(typeof barber?.tipBalance === 'number' ? barber.tipBalance : 0).toLocaleString('id-ID')}
                  </span>
                  {(barber?.tipBalance || 0) >= 15000 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(String(barber.tipBalance || 0))}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
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
                      min="15000"
                      step="1000"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full text-sm font-bold pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-lg outline-none focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[15000, 25000, 50000, 100000].map((amt) => {
                      const isAvailable = (barber?.tipBalance || 0) >= amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setWithdrawAmount(String(amt))}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                            Number(withdrawAmount) === amt 
                              ? 'bg-neutral-900 text-white border-neutral-900'
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

                  {withdrawAmount && Number(withdrawAmount) < 15000 && (
                    <p className="text-[11px] text-rose-600 mt-1.5">
                      Batas minimal penarikan adalah Rp 15.000
                    </p>
                  )}
                  {withdrawAmount && Number(withdrawAmount) > (barber?.tipBalance || 0) && (
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
                      Number(withdrawAmount) < 15000 || 
                      Number(withdrawAmount) > (barber?.tipBalance || 0) ||
                      !withdrawAccNumber.trim() ||
                      !withdrawAccHolder.trim()
                    }
                    className="px-5 py-2 bg-[#171717] hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                  >
                    Tarik Saldo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
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

    </div>
  );
}
