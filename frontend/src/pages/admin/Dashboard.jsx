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
  X
} from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';
import { getAppDomain } from '../../lib/domain';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { simulateQrisPayment } from '../../lib/qrisPayment';

export default function AdminMasterDashboard() {
  const navigate = useNavigate();
  const appDomain = getAppDomain();

  // Global Store State
  const barbers = useStore((state) => state.barbers || []);
  const bookings = useStore((state) => state.bookings || []);
  const updateBookingStatus = useStore((state) => state.updateBookingStatus);
  const updateBarber = useStore((state) => state.updateBarber);
  const authUser = useStore((state) => state.authUser);

  // Tabs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'barbers' | 'bookings' | 'gateway' | 'withdrawals' | 'settings'

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingBarberFilter, setBookingBarberFilter] = useState('ALL');

  // Modal: Tambah Barber Baru
  const [isAddBarberModalOpen, setIsAddBarberModalOpen] = useState(false);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberSlug, setNewBarberSlug] = useState('');
  const [newBarberCity, setNewBarberCity] = useState('');
  const [newBarberSegment, setNewBarberSegment] = useState('capster');
  const [newBarberSpecialty, setNewBarberSpecialty] = useState('');

  // Gateway QRIS & Webhook States
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([
    {
      id: 'log-1',
      timestamp: 'Baru saja',
      amount: 45480,
      sender: 'GO-PAY QRIS',
      status: 'MATCHED',
      note: 'Diverifikasi otomatis via MacroDroid'
    },
    {
      id: 'log-2',
      timestamp: '15 menit lalu',
      amount: 25142,
      sender: 'BCA Mobile',
      status: 'MATCHED',
      note: 'Tip Kopi Capster verified'
    }
  ]);

  // Global Platform Settings State
  const [platformName, setPlatformName] = useState('E-CUKUR Link-in-Bio');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcastActive, setIsBroadcastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── 1. METRICS & AGGREGATIONS ───
  const metrics = useMemo(() => {
    const totalBarbers = barbers.length;
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
    const allWithdrawals = barbers.flatMap(b => (b.withdrawalsHistory || []).map(w => ({ ...w, barberName: b.name, barberId: b.id })));
    const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'Menunggu' || !w.status);

    return {
      totalBarbers,
      totalBookings,
      confirmedBookings,
      pendingBookings,
      totalBookingVolume,
      totalTipsVolume,
      totalGrossVolume: totalBookingVolume + totalTipsVolume,
      pendingWithdrawalsCount: pendingWithdrawals.length,
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
      return matchSearch && matchSegment;
    });
  }, [barbers, searchQuery, segmentFilter]);

  // ─── FILTERED BOOKINGS ───
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
      const matchBarber = bookingBarberFilter === 'ALL' || b.barberId === bookingBarberFilter || b.barberName === bookingBarberFilter;
      return matchStatus && matchBarber;
    });
  }, [bookings, bookingStatusFilter, bookingBarberFilter]);

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
        team: false
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
        email: `${slug}@ecukur.id`,
        specialty: newBarberObj.specialty,
        bio: newBarberObj.bio,
        account_status: 'ACTIVE'
      }).then(() => {}).catch(() => {});
    }

    setIsAddBarberModalOpen(false);
    setNewBarberName('');
    setNewBarberSlug('');
    setNewBarberCity('');
    showToast(`Barber ${newBarberObj.name} berhasil dibuat! Bio link: ${appDomain}/${newBarberObj.slug}`);
  };

  // Format IDR Helper
  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

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
          text: `BCA: Pembayaran QRIS Rp 50.480 dari GO-PAY berhasil diterima pada ${new Date().toLocaleTimeString('id-ID')}`
        })
      });
      const data = await res.json();
      setWebhookLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: 'Baru saja',
          amount: 50480,
          sender: 'BCA / MacroDroid Test',
          status: 'MATCHED',
          note: data.message || 'Simulasi master sukses'
        },
        ...prev
      ]);
      showToast('Simulasi Webhook berhasil diterima server!');
    } catch (err) {
      showToast('Gagal memanggil webhook: ' + err.message);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#171717] font-sans antialiased flex flex-col">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* TOP HEADER NAVIGATION (SUPER ADMIN CONTROL)  */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
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

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </span>
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
                <span className="text-[10px] text-neutral-400 block font-mono">root@ecukur.id</span>
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
            { id: 'gateway', label: 'Pusat QRIS & Webhook Listener', icon: Smartphone },
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
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
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
                  <span className="text-xs font-semibold text-neutral-500">Total Pengguna / Barber</span>
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
                <p className="text-[11px] text-neutral-400">
                  Tukang cukur, capster freelance & studio barbershop.
                </p>
              </div>

              {/* Card 2: Total Booking Masuk */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Total Booking Platform</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#285844] flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                    {metrics.totalBookings}
                  </h3>
                  {metrics.pendingBookings > 0 && (
                    <span className="text-xs font-semibold text-amber-600">
                      {metrics.pendingBookings} Menunggu
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  {metrics.confirmedBookings} reservasi telah terkonfirmasi.
                </p>
              </div>

              {/* Card 3: Total Omzet Booking */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Omzet Booking Layanan</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                    {formatRupiah(metrics.totalBookingVolume)}
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Nilai total transaksi jasa potong yang dipesan.
                </p>
              </div>

              {/* Card 4: Total Tip Kopi Beredar */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500">Tip Apresiasi Masuk</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Coffee className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 tracking-tight text-amber-700">
                    {formatRupiah(metrics.totalTipsVolume)}
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Dana traktir kopi yang diterima capster via QRIS.
                </p>
              </div>
            </div>

            {/* Quick Actions & Gateway Status Alert */}
            <div className="bg-[#171717] text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-display font-bold text-base text-white">
                    Pusat Kontrol Master Platform E-Cukur
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                  Semua bio link, booking jadwal cukur, dan verifikasi pembayaran QRIS otomatis terpusat di dashboard ini.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddBarberModalOpen(true)}
                  className="px-4 py-2.5 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Barber Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gateway')}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Cek Gateway QRIS</span>
                </button>
              </div>
            </div>

            {/* Recent Barbers & Recent Bookings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Box 1: Barber Terbaru Terdaftar */}
              <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#285844]" />
                    <span>Pengguna Bio Link Terbaru</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('barbers')}
                    className="text-xs text-[#285844] font-bold hover:underline"
                  >
                    Lihat Semua ({barbers.length}) →
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
                          <h4 className="font-bold text-xs text-neutral-900 truncate">{barber.name}</h4>
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
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama barber, username/slug, atau kota..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844] focus:bg-white"
                  />
                </div>

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
                      <th className="py-3 px-4">Lokasi & Segmen</th>
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4">Total Booking</th>
                      <th className="py-3 px-4">Saldo Tip</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredBarbers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-neutral-400">
                          Tidak ditemukan barber yang sesuai pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredBarbers.map((b) => {
                        const barberBookingsCount = bookings.filter(x => x.barberId === b.id || x.barberName === b.name).length;
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
                                  <span className="font-bold text-neutral-900 block truncate">{b.name}</span>
                                  <span className="text-[10px] text-neutral-400 font-mono truncate">{b.specialty || 'Capster'}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#285844]">
                              /{b.slug || b.id}
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
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-semibold outline-none focus:border-[#285844] cursor-pointer"
                >
                  <option value="ALL">Semua Status Booking</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Terkonfirmasi">Terkonfirmasi</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
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

              <span className="text-xs text-neutral-500 font-mono">
                Menampilkan <strong>{filteredBookings.length}</strong> reservasi
              </span>
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
                              b.paymentMethod === 'QRIS' ? 'bg-blue-50 text-blue-800' : 'bg-neutral-100 text-neutral-700'
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
        {/* TAB 4: PUSAT GATEWAY QRIS & LISTENER       */}
        {/* ══════════════════════════════════════════ */}
        {activeTab === 'gateway' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Master Webhook Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-neutral-900 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#285844]" />
                    <span>Pusat Payment Gateway QRIS & MacroDroid Listener</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl leading-relaxed">
                    Setiap mutasi notifikasi QRIS dari aplikasi bank (BCA Merchant, GoBiz, DANA Bisnis, Seabank) yang ditangkap oleh HP MacroDroid akan diproses otomatis oleh server ini.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Listener Aktif (Port 5000)
                </span>
              </div>

              {/* Endpoint Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    URL Webhook Global (Isi di HTTP Request MacroDroid)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/payment/qris/webhook` : '/api/payment/qris/webhook'}
                      className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/api/payment/qris/webhook`;
                        navigator.clipboard.writeText(url);
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

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    API Key Header (x-api-key)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value="ecukur_qris_secret_2026"
                      className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-900 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('ecukur_qris_secret_2026');
                        setCopiedApiKey(true);
                        setTimeout(() => setCopiedApiKey(false), 2000);
                        showToast('API Key berhasil disalin!');
                      }}
                      className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {copiedApiKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedApiKey ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Testing & Simulation Trigger */}
              <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  Uji coba apakah endpoint webhook backend dapat memproses notifikasi bank secara sukses:
                </p>

                <button
                  type="button"
                  onClick={handleTestMasterWebhook}
                  disabled={simulatingWebhook}
                  className="px-4 py-2 bg-[#285844] hover:bg-[#1E4334] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-center"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simulatingWebhook ? 'animate-spin' : ''}`} />
                  <span>{simulatingWebhook ? 'Memproses Simulasi...' : 'Kirim Simulasi Webhook (Rp 50.480)'}</span>
                </button>
              </div>
            </div>

            {/* MacroDroid Setup Guide Card */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
              <h4 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#285844]" />
                <span>Panduan Cepat Setting HP Android MacroDroid</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="font-bold text-neutral-900 block">1. Trigger (Pemicu)</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Pilih <strong>Notification Received</strong>, lalu centang aplikasi penerima QRIS (BCA Merchant, GoBiz, DANA Bisnis, dsb).
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="font-bold text-neutral-900 block">2. Action (HTTP Request)</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Method: <strong>POST</strong>, tempel URL Webhook di atas. Tambahkan Header: <code className="font-mono text-[10px]">x-api-key: ecukur_qris_secret_2026</code>.
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                  <span className="font-bold text-neutral-900 block">3. Body Request JSON</span>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    Isi body: <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border">&#123;"text": "[not_text]"&#125;</code>. Simpan makro!
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
                <span className="text-[10px] font-mono text-neutral-400">Auto-Refreshed</span>
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
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-500">{log.timestamp}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#285844]">
                          {formatRupiah(log.amount)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-neutral-800">{log.sender}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-500">{log.note}</td>
                      </tr>
                    ))}
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
            
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-sm text-neutral-900">
                  Daftar Permintaan Penarikan Dana Tip
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Transfer dana tip hasil potong rambut ke rekening atau e-wallet masing-masing barber.
                </p>
              </div>

              <div className="font-mono text-xs">
                Pending: <strong className="text-amber-700">{metrics.pendingWithdrawalsCount} Pengajuan</strong>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Barber</th>
                      <th className="py-3 px-4">Nominal Ditarik</th>
                      <th className="py-3 px-4">Tujuan Rekening / E-Wallet</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {metrics.allWithdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400">
                          Belum ada permohonan penarikan dana dari barber.
                        </td>
                      </tr>
                    ) : (
                      metrics.allWithdrawals.map((w, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-neutral-500">
                            {w.date ? new Date(w.date).toLocaleDateString('id-ID') : 'Hari ini'}
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
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800">
                              {w.status || 'Menunggu Transfer'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => showToast(`Penarikan ${formatRupiah(w.amount)} untuk ${w.barberName} ditandai sudah ditransfer!`)}
                              className="px-3 py-1.5 bg-[#285844] hover:bg-[#1E4334] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Tandai Sudah Ditransfer
                            </button>
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
                    Domain Utama
                  </label>
                  <input 
                    type="text" 
                    readOnly
                    value={appDomain}
                    className="w-full p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-xs font-mono text-neutral-500 outline-none select-all"
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
                    <span className="text-xs font-mono text-neutral-400">{appDomain}/</span>
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
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">Spesialisasi Potongan</label>
                  <input 
                    type="text"
                    value={newBarberSpecialty}
                    onChange={(e) => setNewBarberSpecialty(e.target.value)}
                    placeholder="e.g. Classic Taper & Modern Fade"
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium outline-none focus:border-[#285844]"
                  />
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

