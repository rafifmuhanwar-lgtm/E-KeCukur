import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Scissors, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Eye, 
  Landmark, 
  Coffee, 
  RefreshCw, 
  AlertCircle, 
  ArrowUpRight, 
  Sliders, 
  Globe, 
  MapPin, 
  Activity, 
  LogOut, 
  ShieldCheck,
  Building2,
  DollarSign,
  UserCheck,
  CreditCard,
  Download,
  BadgeCheck,
  Zap,
  Sparkles,
  Send,
  X
} from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';
import { getAppDomain } from '../../lib/domain';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { simulateQrisPayment, getDynamicQrisImageUrl, MASTER_QRIS_STATIC } from '../../lib/qrisPayment';

export default function AdminMasterDashboard() {
  const navigate = useNavigate();
  const appDomain = getAppDomain();

  // Global Store State
  const barbers = useStore((state) => state.barbers || []);
  const bookings = useStore((state) => state.bookings || []);
  const updateBookingStatus = useStore((state) => state.updateBookingStatus);
  const updateBarber = useStore((state) => state.updateBarber);
  const authUser = useStore((state) => state.authUser);
  const fetchBarbersFromSupabase = useStore((state) => state.fetchBarbersFromSupabase);
  const fetchBookingsFromSupabase = useStore((state) => state.fetchBookingsFromSupabase);
  const subscribeToBookings = useStore((state) => state.subscribeToBookings);

  // Sync Supabase Barbers & Bookings on Mount + Realtime
  useEffect(() => {
    if (typeof fetchBarbersFromSupabase === 'function') fetchBarbersFromSupabase();
    if (typeof fetchBookingsFromSupabase === 'function') fetchBookingsFromSupabase();
    if (typeof subscribeToBookings === 'function') {
      const unsub = subscribeToBookings();
      return () => { if (typeof unsub === 'function') unsub(); };
    }
  }, [fetchBarbersFromSupabase, fetchBookingsFromSupabase, subscribeToBookings]);

  // Tabs: 'overview' | 'barbers' | 'bookings' | 'gateway' | 'withdrawals' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingPaymentFilter, setBookingPaymentFilter] = useState('ALL');
  const [bookingBarberFilter, setBookingBarberFilter] = useState('ALL');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState('ALL');

  // Modal: Tambah Barber Baru
  const [isAddBarberModalOpen, setIsAddBarberModalOpen] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberSlug, setNewBarberSlug] = useState('');
  const [newBarberCity, setNewBarberCity] = useState('');
  const [newBarberSegment, setNewBarberSegment] = useState('capster');
  const [newBarberSpecialty, setNewBarberSpecialty] = useState('');
  const [newBarberPlan, setNewBarberPlan] = useState('free');

  // Gateway QRIS & Webhook States
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedQueryUrl, setCopiedQueryUrl] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);

  // Fetch live webhook & payment logs from Supabase
  const loadWebhookLogs = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: qrisRows } = await supabase
        .from('qris_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (qrisRows && qrisRows.length > 0) {
        setWebhookLogs(qrisRows.map(q => ({
          id: q.id,
          timestamp: new Date(q.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(q.created_at).toLocaleDateString('id-ID'),
          amount: Number(q.total_amount) || Number(q.base_amount) || 0,
          sender: q.raw_notification ? 'Payhook / Android' : 'QRIS Dinamis',
          status: q.status === 'PAID' ? 'MATCHED' : q.status,
          note: `${q.customer_name || 'Pelanggan'} (${q.reference_id || 'QRIS'})`
        })));
        return;
      }
    } catch (err) {}

    // Fallback: derive logs from real QRIS bookings in Supabase
    const qrisBookings = bookings.filter(b => b.paymentMethod === 'QRIS');
    if (qrisBookings.length > 0) {
      setWebhookLogs(qrisBookings.map(b => ({
        id: b.id,
        timestamp: b.time ? `${b.time} WIB` : 'Hari ini',
        date: b.date || 'Hari ini',
        amount: b.price,
        sender: 'Payhook Listener',
        status: b.paymentStatus === 'PAID' || b.status === 'Terkonfirmasi' ? 'MATCHED' : 'PENDING',
        note: `${b.customerName} - ${b.serviceName}`
      })));
    }
  };

  useEffect(() => {
    loadWebhookLogs();
  }, [bookings]);

  // Global Platform Settings State
  const [platformName, setPlatformName] = useState('E-CUKUR Link-in-Bio');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastActive, setIsBroadcastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Format IDR Helper
  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  // ─── 1. METRICS & AGGREGATIONS ───
  const metrics = useMemo(() => {
    const totalBarbers = barbers.length;
    const freeBarbers = barbers.filter(b => (b.plan || 'free') === 'free').length;
    const capsterBarbers = barbers.filter(b => b.plan === 'capster').length;
    const studioBarbers = barbers.filter(b => b.plan === 'barber').length;

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'Terkonfirmasi' || b.status === 'Selesai').length;
    const pendingBookings = bookings.filter(b => b.status === 'Menunggu').length;

    // Hitung total omzet booking di seluruh platform
    const totalBookingVolume = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

    // Hitung total tip yang beredar di seluruh bio link
    const totalTipsVolume = barbers.reduce((acc, b) => {
      const history = Array.isArray(b.tipsHistory) ? b.tipsHistory : [];
      return acc + history.reduce((sub, t) => sub + (Number(t.amount) || 0), 0);
    }, 0);

    // Total penarikan yang diajukan
    const allWithdrawals = barbers.flatMap(b => {
      const list = Array.isArray(b.withdrawalsHistory) ? b.withdrawalsHistory : [];
      return list.map((w, idx) => ({
        ...w,
        idx,
        barberName: b.name,
        barberId: b.id,
        barberSlug: b.slug
      }));
    });

    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'Menunggu' || w.status === 'Menunggu Transfer' || !w.status);
    const completedWithdrawals = allWithdrawals.filter(w => w.status === 'Berhasil Ditransfer' || w.status === 'Selesai');

    const totalPendingPayoutAmount = pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const totalCompletedPayoutAmount = completedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    return {
      totalBarbers,
      freeBarbers,
      capsterBarbers,
      studioBarbers,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalBookingVolume,
      totalTipsVolume,
      totalGrossVolume: totalBookingVolume + totalTipsVolume,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      completedWithdrawalsCount: completedWithdrawals.length,
      totalPendingPayoutAmount,
      totalCompletedPayoutAmount,
      allWithdrawals
    };
  }, [barbers, bookings]);

  // ─── FILTERED BARBERS ───
  const filteredBarbers = useMemo(() => {
    return barbers.filter((b) => {
      const matchSearch = 
        (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.locationCity || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchSegment = segmentFilter === 'ALL' || (b.segment || 'capster') === segmentFilter;
      const matchPlan = planFilter === 'ALL' || (b.plan || 'free') === planFilter;
      return matchSearch && matchSegment && matchPlan;
    });
  }, [barbers, searchQuery, segmentFilter, planFilter]);

  // ─── FILTERED BOOKINGS ───
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
      const matchPayment = bookingPaymentFilter === 'ALL' || (b.paymentMethod || 'Tunai') === bookingPaymentFilter;
      const matchBarber = bookingBarberFilter === 'ALL' || 
        (b.barberId && b.barberId === bookingBarberFilter) || 
        (b.barberName && b.barberName.trim().toLowerCase() === bookingBarberFilter.trim().toLowerCase());
      
      const q = bookingSearchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.customerPhone || '').toLowerCase().includes(q) ||
        (b.serviceName || '').toLowerCase().includes(q) ||
        (b.id || '').toLowerCase().includes(q);

      return matchStatus && matchPayment && matchBarber && matchQuery;
    });
  }, [bookings, bookingStatusFilter, bookingPaymentFilter, bookingBarberFilter, bookingSearchQuery]);

  // ─── FILTERED WITHDRAWALS ───
  const filteredWithdrawals = useMemo(() => {
    return metrics.allWithdrawals.filter((w) => {
      if (withdrawalStatusFilter === 'ALL') return true;
      if (withdrawalStatusFilter === 'PENDING') {
        return w.status === 'Menunggu' || w.status === 'Menunggu Transfer' || !w.status;
      }
      if (withdrawalStatusFilter === 'COMPLETED') {
        return w.status === 'Berhasil Ditransfer' || w.status === 'Selesai';
      }
      return true;
    });
  }, [metrics.allWithdrawals, withdrawalStatusFilter]);

  // ─── HANDLE UPDATE PLAN BARBER DARI ADMIN ───
  const handleChangeBarberPlan = async (barberId, newPlan) => {
    try {
      await updateBarber(barberId, { plan: newPlan });
      showToast(`Paket berhasil diubah menjadi ${newPlan.toUpperCase()}!`);
    } catch (err) {
      showToast('Gagal mengubah paket: ' + err.message);
    }
  };

  // ─── HANDLE UPDATE STATUS PENCAIRAN SALDO TIP ───
  const handleMarkWithdrawalCompleted = async (withdrawalItem) => {
    try {
      const targetBarber = barbers.find(b => b.id === withdrawalItem.barberId || b.slug === withdrawalItem.barberId);
      if (!targetBarber) return;

      const currentWds = Array.isArray(targetBarber.withdrawalsHistory) ? [...targetBarber.withdrawalsHistory] : [];
      const updatedWds = currentWds.map((w) => {
        if (w.id === withdrawalItem.id || (w.date === withdrawalItem.date && w.amount === withdrawalItem.amount)) {
          return {
            ...w,
            status: 'Berhasil Ditransfer',
            transferredAt: new Date().toISOString()
          };
        }
        return w;
      });

      await updateBarber(targetBarber.id, { withdrawalsHistory: updatedWds });
      showToast(`Dana ${formatRupiah(withdrawalItem.amount)} untuk ${withdrawalItem.barberName} berhasil ditandai sudah ditransfer!`);
    } catch (err) {
      showToast('Gagal memperbarui status: ' + err.message);
    }
  };

  // ─── EXPORT BOOKINGS TO CSV ───
  const handleExportBookingsCsv = () => {
    if (bookings.length === 0) {
      showToast('Belum ada data reservasi untuk diekspor.');
      return;
    }

    const headers = ['ID Booking', 'Tanggal', 'Jam', 'Pelanggan', 'No HP', 'Barber', 'Layanan', 'Tarif (Rp)', 'Metode Bayar', 'Status'];
    const rows = bookings.map(b => [
      `"${b.id || ''}"`,
      `"${b.date || ''}"`,
      `"${b.time || ''} WIB"`,
      `"${b.customerName || ''}"`,
      `"${b.customerPhone || ''}"`,
      `"${b.barberName || ''}"`,
      `"${b.serviceName || ''}"`,
      b.price || 0,
      `"${b.paymentMethod || 'Tunai'}"`,
      `"${b.status || 'Menunggu'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_reservasi_ecukur_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV berhasil diunduh!');
  };

  // Handle Add Barber Manual by SuperAdmin
  const handleCreateBarber = (e) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;

    const slug = (newBarberSlug.trim() || newBarberName.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 30);
    const newBarberObj = {
      id: `barber-${Date.now()}`,
      name: newBarberName.trim(),
      slug: slug,
      handle: `@${slug}`,
      locationCity: newBarberCity.trim() || 'Jakarta',
      segment: newBarberSegment,
      plan: newBarberPlan,
      specialty: newBarberSpecialty.trim() || 'Haircut Specialist',
      bio: 'Profil resmi terverifikasi oleh Admin E-Cukur.',
      photo: '',
      bannerImage: '',
      status: 'AVAILABLE',
      accountStatus: 'ACTIVE',
      services: [
        { id: 'srv-1', name: 'Signature Haircut', price: 45000, duration: '45m', active: true },
        { id: 'srv-2', name: 'Beard Trim & Shave', price: 25000, duration: '30m', active: true }
      ],
      features: {
        booking: true,
        services: true,
        lookbook: true,
        location: true,
        tipping: true,
        team: newBarberPlan === 'barber'
      },
      tippingConfig: {
        title: `Traktir Kopi ${newBarberName.trim()}`,
        presets: [
          { amount: 10000, label: 'Kopi Hitam', price: '10K' },
          { amount: 25000, label: 'Kopi Susu', price: '25K' },
          { amount: 50000, label: 'V60 Special', price: '50K' }
        ]
      }
    };

    useStore.setState((state) => ({
      barbers: [newBarberObj, ...state.barbers]
    }));

    if (isSupabaseConfigured) {
      supabase.from('barbers').insert({
        name: newBarberObj.name,
        slug: newBarberObj.slug,
        email: `${slug}@ecukur.biz.id`,
        specialty: newBarberObj.specialty,
        bio: newBarberObj.bio,
        plan: newBarberPlan,
        location_city: newBarberObj.locationCity,
        account_status: 'ACTIVE'
      }).then(() => {}).catch(() => {});
    }

    setIsAddBarberModalOpen(false);
    setNewBarberName('');
    setNewBarberSlug('');
    setNewBarberCity('');
    showToast(`Barber ${newBarberObj.name} berhasil dibuat! Bio link: ${appDomain}/${newBarberObj.slug}`);
  };

  // Test Ping Payhook Connection
  const handleTestPingWebhook = async () => {
    setTestingPing(true);
    setLastTestResult(null);
    try {
      const res = await fetch('/api/payment/qris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ecukur_qris_secret_2026'
        },
        body: JSON.stringify({ test: true })
      });
      const data = await res.json();
      setLastTestResult({
        success: true,
        time: new Date().toLocaleTimeString('id-ID'),
        status: res.status,
        message: data.message || 'Koneksi Payhook berhasil terhubung!'
      });
      showToast('Koneksi Webhook Payhook: 200 OK!');
    } catch (err) {
      setLastTestResult({
        success: false,
        time: new Date().toLocaleTimeString('id-ID'),
        status: 'Error',
        message: err.message
      });
      showToast('Tes koneksi gagal: ' + err.message);
    } finally {
      setTestingPing(false);
    }
  };

  // Test Webhook Simulation from Master Admin
  const handleTestMasterWebhook = async () => {
    setSimulatingWebhook(true);
    try {
      const res = await fetch('/api/payment/qris/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ecukur_qris_secret_2026'
        },
        body: JSON.stringify({
          title: 'BCA QRIS Masuk',
          text: `BCA: Pembayaran QRIS Rp 50.123 dari GO-PAY berhasil diterima pada ${new Date().toLocaleTimeString('id-ID')}`
        })
      });
      const data = await res.json();
      setWebhookLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          date: 'Hari ini',
          amount: 50123,
          sender: 'Payhook Test Simulator',
          status: data.matched ? 'MATCHED' : 'RECEIVED',
          note: data.message || 'Simulasi notifikasi uang masuk sukses'
        },
        ...prev
      ]);
      setLastTestResult({
        success: true,
        time: new Date().toLocaleTimeString('id-ID'),
        status: 200,
        message: data.message || 'Notifikasi simulasi sukses diproses'
      });
      showToast('Simulasi notifikasi Payhook sukses!');
    } catch (err) {
      showToast('Gagal memanggil webhook: ' + err.message);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#285844] selection:text-white">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TOP HEADER NAVIGATION (SUPER ADMIN CONTROL)  */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#285844] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-black text-lg tracking-tight text-[#171717] block leading-none">
                  E-CUKUR
                </span>
                <span className="text-[10px] font-bold text-[#285844] tracking-wider uppercase">
                  Master Admin Portal
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ecukur.biz.id Online
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                <Zap className="w-3 h-3 text-amber-600" />
                Payhook Ready
              </span>
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/barber/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all hover:bg-neutral-100"
              title="Buka studio creator barber saat ini"
            >
              <Scissors className="w-3.5 h-3.5 text-[#285844]" />
              <span>Studio Barber Bio</span>
            </Link>

            <Link
              to="/"
              className="p-2 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors"
              title="Kunjungi Website Publik"
            >
              <Globe className="w-4 h-4" />
            </Link>

            <div className="h-6 w-px bg-neutral-200" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#285844] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                SA
              </div>
              <div className="hidden lg:block text-left">
                <span className="font-bold text-xs block leading-tight text-neutral-900">Super Administrator</span>
                <span className="text-[10px] text-neutral-400 block font-mono">admin@ecukur.biz.id</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto no-scrollbar gap-1 pt-1 pb-2">
          {[
            { id: 'overview', label: 'Ringkasan Platform', icon: Activity },
            { id: 'barbers', label: 'Daftar Pengguna / Barber', icon: Users, badge: barbers.length },
            { id: 'bookings', label: 'Semua Booking Reservasi', icon: Calendar, badge: bookings.filter(b => b.status === 'Menunggu').length || null },
            { id: 'gateway', label: 'Pusat Payhook & QRIS', icon: Smartphone, highlight: true },
            { id: 'withdrawals', label: 'Pencairan Saldo Tip', icon: Landmark, badge: metrics.pendingWithdrawalsCount || null },
            { id: 'settings', label: 'Pengaturan Platform', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-[#285844] text-white shadow-xs' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.highlight ? 'text-emerald-700' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#D9E5DC] text-[#285844]'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MAIN ADMIN CONTENT AREA                       */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">

        {/* ══════════════════════════════════════════ */}
        {/* TAB 1: RINGKASAN PLATFORM (OVERVIEW)       */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Barber / Bio Link */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Total Barber / Studio</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                    {metrics.totalBarbers}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600">Bio Link Aktif</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
                  <span>Free: {metrics.freeBarbers}</span> • 
                  <span>Capster: {metrics.capsterBarbers}</span> • 
                  <span>Studio: {metrics.studioBarbers}</span>
                </div>
              </div>

              {/* Card 2: Total Booking Masuk */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Total Booking Reservasi</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#285844] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                    {metrics.totalBookings}
                  </h3>
                  {metrics.pendingBookings > 0 ? (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {metrics.pendingBookings} Menunggu
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">Semua Lunas</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  {metrics.confirmedBookings} reservasi telah terkonfirmasi.
                </p>
              </div>

              {/* Card 3: Total Gross Transaksi Platform */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Gross Transaksi Platform</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-xl sm:text-2xl text-neutral-900 tracking-tight">
                    {formatRupiah(metrics.totalGrossVolume)}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span>Booking: {formatRupiah(metrics.totalBookingVolume)}</span> • 
                  <span>Tip: {formatRupiah(metrics.totalTipsVolume)}</span>
                </div>
              </div>

              {/* Card 4: Penarikan Dana Tertunda */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Antrean Payout Barber</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-xl sm:text-2xl text-neutral-900 tracking-tight">
                    {formatRupiah(metrics.totalPendingPayoutAmount)}
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-500 font-mono">
                  {metrics.pendingWithdrawalsCount} pengajuan menunggu transfer admin.
                </p>
              </div>

            </div>

            {/* Quick Banner: Payhook Integration Status */}
            <div className="bg-[#285844] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white font-mono">
                    VERCEL SERVERLESS ACTIVE
                  </span>
                  <h3 className="font-display font-bold text-base">Payhook QRIS Listener Siap Menerima Notifikasi</h3>
                </div>
                <p className="text-xs text-neutral-200 max-w-2xl leading-relaxed">
                  Semua transaksi QRIS yang masuk ke HP Android kamu melalui Payhook akan diverifikasi secara instan dengan kode unik 3 digit.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleTestPingWebhook}
                  disabled={testingPing}
                  className="px-3.5 py-2 bg-white text-[#285844] hover:bg-neutral-100 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
                  <span>{testingPing ? 'Menguji...' : 'Uji Ping Payhook'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gateway')}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Buka Pengaturan Webhook →
                </button>
              </div>
            </div>

            {/* Dua Kolom: Barber Terbaru & Reservasi Terkini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Box 1: Barber Terdaftar Terbaru */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#285844]" />
                    <span>Barber / Studio Terdaftar</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('barbers')}
                    className="text-xs text-[#285844] font-bold hover:underline"
                  >
                    Kelola Semua ({barbers.length}) →
                  </button>
                </div>

                <div className="divide-y divide-neutral-100">
                  {barbers.slice(0, 5).map((barber) => (
                    <div key={barber.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center font-bold text-xs text-[#285844]">
                          {barber.photo ? (
                            <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover" />
                          ) : (
                            (barber.name || 'B').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs text-neutral-900 truncate">{barber.name}</h4>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              barber.plan === 'barber' ? 'bg-amber-100 text-amber-800' :
                              barber.plan === 'capster' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-neutral-100 text-neutral-600'
                            }`}>
                              {barber.plan || 'Free'}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono block">
                            /{barber.slug || barber.id} • {barber.locationCity || 'Indonesia'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/${barber.slug || barber.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-black transition-colors"
                          title="Buka Bio Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 2: Reservasi Terkini */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#285844]" />
                    <span>Booking Reservasi Terkini</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs text-[#285844] font-bold hover:underline"
                  >
                    Lihat Semua ({bookings.length}) →
                  </button>
                </div>

                <div className="divide-y divide-neutral-100">
                  {bookings.length === 0 ? (
                    <div className="text-center py-8 text-neutral-400 text-xs">
                      Belum ada reservasi masuk.
                    </div>
                  ) : (
                    bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-xs text-neutral-900 truncate">
                              {booking.customerName}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                              booking.status === 'Terkonfirmasi' 
                                ? 'bg-emerald-50 text-emerald-800' 
                                : booking.status === 'Menunggu' 
                                  ? 'bg-amber-50 text-amber-800' 
                                  : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 block truncate">
                            {booking.serviceName} • Barber: <strong>{booking.barberName}</strong>
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-xs text-[#285844] block">
                            {formatRupiah(booking.price)}
                          </span>
                          <span className="text-[10px] text-neutral-400 block font-mono">
                            {booking.time} WIB
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB 2: MANAJEMEN SEMUA BARBER / BIO LINK   */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'barbers' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {/* Toolbar: Search, Filter, & Add Button */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama barber, slug, atau kota..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844] focus:bg-white"
                  />
                </div>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Paket</option>
                  <option value="free">Paket Free</option>
                  <option value="capster">Paket Capster (49K)</option>
                  <option value="barber">Paket Studio (99K)</option>
                </select>

                <select
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Segmen</option>
                  <option value="capster">Capster Mandiri</option>
                  <option value="barbershop">Studio Barbershop</option>
                  <option value="asgar">Pangkas Asgar</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsAddBarberModalOpen(true)}
                className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Barber Baru</span>
              </button>
            </div>

            {/* Table of Barbers */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Barber / Studio</th>
                      <th className="py-3 px-4">Bio Link URL</th>
                      <th className="py-3 px-4">Paket Langganan</th>
                      <th className="py-3 px-4">Lokasi & Segmen</th>
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4">Booking Masuk</th>
                      <th className="py-3 px-4">Saldo Tip</th>
                      <th className="py-3 px-4">Status Akun</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBarbers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-400">
                          Tidak ditemukan barber yang sesuai pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredBarbers.map((b) => {
                        const barberBookingsCount = bookings.filter(x => x.barberId === b.id || x.barberName === b.name).length;
                        const currentPlan = b.plan || 'free';

                        return (
                          <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0 flex items-center justify-center font-bold text-xs text-[#285844]">
                                  {b.photo ? (
                                    <img src={b.photo} alt={b.name} className="w-full h-full object-cover" />
                                  ) : (
                                    (b.name || 'B').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-neutral-900 block truncate">{b.name}</span>
                                    {currentPlan === 'barber' && <BadgeCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                    {currentPlan === 'capster' && <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-mono truncate">{b.specialty || 'Capster'}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#285844]">
                              /{b.slug || b.id}
                            </td>

                            {/* Plan Switcher Dropdown */}
                            <td className="py-3.5 px-4">
                              <select
                                value={currentPlan}
                                onChange={(e) => handleChangeBarberPlan(b.id, e.target.value)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border outline-none ${
                                  currentPlan === 'barber' 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                                    : currentPlan === 'capster'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                }`}
                              >
                                <option value="free">Free (Gratis)</option>
                                <option value="capster">Capster Pro (49K)</option>
                                <option value="barber">Studio Resmi (99K)</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-medium text-neutral-700 block">{b.locationCity || 'Indonesia'}</span>
                              <span className="text-[10px] text-neutral-400 capitalize">{b.segment || 'Capster'}</span>
                            </td>

                            <td className="py-3.5 px-4 font-mono">
                              {(b.services || []).length} Menu
                            </td>

                            <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900">
                              {barberBookingsCount}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-semibold text-amber-700">
                              {formatRupiah(b.tipBalance || 0)}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (b.accountStatus || 'ACTIVE') === 'ACTIVE' 
                                  ? 'bg-emerald-50 text-emerald-800' 
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {b.accountStatus || 'ACTIVE'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={`/${b.slug || b.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-black transition-colors"
                                  title="Lihat Bio Link Publik"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = b.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                                    updateBarber(b.id, { accountStatus: nextStatus });
                                    showToast(`Status ${b.name} diubah menjadi ${nextStatus}`);
                                  }}
                                  className="px-2 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  {b.accountStatus === 'ACTIVE' ? 'Suspend' : 'Aktifkan'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB 3: SEMUA BOOKING MASUK (MASTER)        */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            {/* Filter Bar & Export */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text"
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    placeholder="Cari nama pelanggan, nomor WA, atau layanan..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844] focus:bg-white"
                  />
                </div>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Terkonfirmasi">Terkonfirmasi</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>

                <select
                  value={bookingPaymentFilter}
                  onChange={(e) => setBookingPaymentFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Pembayaran</option>
                  <option value="QRIS">QRIS Dinamis</option>
                  <option value="Tunai">Tunai / di Kasir</option>
                </select>

                <select
                  value={bookingBarberFilter}
                  onChange={(e) => setBookingBarberFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Barber</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportBookingsCsv}
                className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">ID & Waktu</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Barber Tujuan</th>
                      <th className="py-3 px-4">Layanan & Tarif</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400">
                          Belum ada reservasi dengan filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-neutral-900 block">{b.id}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">{b.date} • {b.time} WIB</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-neutral-900 block">{b.customerName}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">{b.customerPhone}</span>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-neutral-800">
                            {b.barberName}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-medium text-neutral-800 block">{b.serviceName}</span>
                            <span className="font-mono font-bold text-[#285844] text-[11px]">{formatRupiah(b.price)}</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              b.paymentMethod === 'QRIS' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-neutral-100 text-neutral-700'
                            }`}>
                              {b.paymentMethod || 'Tunai'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              b.status === 'Terkonfirmasi' 
                                ? 'bg-emerald-50 text-emerald-800' 
                                : b.status === 'Menunggu' 
                                  ? 'bg-amber-50 text-amber-800' 
                                  : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {b.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {b.status === 'Menunggu' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateBookingStatus(b.id, 'Terkonfirmasi');
                                    showToast(`Booking ${b.id} dikonfirmasi!`);
                                  }}
                                  className="px-2.5 py-1 bg-[#285844] hover:bg-[#1E4334] text-white rounded-lg text-[10.5px] font-semibold cursor-pointer"
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
                                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-[10.5px] font-semibold cursor-pointer"
                                >
                                  Selesai
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB 4: PUSAT GATEWAY QRIS & PAYHOOK         */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'gateway' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Payhook Master Integration Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-display font-bold text-base text-neutral-900">
                      Pusat Webhook Payhook & QRIS Dinamis Serverless
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
                    Setiap mutasi masuk dari aplikasi m-Banking / e-wallet (BCA, Mandiri, BRI, BNI, GoPay, DANA, OVO) yang ditangkap oleh aplikasi <strong>Payhook</strong> di Android akan otomatis diproses dan mencocokkan kode unik booking secara real-time.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-center">
                  Production: ecukur.biz.id
                </span>
              </div>

              {/* Endpoint URLs for Payhook */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Standard Webhook URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                    <span>1. URL Webhook (Kolom Webhook URL di Payhook)</span>
                    <span className="text-[10px] text-emerald-700 font-mono">Direkomendasikan</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value="https://ecukur.biz.id/api/payment/qris/webhook"
                      className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://ecukur.biz.id/api/payment/qris/webhook');
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                        showToast('URL Webhook berhasil disalin!');
                      }}
                      className="px-3.5 py-2 bg-[#171717] hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Custom Header Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800">
                    2. Secret Key Header (Kolom Header di Payhook)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value="x-api-key: ecukur_qris_secret_2026"
                      className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('ecukur_qris_secret_2026');
                        setCopiedApiKey(true);
                        setTimeout(() => setCopiedApiKey(false), 2000);
                        showToast('Secret Key berhasil disalin!');
                      }}
                      className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedApiKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApiKey ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* URL Alternatif dengan Query Param */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700">
                    Alternatif URL Sekaligus Kunci Rahasia (Jika Payhook tidak ada kolom header):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('https://ecukur.biz.id/api/payment/qris/webhook?secret=ecukur_qris_secret_2026');
                      setCopiedQueryUrl(true);
                      setTimeout(() => setCopiedQueryUrl(false), 2000);
                      showToast('URL Query Param berhasil disalin!');
                    }}
                    className="text-xs text-[#285844] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedQueryUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedQueryUrl ? 'Tersalin' : 'Salin URL Lengkap'}</span>
                  </button>
                </div>
                <code className="block p-2 bg-white rounded-lg border border-neutral-200 text-xs font-mono text-neutral-800 break-all select-all">
                  https://ecukur.biz.id/api/payment/qris/webhook?secret=ecukur_qris_secret_2026
                </code>
              </div>

              {/* Action Buttons: Test Connection & Simulate */}
              <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-neutral-500">
                  Uji koneksi Payhook ke server secara langsung:
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestPingWebhook}
                    disabled={testingPing}
                    className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingPing ? 'animate-spin' : ''}`} />
                    <span>{testingPing ? 'Menguji...' : 'Uji Ping Koneksi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestMasterWebhook}
                    disabled={simulatingWebhook}
                    className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{simulatingWebhook ? 'Mengirim...' : 'Simulasi Notifikasi Masuk (Rp 50.123)'}</span>
                  </button>
                </div>
              </div>

              {/* Live Test Response Box */}
              {lastTestResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                  lastTestResult.success ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>[{lastTestResult.time}] Status {lastTestResult.status}: {lastTestResult.message}</span>
                  </div>
                  <button onClick={() => setLastTestResult(null)} className="text-neutral-400 hover:text-black">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

            </div>

            {/* Panduan Setting Payhook */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#285844]" />
                <span>3 Langkah Praktis Setting Aplikasi Payhook di Android</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#285844] text-white flex items-center justify-center font-bold text-xs">1</div>
                  <span className="font-bold text-neutral-900 block">Pilih Aplikasi Bank</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Buka Payhook, centang aplikasi yang menerima uang masuk: <strong>BCA mobile</strong>, <strong>Livin Mandiri</strong>, <strong>GoBiz / GoPay</strong>, atau <strong>DANA Bisnis</strong>.
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#285844] text-white flex items-center justify-center font-bold text-xs">2</div>
                  <span className="font-bold text-neutral-900 block">Tempel Webhook URL</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Masukkan URL: <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border">https://ecukur.biz.id/api/payment/qris/webhook</code>.
                  </p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#285844] text-white flex items-center justify-center font-bold text-xs">3</div>
                  <span className="font-bold text-neutral-900 block">Isi Header Secret</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Di kolom Header tambahkan Name: <code className="font-mono text-[10px]">x-api-key</code> dan Value: <code className="font-mono text-[10px]">ecukur_qris_secret_2026</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Master QRIS Information Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                <div>
                  <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#285844]" />
                    <span>Barcode QRIS Master Platform (Dukungan QRIS Dinamis Otomatis)</span>
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Barcode ini digunakan di seluruh transaksi customer (Booking Jadwal Cukur & Traktir Kopi Capster).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 self-start sm:self-center">
                  Dinamis & Otomatis Terkunci
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6 pt-1">
                <div className="w-40 h-40 shrink-0 bg-neutral-50 border border-neutral-200 rounded-2xl p-2 flex items-center justify-center shadow-xs">
                  <img 
                    src={getDynamicQrisImageUrl(50000)} 
                    alt="Master QRIS Dinamis E-CUKUR" 
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 text-xs flex-1 w-full">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Merchant Terdaftar:</span>
                      <strong className="text-neutral-900 text-xs">BAYAR VIA QRIS, Digital & Kreatif</strong>
                      <span className="text-neutral-400 block text-[9.5px]">PERUM GRIYA SETU PERMAI BLOK D.5NO.20</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">NMID Nasional (ASPI):</span>
                      <strong className="font-mono text-neutral-900 text-xs">ID1026490305079</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Acquiring Provider:</span>
                      <span className="font-semibold text-emerald-800">GoPay / GoBiz Merchant</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Fitur Otomatis:</span>
                      <span className="font-semibold text-neutral-800">Inject Tag 54 + CRC16 Checksum</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    💡 Setiap kali customer memilih bayar via QRIS, sistem otomatis mengubah QRIS ini menjadi <strong>QRIS Dinamis</strong> dengan nominal yang terkunci persis sesuai total tagihan (+ 3 digit kode unik acak). Pelanggan tidak perlu repot mengetik angka manual di aplikasi m-Banking mereka!
                  </p>
                </div>
              </div>
            </div>

            {/* Realtime Mutasi Log Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden space-y-0">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <h4 className="font-display font-bold text-xs text-neutral-900 uppercase tracking-wider">
                  Log Notifikasi Webhook Terakhir
                </h4>
                <button
                  type="button"
                  onClick={loadWebhookLogs}
                  className="text-[11px] font-semibold text-[#285844] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Segarkan</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Waktu</th>
                      <th className="py-2.5 px-4">Nominal Dideteksi</th>
                      <th className="py-2.5 px-4">Sumber Aplikasi</th>
                      <th className="py-2.5 px-4">Status Pencocokan</th>
                      <th className="py-2.5 px-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {webhookLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-neutral-400">
                          Belum ada log notifikasi masuk.
                        </td>
                      </tr>
                    ) : (
                      webhookLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono text-neutral-500">{log.timestamp}</td>
                          <td className="py-3 px-4 font-mono font-bold text-[#285844]">
                            {formatRupiah(log.amount)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-neutral-800">{log.sender}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'MATCHED' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-500">{log.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB 5: PERMINTAAN PENCAIRAN TIP (PAYOUTS)  */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'withdrawals' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-sm text-neutral-900">
                  Daftar Permintaan Penarikan Dana Tip Barber
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Transfer dana tip hasil potong rambut ke rekening atau e-wallet masing-masing barber.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={withdrawalStatusFilter}
                  onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Permintaan</option>
                  <option value="PENDING">Menunggu Transfer ({metrics.pendingWithdrawalsCount})</option>
                  <option value="COMPLETED">Sudah Ditransfer ({metrics.completedWithdrawalsCount})</option>
                </select>

                <div className="font-mono text-xs px-3 py-1 bg-amber-50 rounded-xl border border-amber-200">
                  Pending: <strong className="text-amber-800">{formatRupiah(metrics.totalPendingPayoutAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Tanggal Pengajuan</th>
                      <th className="py-3 px-4">Nama Barber</th>
                      <th className="py-3 px-4">Nominal Ditarik</th>
                      <th className="py-3 px-4">Tujuan Rekening / E-Wallet</th>
                      <th className="py-3 px-4">Status Payout</th>
                      <th className="py-3 px-4 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          Belum ada permohonan penarikan dana dari barber.
                        </td>
                      </tr>
                    ) : (
                      filteredWithdrawals.map((w, idx) => {
                        const isCompleted = w.status === 'Berhasil Ditransfer' || w.status === 'Selesai';
                        return (
                          <tr key={w.id || idx} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-neutral-500">
                              {w.date ? new Date(w.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-neutral-900">
                              {w.barberName}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                              {formatRupiah(w.amount)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-neutral-800 block">{w.bankName} - {w.accountNumber}</span>
                              <span className="text-[10px] text-neutral-400">a.n {w.accountHolder}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCompleted 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {isCompleted ? 'Sudah Ditransfer' : 'Menunggu Transfer'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isCompleted ? (
                                <span className="text-[11px] text-neutral-400 font-mono">
                                  Tuntas ✓
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMarkWithdrawalCompleted(w)}
                                  className="px-3 py-1.5 bg-[#285844] hover:bg-[#1E4334] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                  Tandai Sudah Ditransfer
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TAB 6: PENGATURAN PLATFORM (SETTINGS)      */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <h3 className="font-display font-bold text-base text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
                <Sliders className="w-4 h-4 text-[#285844]" />
                <span>Pengaturan Global E-CUKUR</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Nama Platform
                  </label>
                  <input 
                    type="text" 
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Domain Utama Produksi
                  </label>
                  <input 
                    type="text" 
                    readOnly
                    value="https://ecukur.biz.id"
                    className="w-full p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-700 outline-none select-all font-bold"
                  />
                </div>
              </div>

              {/* Broadcast Announcement Banner */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">
                    Pengumuman Siaran Global (Muncul di semua Link Bio)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#285844]">
                    <input 
                      type="checkbox"
                      checked={isBroadcastActive}
                      onChange={(e) => setIsBroadcastActive(e.target.checked)}
                      className="rounded accent-[#285844]"
                    />
                    <span>Aktifkan Pengumuman</span>
                  </label>
                </div>
                <textarea 
                  rows={2}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Contoh: Pemeliharaan server dijadwalkan pada hari Senin pukul 02:00 WIB..."
                  className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-normal outline-none focus:border-[#285844]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => showToast('Pengaturan platform berhasil disimpan!')}
                  className="px-5 py-2.5 bg-[#171717] hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>

            {/* Quick External Links for Admin */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
              <h4 className="font-display font-bold text-sm text-neutral-900">
                Pusat Kontrol Eksternal Produksi
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="https://vercel.com/rafifmuhanwar-lgtms/projects/e-cukur/settings/domains"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors block text-xs"
                >
                  <strong className="block text-neutral-900 mb-0.5">Vercel Domains</strong>
                  <span className="text-neutral-500 text-[11px]">Cek status SSL & routing ecukur.biz.id</span>
                </a>

                <a
                  href="https://supabase.com/dashboard/project/natgqaksuousldfxydnr"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors block text-xs"
                >
                  <strong className="block text-neutral-900 mb-0.5">Supabase Database</strong>
                  <span className="text-neutral-500 text-[11px]">Database, auth users, & logs</span>
                </a>

                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors block text-xs"
                >
                  <strong className="block text-neutral-900 mb-0.5">Google Cloud Console</strong>
                  <span className="text-neutral-500 text-[11px]">OAuth 2.0 Client ID & Authorized Origins</span>
                </a>
              </div>
            </div>

          </motion.div>
        )}

      </main>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL: TAMBAH BARBER / PENGGUNA BARU          */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AnimatePresence>
        {isAddBarberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-neutral-200 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#285844] text-white flex items-center justify-center">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-neutral-900">Tambah Barber / Pengguna Baru</h3>
                    <p className="text-[11px] text-neutral-500">Buat link-in-bio baru secara instan dari Admin.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBarberModalOpen(false)}
                  className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBarber} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Nama Barber / Usaha</label>
                  <input 
                    type="text"
                    required
                    value={newBarberName}
                    onChange={(e) => {
                      setNewBarberName(e.target.value);
                      if (!newBarberSlug) {
                        setNewBarberSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="e.g. Dimas Fade / BarberKing Studio"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Username / Slug URL</label>
                  <div className="flex items-center bg-neutral-50 border border-neutral-300 rounded-xl px-3 focus-within:border-[#285844] focus-within:bg-white">
                    <span className="text-xs font-mono text-neutral-400">ecukur.biz.id/</span>
                    <input 
                      type="text"
                      required
                      value={newBarberSlug}
                      onChange={(e) => setNewBarberSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="dimasfade"
                      className="w-full p-2.5 bg-transparent text-xs font-mono font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Paket Langganan</label>
                    <select
                      value={newBarberPlan}
                      onChange={(e) => setNewBarberPlan(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844] cursor-pointer"
                    >
                      <option value="free">Free (Gratis)</option>
                      <option value="capster">Capster Pro (49K)</option>
                      <option value="barber">Official Studio (99K)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Segmen Usaha</label>
                    <select
                      value={newBarberSegment}
                      onChange={(e) => setNewBarberSegment(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844] cursor-pointer"
                    >
                      <option value="capster">Capster Mandiri</option>
                      <option value="barbershop">Barbershop Modern</option>
                      <option value="asgar">Pangkas Asgar</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Kota / Domisili</label>
                    <input 
                      type="text"
                      value={newBarberCity}
                      onChange={(e) => setNewBarberCity(e.target.value)}
                      placeholder="e.g. Jakarta Selatan"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">Spesialisasi Potongan</label>
                    <input 
                      type="text"
                      value={newBarberSpecialty}
                      onChange={(e) => setNewBarberSpecialty(e.target.value)}
                      placeholder="e.g. Classic Taper & Fade"
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBarberModalOpen(false)}
                    className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Buat Bio Link
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#171717] text-white rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-neutral-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
