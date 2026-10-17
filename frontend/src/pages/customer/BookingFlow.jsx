import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Calendar, 
  User, 
  Scissors, 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Banknote, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../store';
import Logo from '../../components/Logo';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '19:00', '19:30'
];

const generateUpcomingDates = () => {
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const list = [];
  const baseTime = Date.now();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseTime + i * 24 * 60 * 60 * 1000);
    const dayName = i === 0 ? 'Hari Ini' : i === 1 ? 'Besok' : days[d.getDay()];
    const label = `${dayName}, ${d.getDate()} ${months[d.getMonth()]}`;
    const short = `${d.getDate()} ${months[d.getMonth()]}`;
    const iso = d.toISOString().split('T')[0];
    list.push({ id: iso, label, short, dayName, isToday: i === 0 });
  }
  return list;
};

const UPCOMING_DATES = generateUpcomingDates();

export default function BookingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBarberName = searchParams.get('barber') || '';

  const barbers = useStore((state) => state.barbers);
  const services = useStore((state) => state.services);
  const addBooking = useStore((state) => state.addBooking);
  const fetchServicesFromSupabase = useStore((state) => state.fetchServicesFromSupabase);
  const fetchBarbersFromSupabase = useStore((state) => state.fetchBarbersFromSupabase);

  React.useEffect(() => {
    if (typeof fetchServicesFromSupabase === 'function') fetchServicesFromSupabase();
    if (typeof fetchBarbersFromSupabase === 'function') fetchBarbersFromSupabase();
  }, [fetchServicesFromSupabase, fetchBarbersFromSupabase]);

  const effectiveServices = (services && services.length > 0) ? services : [
    { id: 's1', name: 'Gentleman Cut & Wash', price: 50000, duration: '45m', description: 'Potongan rambut presisi, cuci rambut relaxing, hot towel & pomade styling.' },
    { id: 's2', name: 'Signature Fade & Lineup', price: 75000, duration: '60m', description: 'Skin fade halus dengan razor edge lineup super tajam.' },
    { id: 's3', name: 'Hot Towel Beard Shave', price: 45000, duration: '30m', description: 'Cukur kumis & jenggot bersih dengan handuk hangat aromaterapi.' }
  ];

  const effectiveBarbers = (barbers && barbers.length > 0) ? barbers : [
    { id: 'reza', name: 'Reza Fade', specialty: 'Classic Cut & Fade', photo: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400' },
    { id: 'bima', name: 'Bima Texture', specialty: 'Korean Crop & Taper', photo: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=400' }
  ];

  const [step, setStep] = useState(1);
  
  // Selections
  const [selectedBarber, setSelectedBarber] = useState(
    initialBarberName || 'Bebas (Capster Tersedia)'
  );
  const [selectedService, setSelectedService] = useState(effectiveServices[0]);
  const [selectedDate, setSelectedDate] = useState(UPCOMING_DATES[0] || null);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[1]);
  
  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0 
    }).format(number);
  };

  const STEPS = [
    { num: 1, title: 'Layanan', desc: 'Pilihan Treatment' },
    { num: 2, title: 'Capster & Jadwal', desc: 'Pilih Waktu' },
    { num: 3, title: 'Konfirmasi', desc: 'Data Diri & Bayar' }
  ];

  const handleNext = () => {
    if (step === 1 && !selectedService) return;
    if (step === 2 && (!selectedDate || !selectedTime)) {
      alert('Silakan pilih tanggal dan jam kunjungan terlebih dahulu.');
      return;
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/');
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Silakan lengkapi nama dan nomor WhatsApp Anda.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Simpan ke Zustand Store
      addBooking({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: customerNote.trim() || '-',
        barberName: selectedBarber || 'Bebas (Capster Tersedia)',
        serviceName: selectedService?.name || 'CUKUR UMUM',
        date: selectedDate?.label || 'Hari Ini',
        time: selectedTime || '10:00',
        price: selectedService?.price || 40000,
        paymentMethod
      });

      setIsSubmitting(false);
      navigate('/customer/bookings');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 font-sans selection:bg-white selection:text-black antialiased">
      
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex justify-between items-center">
        <div 
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2.5 group"
        >
          <Logo variant="compact" theme="light" size="sm" />
          <span className="text-zinc-600">/</span>
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Booking Sesi</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/customer/bookings')} 
            className="text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors hidden sm:block"
          >
            Riwayat Pesanan
          </button>
          <button 
            onClick={handleBack} 
            className="px-3.5 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Beranda' : 'Sebelumnya'}</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-12 pb-20">
        
        {/* Header Breadcrumb & Title */}
        <div className="mb-8 md:mb-10 text-center max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            Reservasi Jadwal Cukur
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
            Pilih layanan, capster, dan jam kunjungan yang paling nyaman untuk Anda tanpa perlu antre di studio.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
            {STEPS.map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    if (isPast) setStep(s.num);
                  }}
                  disabled={!isPast && !isActive}
                  className={`relative p-3 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isActive 
                      ? 'border-white bg-zinc-900/90 shadow-[0_0_30px_rgba(255,255,255,0.06)]' 
                      : isPast 
                      ? 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 cursor-pointer' 
                      : 'border-zinc-900/60 bg-zinc-950/40 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isPast ? 'bg-white text-black' : isActive ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hidden sm:inline">
                      Tahap 0{s.num}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold uppercase tracking-tight text-white truncate">
                      {s.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-light hidden sm:block truncate">
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Content: Left Steps Form + Right Sticky Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Content (8 cols) */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              
              {/* ━━━ STEP 1: PILIH LAYANAN ━━━ */}
              {step === 1 && (
                <motion.div 
                  key="step1" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                        Pilih Treatment
                      </h2>
                      <p className="text-xs text-zinc-400 font-light mt-0.5">
                        Tentukan layanan grooming yang Anda butuhkan hari ini.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{effectiveServices.length} Layanan Tersedia</span>
                  </div>

                  <div className="grid gap-3 sm:gap-4">
                    {effectiveServices.map((svc) => {
                      const isSelected = selectedService?.id === svc.id;
                      return (
                        <div
                          key={svc.id}
                          onClick={() => setSelectedService(svc)}
                          className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                            isSelected 
                              ? 'border-white bg-zinc-900/90 shadow-[0_0_30px_rgba(255,255,255,0.05)]' 
                              : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900/40'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 group-hover:text-white'
                            }`}>
                              <Scissors className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold uppercase tracking-tight text-white text-base">
                                  {svc.name}
                                </h3>
                                {isSelected && (
                                  <span className="bg-white text-black text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                    Dipilih
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 font-light leading-relaxed mb-2">
                                {svc.description || 'Layanan potong rambut premium dengan teknik presisi.'}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-400" /> {svc.duration}
                                </span>
                                <span>&bull;</span>
                                <span className="text-zinc-400">Termasuk Konsultasi & Cuci</span>
                              </div>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-900 flex sm:flex-col justify-between items-center sm:items-end">
                            <div className="text-xs font-mono text-zinc-500 sm:mb-1">Tarif</div>
                            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                              {formatRupiah(svc.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleNext}
                      disabled={!selectedService}
                      className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                      <span>Lanjut Pilih Waktu</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 2: CAPSTER, TANGGAL & JAM ━━━ */}
              {step === 2 && (
                <motion.div 
                  key="step2" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Sub-step A: Capster Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                          Pilih Capster
                        </h2>
                        <p className="text-xs text-zinc-400 font-light mt-0.5">
                          Pilih seniman favorit Anda atau biarkan sistem mencocokkan capster yang tersedia.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {/* Option: Any Available Barber */}
                      <button
                        type="button"
                        onClick={() => setSelectedBarber('Bebas (Capster Tersedia)')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                          selectedBarber === 'Bebas (Capster Tersedia)'
                            ? 'border-white bg-zinc-900 shadow-md'
                            : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center mb-3">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-tight text-white">Fast Track</div>
                          <div className="text-[10px] text-zinc-400 font-light">Capster Bebas</div>
                        </div>
                      </button>

                      {effectiveBarbers.map((b) => {
                        const isSelected = selectedBarber === b.name;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBarber(b.name)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                              isSelected
                                ? 'border-white bg-zinc-900 shadow-md'
                                : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden mb-3 border border-zinc-700">
                              <img src={b.photo} alt={b.name} className="w-full h-full object-cover grayscale" />
                            </div>
                            <div>
                              <div className="text-xs font-bold uppercase tracking-tight text-white">{b.name}</div>
                              <div className="text-[10px] text-zinc-400 font-light truncate">{b.specialty}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-step B: Tanggal Kunjungan */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-white">
                          Pilih Tanggal
                        </h3>
                        <p className="text-xs text-zinc-400 font-light mt-0.5">
                          Jadwal tersedia untuk 7 hari ke depan.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                      {UPCOMING_DATES.map((d) => {
                        const isSelected = selectedDate?.id === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDate(d)}
                            className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                              isSelected
                                ? 'border-white bg-white text-black shadow-lg scale-102'
                                : 'border-zinc-800/80 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:text-white'
                            }`}
                          >
                            <Calendar className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                            <div className="text-[11px] font-mono font-bold uppercase tracking-wider">{d.dayName}</div>
                            <div className="text-xs font-bold">{d.short}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-step C: Jam Kunjungan */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-white">
                          Pilih Jam Kunjungan
                        </h3>
                        <p className="text-xs text-zinc-400 font-light mt-0.5">
                          Durasi sesi disesuaikan dengan paket treatment yang dipilih.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white" /> Tersedia
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-zinc-800" /> Penuh
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                      {TIME_SLOTS.map((time, i) => {
                        const isFull = i === 3 || i === 8 || i === 13;
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            disabled={isFull}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className={`py-3.5 px-2 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? 'border-white bg-white text-black shadow-lg scale-102'
                                : isFull
                                ? 'border-zinc-900 bg-zinc-950/40 text-zinc-700 cursor-not-allowed line-through'
                                : 'border-zinc-800/80 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nav Buttons */}
                  <div className="pt-4 flex justify-between items-center">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-3.5 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono uppercase tracking-wider rounded-full transition-colors"
                    >
                      Kembali ke Layanan
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!selectedDate || !selectedTime}
                      className="px-8 py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                      <span>Lanjut Konfirmasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ━━━ STEP 3: DATA DIRI & METODE PEMBAYARAN ━━━ */}
              {step === 3 && (
                <motion.div 
                  key="step3" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="border-b border-zinc-900 pb-4">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                      Data Diri & Pembayaran
                    </h2>
                    <p className="text-xs text-zinc-400 font-light mt-0.5">
                      Informasi pemesanan akan dikonfirmasi melalui WhatsApp untuk pengingat jadwal.
                    </p>
                  </div>

                  <form id="booking-final-form" onSubmit={handleConfirm} className="space-y-6">
                    {/* Input Data Diri */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Contoh: Rafif Muhammad"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-xl p-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <span>Nomor WhatsApp *</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-xl p-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
                        Catatan Khusus (Opsional)
                      </label>
                      <input
                        type="text"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Contoh: Rambut agak tipis di bagian samping, ingin skin fade rapi..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-white rounded-xl p-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                      />
                    </div>

                    {/* Pilihan Metode Pembayaran */}
                    <div className="space-y-3 pt-2">
                      <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block">
                        Metode Pembayaran
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          onClick={() => setPaymentMethod('Tunai')}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                            paymentMethod === 'Tunai'
                              ? 'border-white bg-zinc-900'
                              : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            paymentMethod === 'Tunai' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">Bayar di Tempat (Kasir)</div>
                            <div className="text-[11px] text-zinc-400 font-light mt-0.5">
                              Tunai, Kartu Debit, atau QRIS saat sesi cukur selesai.
                            </div>
                          </div>
                        </div>

                        <div
                          onClick={() => setPaymentMethod('QRIS')}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                            paymentMethod === 'QRIS'
                              ? 'border-white bg-zinc-900'
                              : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            paymentMethod === 'QRIS' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">QRIS Instant</div>
                            <div className="text-[11px] text-zinc-400 font-light mt-0.5">
                              BCA, GoPay, OVO, ShopeePay & semua bank digital.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Guarantees Box */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center gap-3 text-xs text-zinc-400">
                      <ShieldCheck className="w-5 h-5 text-white shrink-0" />
                      <span>
                        Jaminan kepuasan E-CUKUR: Tepat waktu tanpa antrean panjang, alat steril & capster bersertifikat resmi.
                      </span>
                    </div>

                    {/* Nav Actions */}
                    <div className="pt-4 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-6 py-3.5 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs font-mono uppercase tracking-wider rounded-full transition-colors"
                      >
                        Kembali ke Jadwal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-2 shadow-xl disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <span>Memproses...</span>
                        ) : (
                          <>
                            <span>Selesaikan Reservasi</span>
                            <CheckCircle2 className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Sticky Summary Card (4 cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-5">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                  Ringkasan Booking
                </span>
                <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded-full">
                  Step {step}/3
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4 mb-6">
                
                {/* Layanan */}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Scissors className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Layanan Treatment</div>
                    <div className="font-bold text-white text-sm truncate">
                      {selectedService?.name || 'Belum dipilih'}
                    </div>
                    {selectedService && (
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {selectedService.duration} &bull; {formatRupiah(selectedService.price)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Capster */}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Artis Capster</div>
                    <div className="font-bold text-white text-sm truncate">
                      {selectedBarber}
                    </div>
                  </div>
                </div>

                {/* Tanggal & Waktu */}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Jadwal Sesi</div>
                    <div className="font-bold text-white text-sm">
                      {selectedDate?.label || 'Belum pilih tanggal'}
                    </div>
                    {selectedTime && (
                      <div className="text-[11px] font-mono text-zinc-300 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white" /> Pukul {selectedTime} WIB
                      </div>
                    )}
                  </div>
                </div>

                {/* Metode Pembayaran (Saat step 3) */}
                {step === 3 && (
                  <div className="flex items-start gap-3 text-sm pt-2 border-t border-zinc-900/60">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                      <CreditCard className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Pembayaran</div>
                      <div className="font-bold text-white text-sm">
                        {paymentMethod === 'Tunai' ? 'Tunai di Kasir' : 'QRIS Instant'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Price Section */}
              <div className="border-t border-zinc-900 pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Total Biaya</div>
                    <div className="text-xs text-zinc-400 font-light">Tanpa biaya admin tambahan</div>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight">
                    {selectedService ? formatRupiah(selectedService.price) : 'Rp 0'}
                  </div>
                </div>
              </div>

              {/* CTA based on step */}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 ? !selectedService : (!selectedDate || !selectedTime)}
                  className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{step === 1 ? 'Lanjut ke Jadwal' : 'Lanjut ke Konfirmasi'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="booking-final-form"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Sekarang'}
                </button>
              )}

              <p className="text-[10px] font-mono text-zinc-600 text-center mt-4 uppercase tracking-wider">
                Reschedule gratis hingga 2 jam sebelum sesi
              </p>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
