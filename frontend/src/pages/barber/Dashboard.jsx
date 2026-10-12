import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ImagePlus, Settings, CheckCircle2, Scissors } from 'lucide-react';

export default function BarberDashboard() {
  const navigate = useNavigate();
  // Mock Barber Data
  const [barber] = useState({
    name: 'Andi Capster',
    specialty: 'Beard Grooming & Shave',
    photo: 'https://images.unsplash.com/photo-1621644158485-649016e3eb3b?q=80&w=1000&auto=format&fit=crop',
    status: 'Available'
  });

  const [activeTab, setActiveTab] = useState('portfolio');
  const [status, setStatus] = useState(barber.status);
  const [portfolio, setPortfolio] = useState([
    'https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=600',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=600'
  ]);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleUpload = () => {
    const newImage = prompt("Masukkan URL gambar karya potongan Anda (contoh: https://images...):");
    if (newImage) {
      setPortfolio([newImage, ...portfolio]);
      alert("Karya berhasil diunggah dan akan tampil di Masterpiece Gallery!");
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-[#C5A059] selection:text-black">
      
      {/* Premium Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-gray-900 px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-2">
          <Scissors className="w-6 h-6 text-[#C5A059]" /> E-CUKUR CAPSTER
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-red-500 transition-colors">
          <LogOut className="w-4 h-4" /> Keluar
        </button>
      </nav>

      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
        
        {/* Sidebar Profile */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#0C0C0C] border border-gray-800 p-6 text-center">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4 border-2 border-gray-800">
              <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover grayscale" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wide mb-1">{barber.name}</h2>
            <p className="text-[#C5A059] text-xs font-bold uppercase tracking-widest mb-6">{barber.specialty}</p>

            <div className="border-t border-gray-800 pt-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Status Saat Ini</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => setStatus('Available')} className={`py-3 text-xs font-bold uppercase tracking-widest border transition-all ${status === 'Available' ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'}`}>Tersedia (Kerja)</button>
                <button onClick={() => setStatus('Break')} className={`py-3 text-xs font-bold uppercase tracking-widest border transition-all ${status === 'Break' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-500' : 'bg-black border-gray-800 text-gray-500 hover:border-gray-600'}`}>Sedang Istirahat</button>
              </div>
            </div>
          </div>

          <div className="bg-[#0C0C0C] border border-gray-800 p-4">
            <nav className="flex flex-col gap-2">
              <button onClick={() => setActiveTab('portfolio')} className={`flex items-center gap-3 p-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'portfolio' ? 'bg-[#C5A059] text-black' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
                <ImagePlus className="w-4 h-4" /> Manajemen Karya
              </button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 p-3 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'settings' ? 'bg-[#C5A059] text-black' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}`}>
                <Settings className="w-4 h-4" /> Pengaturan Profil
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          
          {activeTab === 'portfolio' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-900 pb-6">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Portfolio Masterpiece</h1>
                  <p className="text-gray-500 text-sm font-light">Unggah hasil cukuran terbaikmu untuk ditampilkan di halaman depan web E-CUKUR.</p>
                </div>
                <button onClick={handleUpload} className="bg-white text-black px-6 py-3 font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-gray-200 transition-colors">
                  <ImagePlus className="w-4 h-4" /> Unggah Karya Baru
                </button>
              </div>

              {portfolio.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-gray-800 text-gray-500">
                  <ImagePlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada karya yang diunggah.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolio.map((img, i) => (
                    <div key={i} className="group relative aspect-square border border-gray-900 bg-[#0C0C0C] overflow-hidden">
                      <img src={img} alt={`Karya ${i}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="absolute top-2 right-2 bg-green-500 text-black p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Tampil di Web">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0C0C0C] border border-gray-800 p-8">
              <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">Pengaturan Profil</h1>
              <div className="space-y-6 max-w-md">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Nama Panggung</label>
                  <input type="text" defaultValue={barber.name} className="w-full bg-black border border-gray-800 text-white p-4 text-sm outline-none focus:border-[#C5A059]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block">Spesialisasi</label>
                  <input type="text" defaultValue={barber.specialty} className="w-full bg-black border border-gray-800 text-white p-4 text-sm outline-none focus:border-[#C5A059]" />
                </div>
                <button className="bg-[#C5A059] text-black w-full py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#d4b474] transition-colors">
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
}
