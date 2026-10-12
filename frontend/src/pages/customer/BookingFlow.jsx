import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, User, Scissors } from 'lucide-react';
import { useStore } from '../../store';

const DATES = [
  { id: '2023-10-02', label: 'Jum 2 Okt' },
  { id: '2023-10-03', label: 'Sab 3 Okt' },
  { id: '2023-10-04', label: 'Min 4 Okt' },
  { id: '2023-10-05', label: 'Sen 5 Okt' },
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '19:00', '19:30'
];

export default function BookingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barberId = searchParams.get('barber') || 'Bebas (Pilihan Terbaik)';

  const services = useStore((state) => state.services);
  const addBooking = useStore((state) => state.addBooking);

  const [step, setStep] = useState(1);
  
  // Selections
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const STEPS = [
    { num: 1, title: 'Layanan' },
    { num: 2, title: 'Tanggal' },
    { num: 3, title: 'Jam' },
    { num: 4, title: 'Ringkasan' }
  ];

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate('/');
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert('Silakan lengkapi nama dan nomor WhatsApp!');
      return;
    }

    // Simpan ke Zustand Store
    addBooking({
      customerName,
      customerPhone,
      barberName: barberId,
      serviceName: selectedService?.name || 'CUKUR UMUM',
      date: selectedDate?.label || 'Hari Ini',
      time: selectedTime || '10:00',
      price: selectedService?.price || 0,
      paymentMethod
    });

    navigate('/customer/bookings');
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-[#C5A059] selection:text-black pb-20">
      
      {/* Header */}
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-gray-900 px-4 md:px-6 py-4 md:py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
          E-CUKUR STUDIO
        </div>
        <button onClick={handleBack} className="border-2 border-white text-white px-4 py-2 md:px-6 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
          Kembali
        </button>
      </nav>


      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-32 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Main Content (Left) */}
        <div className="lg:col-span-8">
          
          {/* Progress Bar */}
          <div className="flex justify-between mb-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-800 -z-10"></div>
            {STEPS.map((s) => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-2 bg-black px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-[#C5A059] text-black' : isPast ? 'bg-white text-black' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}>
                    {isPast ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? 'text-[#C5A059]' : isPast ? 'text-white' : 'text-gray-600'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: LAYANAN */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Pilih Layanan</h2>
                <div className="grid gap-4">
                  {services.map((svc) => (
                    <button 
                      key={svc.id}
                      onClick={() => { setSelectedService(svc); handleNext(); }}
                      className={`flex justify-between items-center p-6 border text-left transition-all ${selectedService?.id === svc.id ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-gray-800 bg-black hover:border-gray-600'}`}
                    >
                      <div>
                        <div className="font-bold uppercase tracking-wide mb-1">{svc.name}</div>
                        <div className="text-xs text-gray-500 font-light">{svc.duration}</div>
                      </div>
                      <div className="font-bold text-[#C5A059]">{formatRupiah(svc.price)}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: TANGGAL */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Pilih Tanggal</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {DATES.map((d) => (
                    <button 
                      key={d.id}
                      onClick={() => { setSelectedDate(d); handleNext(); }}
                      className={`p-6 border text-center transition-all ${selectedDate?.id === d.id ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-gray-800 bg-black hover:border-gray-600 text-gray-400'}`}
                    >
                      <Calendar className="w-6 h-6 mx-auto mb-3 opacity-50" />
                      <div className="font-bold text-sm tracking-wide">{d.label}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: JAM */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Pilih Jam</h2>
                
                <div className="flex gap-4 mb-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 bg-black border border-gray-700"></div> Tersedia</span>
                  <span className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-900 border border-gray-900 opacity-50"></div> Penuh</span>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {TIME_SLOTS.map((time, i) => {
                    const isFull = i === 2 || i === 5 || i === 8; // Simulate some full slots
                    const isSelected = selectedTime === time;
                    return (
                      <button 
                        key={time}
                        disabled={isFull}
                        onClick={() => { setSelectedTime(time); handleNext(); }}
                        className={`py-4 border text-center transition-all text-sm font-bold tracking-widest ${
                          isSelected ? 'border-[#C5A059] bg-[#C5A059] text-black' : 
                          isFull ? 'bg-gray-900 border-gray-900 text-gray-600 opacity-50 cursor-not-allowed' : 
                          'border-gray-800 bg-black hover:border-gray-600'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: RINGKASAN & DATA DIRI */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Data Diri & Pembayaran</h2>
                
                <form id="booking-form" onSubmit={handleConfirm} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nama Lengkap</label>
                      <input type="text" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} required placeholder="Contoh: Reza Rahadian" className="w-full bg-black border border-gray-800 focus:border-[#C5A059] text-white p-4 text-sm outline-none transition-colors" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nomor WhatsApp</label>
                      <input type="tel" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} required placeholder="0812..." className="w-full bg-black border border-gray-800 focus:border-[#C5A059] text-white p-4 text-sm outline-none transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 block">Metode Pembayaran</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button type="button" onClick={() => setPaymentMethod('Tunai')} className={`p-4 border text-center font-bold text-sm tracking-widest uppercase transition-colors ${paymentMethod === 'Tunai' ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10' : 'border-gray-800 bg-black text-gray-400 hover:border-gray-600'}`}>Tunai di Kasir</button>
                      <button type="button" onClick={() => setPaymentMethod('QRIS')} className={`p-4 border text-center font-bold text-sm tracking-widest uppercase transition-colors ${paymentMethod === 'QRIS' ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10' : 'border-gray-800 bg-black text-gray-400 hover:border-gray-600'}`}>QRIS / E-Wallet</button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary (Right) */}
        <div className="lg:col-span-4">
          <div className="bg-black border border-gray-800 p-6 sticky top-24">
            <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-800 pb-4 mb-4">Ringkasan</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 text-sm">
                <User className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Capster</div>
                  <div className="font-bold">{barberId}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 text-sm">
                <Scissors className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Layanan</div>
                  <div className="font-bold">{selectedService ? selectedService.name : '-'}</div>
                  {selectedService && <div className="text-gray-500 text-xs mt-1">{formatRupiah(selectedService.price)}</div>}
                </div>
              </div>

              <div className="flex items-start gap-4 text-sm">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Jadwal</div>
                  <div className="font-bold">
                    {selectedDate ? selectedDate.label : '-'} {selectedTime ? `• ${selectedTime}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 mb-6 flex justify-between items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Harga</span>
              <span className="text-2xl font-black text-[#C5A059]">
                {selectedService ? formatRupiah(selectedService.price) : 'Rp 0'}
              </span>
            </div>

            {step === 4 ? (
              <button 
                form="booking-form"
                type="submit"
                className="w-full bg-[#C5A059] text-black py-4 font-black uppercase tracking-widest text-xs hover:bg-[#d4b474] transition-colors disabled:opacity-50"
              >
                Konfirmasi Booking
              </button>
            ) : (
              <button 
                disabled
                className="w-full bg-gray-900 text-gray-600 py-4 font-black uppercase tracking-widest text-xs cursor-not-allowed border border-gray-800"
              >
                Pilih Dulu {step === 1 ? 'Layanan' : step === 2 ? 'Tanggal' : 'Jam'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
