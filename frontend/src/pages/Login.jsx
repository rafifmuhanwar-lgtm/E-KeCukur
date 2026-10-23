import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import Logo from '../components/Logo';

const CURRENT_YEAR = new Date().getFullYear();

export default function Login({ defaultTab = 'login' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || '';
  const modeParam = searchParams.get('mode') || (defaultTab === 'register' ? 'register' : 'login');

  const signInBarber = useStore((state) => state.signInBarber);
  const signUpBarber = useStore((state) => state.signUpBarber);

  // Role: 'barber' | 'customer'
  const [role, setRole] = useState('barber');
  
  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState(modeParam);

  // Form Fields - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form Fields - Register
  const [regName, setRegName] = useState('');
  const [regSlug, setRegSlug] = useState(slugParam);
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Handle Slug auto-generation from Name
  const handleNameChange = (e) => {
    const val = e.target.value;
    setRegName(val);
    if (!regSlug || regSlug === regName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')) {
      setRegSlug(val.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, ''));
    }
  };

  // Handle Barber Login
  const handleBarberLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await signInBarber(loginEmail.trim(), loginPassword);
    setIsLoading(false);

    if (res.success) {
      navigate('/barber/dashboard');
    } else {
      setErrorMsg(
        res.error === 'Invalid login credentials'
          ? 'Email atau kata sandi tidak cocok. Silakan periksa kembali.'
          : res.error === 'Email not confirmed'
          ? 'Email belum dikonfirmasi. Periksa kotak masuk untuk aktivasi akun.'
          : res.error || 'Gagal masuk. Periksa email dan kata sandi Anda.'
      );
    }
  };

  // Handle Barber Register
  const handleBarberRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    const res = await signUpBarber({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim(),
      slug: regSlug.trim().toLowerCase()
    });

    setIsLoading(false);

    if (res.success) {
      if (res.hasSession) {
        navigate('/barber/dashboard');
      } else {
        setSuccessMsg(
          'Akun berhasil dibuat! Silakan cek kotak masuk email Anda untuk link aktivasi, atau Anda dapat langsung mencoba masuk.'
        );
        setAuthMode('login');
        setLoginEmail(regEmail.trim());
      }
    } else {
      setErrorMsg(
        res.error.includes('already registered')
          ? 'Email ini sudah terdaftar. Silakan masuk.'
          : res.error || 'Gagal mendaftarkan akun.'
      );
    }
  };

  // Handle Google OAuth Login / Register (Fast 1-Click)
  const handleGoogleLogin = async (targetRole = role) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured) {
        const redirectPath = targetRole === 'barber' ? '/barber/dashboard' : '/booking';
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${redirectPath}`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        });
        if (error) throw error;
      } else {
        setTimeout(() => {
          setGoogleLoading(false);
          navigate(targetRole === 'barber' ? '/barber/dashboard' : '/booking');
        }, 600);
      }
    } catch (err) {
      setGoogleLoading(false);
      setErrorMsg(err.message || 'Gagal menghubungkan ke Google Auth.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans flex flex-col justify-between selection:bg-[#285844] selection:text-white">
      
      {/* Minimal Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center group">
          <Logo variant="horizontal" size="md" />
        </Link>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 hidden sm:inline">
            {authMode === 'login' ? 'Belum punya akun barber?' : 'Sudah terdaftar?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="font-semibold text-[#171717] hover:text-[#285844] underline decoration-neutral-300 underline-offset-4 cursor-pointer transition-colors"
          >
            {authMode === 'login' ? 'Daftar Gratis' : 'Masuk Sekarang'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center flex-1">
        <div className="w-full flex items-center justify-center">
          
          {/* Form Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-6 sm:p-8">
              
              {/* Audience Selector (Barber vs Customer) */}
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-neutral-100">
                <div>
                  <h1 className="font-display font-bold text-xl text-[#171717] tracking-tight">
                    {role === 'barber'
                      ? (authMode === 'login' ? 'Masuk ke Studio Barber' : 'Buat Link Bio Barber')
                      : 'Portal Pelanggan Cukur'}
                  </h1>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {role === 'barber'
                      ? (authMode === 'login' ? 'Kelola jadwal, bio link, dan booking masuk' : '1 link untuk seluruh info, harga, dan portfoliomu')
                      : 'Reservasi jam cukur ke barber pilihanmu'}
                  </p>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRole(role === 'barber' ? 'customer' : 'barber');
                      setErrorMsg('');
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-[#171717] hover:border-neutral-300 bg-neutral-50/50 transition-all cursor-pointer"
                  >
                    {role === 'barber' ? 'Saya Pelanggan' : 'Saya Barber'}
                  </button>
                </div>
              </div>

              {/* Alert Messages */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1-Click Fast Google Button */}
              <button 
                type="button"
                onClick={() => handleGoogleLogin(role)}
                disabled={googleLoading}
                className="w-full bg-white hover:bg-neutral-50 text-[#171717] py-3 px-4 font-semibold text-xs rounded-xl border border-neutral-300 flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {googleLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#285844]" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                      <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z" />
                    </svg>
                    <span>
                      {authMode === 'login' ? 'Masuk Cepat dengan Google' : 'Daftar 1-Klik dengan Google'}
                    </span>
                  </>
                )}
              </button>

              {/* Minimal Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <span className="relative px-3 bg-white text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                  atau dengan email
                </span>
              </div>

              {/* BARBER: LOGIN FORM */}
              {role === 'barber' && authMode === 'login' && (
                <form onSubmit={handleBarberLogin} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">
                      Email
                    </label>
                    <input 
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full text-xs font-normal px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-neutral-700">Kata Sandi</label>
                    </div>
                    <input 
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 bg-[#171717] hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <span>Masuk ke Creator Studio</span>
                    )}
                  </button>
                </form>
              )}

              {/* BARBER: REGISTER FORM */}
              {role === 'barber' && authMode === 'register' && (
                <form onSubmit={handleBarberRegister} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">
                      Nama Barber atau Studio
                    </label>
                    <input 
                      type="text"
                      required
                      value={regName}
                      onChange={handleNameChange}
                      placeholder="e.g. Reza Fade / Studio Galaxy"
                      className="w-full text-xs font-normal px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">
                      Alamat Link Bio
                    </label>
                    <div className="flex items-center rounded-lg border border-neutral-200 focus-within:border-[#171717] focus-within:ring-1 focus-within:ring-[#171717] overflow-hidden bg-neutral-50/50">
                      <span className="px-3 py-2.5 text-xs text-neutral-400 font-mono select-none">
                        ecukur.id/
                      </span>
                      <input 
                        type="text"
                        required
                        value={regSlug}
                        onChange={(e) => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                        placeholder="namakamu"
                        className="flex-1 text-xs py-2.5 pr-3 bg-transparent outline-none text-[#171717] font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">
                        Nomor WhatsApp
                      </label>
                      <input 
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full text-xs px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">
                        Email
                      </label>
                      <input 
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full text-xs px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">
                      Kata Sandi (min. 6 karakter)
                    </label>
                    <input 
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3 py-2.5 bg-white border border-neutral-200 rounded-lg outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] text-[#171717] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-3 bg-[#171717] hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Buat Link Bio Saya</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* CUSTOMER AUTH */}
              {role === 'customer' && (
                <div className="space-y-3 pt-2 text-center">
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Pelanggan cukup gunakan <strong>1-Klik Akun Google</strong> di atas untuk login cepat tanpa perlu kata sandi terpisah.
                  </p>
                  <div className="pt-2">
                    <Link 
                      to="/booking"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#285844] hover:underline"
                    >
                      <span>Lihat jadwal barber langsung</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 text-center text-[11px] text-neutral-400">
        © {CURRENT_YEAR} E-Cukur Indonesia • Platform Link-in-Bio Khusus Barber & Capster
      </footer>

    </div>
  );
}
