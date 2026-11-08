import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../store';

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

  const barbers = useStore((state) => state.barbers || []);
  const services = useStore((state) => state.services || []);
  const addBooking = useStore((state) => state.addBooking);

  // Steps: 1 = Services, 2 = Date & Time, 3 = Confirmation & Form
  const [step, setStep] = useState(1);

  // Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedBarber, setSelectedBarber] = useState(initialBarberName || 'Bebas (Capster Tersedia)');
  const [selectedDate, setSelectedDate] = useState(UPCOMING_DATES[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod] = useState('QRIS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveServices = services.length > 0 ? services : [
    { id: '1', name: 'Signature Haircut', duration: '45m', price: 50000, description: 'Potong rambut presisi, konsultasi bentuk wajah, keramas, dan styling pomade.' },
    { id: '2', name: 'Beard Grooming & Shave', duration: '30m', price: 35000, description: 'Cukur jenggot & kumis rapi dengan handuk hangat dan shaving foam aromatik.' },
    { id: '3', name: 'Haircut + Beard Combo', duration: '60m', price: 75000, description: 'Paket lengkap potong rambut dan perapian jenggot untuk penampilan maksimal.' },
    { id: '4', name: 'Gentlemen Spa & Creambath', duration: '45m', price: 65000, description: 'Pijat kepala rileks dengan tonic ginseng untuk melancarkan sirkulasi darah.' }
  ];

  const effectiveBarbers = barbers.length > 0 ? barbers : [
    { id: 'b1', name: 'Dimas Fade', specialty: 'Skin Fade & Taper', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300' },
    { id: 'b2', name: 'Reza Barber', specialty: 'Classic Pompadour', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300' }
  ];

  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

  const handleNext = () => {
    if (step === 1 && !selectedService) return;
    if (step === 2 && (!selectedDate || !selectedTime)) return;
    setStep((prev) => Math.min(prev + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Silakan lengkapi nama dan nomor WhatsApp Anda.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(async () => {
      const created = await addBooking({
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
      if (created?.id) {
        navigate(`/tiket/${created.id}`);
      } else {
        navigate('/');
      }
    }, 600);
  };

  const STEPS = [
    { num: 1, title: 'Layanan', desc: 'Pilih Treatment' },
    { num: 2, title: 'Waktu', desc: 'Tanggal & Jam' },
    { num: 3, title: 'Konfirmasi', desc: 'Data & Bayar' }
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans antialiased flex flex-col selection:bg-[#285844] selection:text-white">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#285844] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-base tracking-tight text-[#171717]">
                E-CUKUR
              </span>
              <span className="text-neutral-400 text-xs">/</span>
              <span className="text-[11px] font-bold text-[#285844] tracking-wider uppercase">
                Booking Sesi
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <button 
              type="button"
              onClick={handleBack} 
              className="px-3.5 py-1.5 border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 hover:text-black rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{step === 1 ? 'Beranda' : 'Sebelumnya'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-24 flex-1 w-full space-y-8">
        
        {/* Editorial Heading */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#171717] tracking-tight">
            Reservasi Jadwal Cukur
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal leading-relaxed">
            Pilih layanan, capster, dan jam kunjungan yang paling nyaman untuk Anda tanpa perlu antre di lokasi.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
            {STEPS.map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (isPast) setStep(s.num);
                  }}
                  disabled={!isPast && !isActive}
                  className={`p-3 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isActive 
                      ? 'border-[#285844] bg-[#F0F5F2] shadow-2xs' 
                      : isPast 
                      ? 'border-neutral-200 bg-white hover:border-neutral-300 cursor-pointer shadow-2xs' 
                      : 'border-neutral-200 bg-white/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isPast ? 'bg-[#285844] text-white' : isActive ? 'bg-[#285844] text-white' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 hidden sm:inline font-bold">
                      0{s.num}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight">
                      {s.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 hidden sm:block truncate">
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
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">
                        Pilih Treatment
                      </h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Tentukan layanan grooming yang Anda butuhkan hari ini.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-neutral-400 font-semibold">{effectiveServices.length} Layanan</span>
                  </div>

                  <div className="grid gap-3 sm:gap-4">
                    {effectiveServices.map((svc) => {
                      const isSelected = selectedService?.id === svc.id;
                      return (
                        <div
                          key={svc.id}
                          onClick={() => setSelectedService(svc)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                            isSelected 
                              ? 'border-[#285844] bg-[#F0F5F2] ring-1 ring-[#285844] shadow-xs' 
                              : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-[#285844] text-white' : 'bg-neutral-100 text-neutral-600 group-hover:text-black'
                            }`}>
                              <Scissors className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-display font-bold text-neutral-900 text-base">
                                  {svc.name}
                                </h3>
                                {isSelected && (
                                  <span className="bg-[#285844] text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                    Dipilih
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 leading-relaxed">
                                {svc.description || 'Layanan potong rambut premium dengan teknik presisi.'}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400 pt-0.5">
                                <span className="flex items-center gap-1 font-semibold text-neutral-600">
                                  <Clock className="w-3 h-3 text-[#285844]" /> {svc.duration}
                                </span>
                                <span>&bull;</span>
                                <span>Konsultasi & Styling Termasuk</span>
                              </div>
                            </div>
                          </div>

                          <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100 flex sm:flex-col justify-between items-center sm:items-end">
                            <div className="text-[11px] font-mono text-neutral-400 sm:mb-0.5">Tarif</div>
                            <div className="text-xl sm:text-2xl font-display font-extrabold text-[#285844] tracking-tight">
                              {formatRupiah(svc.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!selectedService}
                      className="px-8 py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer active:scale-98"
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
                  {/* Capster Selection */}
                  <div className="space-y-3.5">
                    <div className="border-b border-neutral-200 pb-3">
                      <h2 className="font-display text-lg sm:text-xl font-bold text-neutral-900">
                        Pilih Capster
                      </h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Pilih seniman favorit Anda atau biarkan sistem mencocokkan capster yang tersedia.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedBarber('Bebas (Capster Tersedia)')}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          selectedBarber === 'Bebas (Capster Tersedia)'
                            ? 'border-[#285844] bg-[#F0F5F2] ring-1 ring-[#285844] shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#E8EFEA] text-[#285844] flex items-center justify-center mb-2">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-neutral-900">Fast Track</div>
                          <div className="text-[10px] text-neutral-500">Capster Bebas</div>
                        </div>
                      </button>

                      {effectiveBarbers.map((b) => {
                        const isSelected = selectedBarber === b.name;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBarber(b.name)}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? 'border-[#285844] bg-[#F0F5F2] ring-1 ring-[#285844] shadow-xs'
                                : 'border-neutral-200 bg-white hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden mb-2 border border-neutral-200">
                              <img src={b.photo} alt={b.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-neutral-900 truncate">{b.name}</div>
                              <div className="text-[10px] text-neutral-500 truncate">{b.specialty}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tanggal Kunjungan */}
                  <div className="space-y-3.5">
                    <div className="border-b border-neutral-200 pb-3">
                      <h3 className="font-display text-lg font-bold text-neutral-900">
                        Pilih Tanggal
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Jadwal tersedia untuk 7 hari ke depan.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                      {UPCOMING_DATES.map((d) => {
                        const isSelected = selectedDate?.id === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDate(d)}
                            className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'border-[#285844] bg-[#285844] text-white shadow-xs'
                                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                            }`}
                          >
                            <Calendar className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                            <div className="text-[10px] font-mono font-bold uppercase">{d.dayName}</div>
                            <div className="text-xs font-bold">{d.short}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jam Kunjungan */}
                  <div className="space-y-3.5">
                    <div className="border-b border-neutral-200 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-lg font-bold text-neutral-900">
                          Pilih Jam Kunjungan
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Sesi potong rambut dimulai tepat waktu.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                      {TIME_SLOTS.map((time) => {
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTime(time)}
                            className={`py-3 px-2 rounded-xl border text-center font-mono text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#285844] bg-[#285844] text-white shadow-xs'
                                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                            }`}
                          >
                            {time} WIB
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nav Buttons */}
                  <div className="pt-4 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Kembali ke Layanan
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!selectedDate || !selectedTime}
                      className="px-8 py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer active:scale-98"
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
                  className="space-y-6"
                >
                  <div className="border-b border-neutral-200 pb-3">
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">
                      Data Pemesan & Pembayaran
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Informasi tiket booking akan dikonfirmasikan via WhatsApp.
                    </p>
                  </div>

                  <form id="booking-final-form" onSubmit={handleConfirm} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#285844]" /> Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          className="w-full bg-white border border-neutral-200 focus:border-[#285844] rounded-xl p-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors shadow-2xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700">
                          Nomor WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="w-full bg-white border border-neutral-200 focus:border-[#285844] rounded-xl p-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors shadow-2xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700">
                        Catatan Khusus (Opsional)
                      </label>
                      <input
                        type="text"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder="Contoh: Model taper fade rapi, kumis jangan ditipiskan..."
                        className="w-full bg-white border border-neutral-200 focus:border-[#285844] rounded-xl p-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors shadow-2xs"
                      />
                    </div>

                    {/* Pilihan Metode Pembayaran */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-neutral-700 block">
                        Metode Pembayaran
                      </label>

                      <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#285844] text-white flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-neutral-900 flex items-center gap-2">
                              <span>QRIS Dinamis (100% Cashless)</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">Otomatis Terverifikasi</span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">
                              BCA, Mandiri, GoPay, DANA, ShopeePay, OVO & semua m-Banking.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-neutral-200 flex items-center gap-2.5 text-xs text-neutral-600 shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-[#285844] shrink-0" />
                      <span>
                        Jaminan kepuasan E-CUKUR: Tepat waktu tanpa antrean panjang, alat steril & capster profesional.
                      </span>
                    </div>

                    {/* Nav Actions */}
                    <div className="pt-4 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-5 py-2.5 border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Kembali ke Jadwal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3.5 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
                      >
                        {isSubmitting ? (
                          <span>Memproses...</span>
                        ) : (
                          <>
                            <span>Konfirmasi Reservasi</span>
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
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-xs font-bold text-neutral-900">
                  Ringkasan Booking
                </span>
                <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold text-neutral-600 rounded-full">
                  Step {step}/3
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3.5 text-xs">
                
                {/* Layanan */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-[#285844]">
                    <Scissors className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Layanan</div>
                    <div className="font-bold text-neutral-900 truncate">
                      {selectedService?.name || 'Belum dipilih'}
                    </div>
                    {selectedService && (
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {selectedService.duration} &bull; {formatRupiah(selectedService.price)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Capster */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-[#285844]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Capster</div>
                    <div className="font-bold text-neutral-900 truncate">
                      {selectedBarber}
                    </div>
                  </div>
                </div>

                {/* Tanggal & Waktu */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-[#285844]">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Jadwal Sesi</div>
                    <div className="font-bold text-neutral-900">
                      {selectedDate?.label || 'Belum dipilih'}
                    </div>
                    {selectedTime && (
                      <div className="text-[11px] font-mono text-[#285844] font-bold mt-0.5">
                        Pukul {selectedTime} WIB
                      </div>
                    )}
                  </div>
                </div>

                {step === 3 && (
                  <div className="flex items-start gap-3 pt-2 border-t border-neutral-100">
                    <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-[#285844]">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Pembayaran</div>
                      <div className="font-bold text-neutral-900">
                        QRIS Dinamis
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Price Section */}
              <div className="border-t border-neutral-100 pt-3">
                <div className="flex justify-between items-baseline">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Total Biaya</div>
                    <div className="text-[11px] text-neutral-500">Tanpa biaya admin</div>
                  </div>
                  <div className="text-xl font-display font-extrabold text-[#285844]">
                    {selectedService ? formatRupiah(selectedService.price) : 'Rp 0'}
                  </div>
                </div>
              </div>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 ? !selectedService : (!selectedDate || !selectedTime)}
                  className="w-full py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>{step === 1 ? 'Lanjut ke Jadwal' : 'Lanjut ke Konfirmasi'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="booking-final-form"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Sekarang'}
                </button>
              )}

              <p className="text-[10px] text-neutral-400 text-center font-mono">
                Reschedule gratis hingga 2 jam sebelum sesi
              </p>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
