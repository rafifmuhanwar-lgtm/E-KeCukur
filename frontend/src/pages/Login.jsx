import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Mail,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAppDomain } from '../lib/domain';
import Logo from '../components/Logo';

const CURRENT_YEAR = new Date().getFullYear();

export default function Login({ defaultTab = 'login' }) {
  const appDomain = getAppDomain();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || '';
  const modeParam = searchParams.get('mode') || (defaultTab === 'register' ? 'register' : 'login');

  const signInBarber = useStore((state) => state.signInBarber);
  const signUpBarber = useStore((state) => state.signUpBarber);
  const verifyOtpBarber = useStore((state) => state.verifyOtpBarber);
  const resendOtp = useStore((state) => state.resendOtp);

  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState(modeParam);

  // Form Fields - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form Fields - Register
  const [regSlug, setRegSlug] = useState(slugParam);
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // OTP Verification States
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Countdown timer effect for OTP resend
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Handle auto-suggesting Slug from Email prefix
  const handleEmailChange = (e) => {
    const val = e.target.value;
    setRegEmail(val);
    const prevPrefix = regEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const newPrefix = val.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!regSlug || regSlug === prevPrefix) {
      setRegSlug(newPrefix);
    }
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setOtpStep(false);
    setOtpCode('');
    setErrorMsg('');
    setSuccessMsg('');
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
          ? 'Email belum dikonfirmasi. Periksa kotak masuk untuk kode aktivasi akun.'
          : res.error || 'Gagal masuk. Periksa email dan kata sandi Anda.'
      );
    }
  };

  // Handle Barber Register
  const handleBarberRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regSlug.trim()) {
      setErrorMsg('Alamat link bio wajib diisi.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    const res = await signUpBarber({
      name: regSlug.trim(),
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
        setOtpStep(true);
        setOtpTimer(60);
        setSuccessMsg(
          `Kode OTP 6 digit telah dikirimkan ke email ${regEmail.trim()}. Silakan cek kotak masuk atau folder spam.`
        );
      }
    } else {
      setErrorMsg(
        res.error?.includes('already registered')
          ? 'Email ini sudah terdaftar. Silakan masuk.'
          : res.error || 'Gagal mendaftarkan akun.'
      );
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg('Masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setIsLoading(true);

    const res = await verifyOtpBarber({
      email: regEmail.trim(),
      token: otpCode.trim(),
      slug: regSlug.trim().toLowerCase(),
      phone: regPhone.trim()
    });

    setIsLoading(false);

    if (res.success) {
      navigate('/barber/dashboard');
    } else {
      setErrorMsg(res.error || 'Verifikasi kode OTP gagal.');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg('');
    const res = await resendOtp(regEmail.trim());
    setIsResending(false);
    if (res.success) {
      setOtpTimer(60);
      setSuccessMsg('Kode OTP baru telah dikirimkan ke email Anda.');
    } else {
      setErrorMsg(res.error || 'Gagal mengirim ulang kode OTP.');
    }
  };

  const googleBtnContainerRef = useRef(null);
  const [gisLoaded, setGisLoaded] = useState(false);

  // Handle direct Google ID Token (No supabase URL shown)
  const handleCredentialResponse = async (response) => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      if (!response?.credential) {
        throw new Error('Tidak ada token kredensial Google yang diterima.');
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });
      if (error) throw error;
      navigate('/barber/dashboard');
    } catch (err) {
      setGoogleLoading(false);
      setErrorMsg(err.message || 'Gagal login melalui Google ID Token.');
    }
  };

  useEffect(() => {
    const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '239781382181-sk41bl7t8ovgl98e04j13tsj0crevnqi.apps.googleusercontent.com').trim();

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: authMode === 'login' ? 'signin_with' : 'signup_with',
            width: googleBtnContainerRef.current.offsetWidth || 340,
            logo_alignment: 'left',
          });

          setGisLoaded(true);
        } catch (e) {
          console.warn('Google GIS button render:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGsi();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [authMode]);

  // Fallback OAuth Login / Register if GIS script is blocked
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/barber/dashboard`,
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
          navigate('/barber/dashboard');
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
            {authMode === 'login' ? 'Belum punya akun studio?' : 'Sudah terdaftar?'}
          </span>
          <button
            type="button"
            onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')}
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
              
              {/* Form Header */}
              <div className="pb-5 mb-5 border-b border-neutral-100">
                <h1 className="font-display font-bold text-xl text-[#171717] tracking-tight">
                  {otpStep
                    ? 'Verifikasi Kode OTP'
                    : authMode === 'login' 
                    ? 'Masuk ke Studio Capster & Barber' 
                    : 'Buat Link Bio Capster & Barber'}
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  {otpStep
                    ? 'Masukkan 6 digit kode OTP yang telah dikirim ke email Anda'
                    : authMode === 'login' 
                    ? 'Kelola jadwal, profil bio link, dan antrean booking bisnismu' 
                    : 'Dapatkan 1 link untuk seluruh info tarif, portofolio, dan jadwalmu'}
                </p>
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

              {/* STEP OTP VERIFICATION */}
              {otpStep ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors mb-4 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali & ubah data pendaftaran</span>
                  </button>

                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200/80 flex items-center justify-center mx-auto mb-3 text-[#171717]">
                    <Mail className="w-6 h-6 text-[#285844]" />
                  </div>

                  <p className="text-xs text-center text-neutral-600 mb-5 leading-relaxed">
                    Kode verifikasi 6 digit telah dikirimkan ke <strong className="text-[#171717]">{regEmail}</strong>.<br />
                    <span className="text-neutral-400 text-[11px]">Silakan periksa kotak masuk atau folder spam email Anda.</span>
                  </p>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1.5 text-center">
                        Kode OTP (6 Digit)
                      </label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        autoFocus
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center text-2xl font-mono tracking-[0.35em] font-bold py-3 bg-neutral-50/70 border border-neutral-300 rounded-xl outline-none focus:border-[#171717] focus:ring-2 focus:ring-[#171717]/10 text-[#171717] transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || otpCode.length < 6}
                      className="w-full py-3 bg-[#171717] hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memverifikasi OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verifikasi & Masuk Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <div className="pt-2 text-center">
                      {otpTimer > 0 ? (
                        <p className="text-xs text-neutral-400">
                          Kirim ulang kode dalam <span className="font-mono font-semibold text-neutral-700">{otpTimer}s</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResending}
                          className="text-xs font-semibold text-[#171717] hover:underline inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isResending ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Mengirim ulang...</span>
                            </>
                          ) : (
                            <span>Kirim Ulang Kode OTP</span>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Google Direct Sign-In Container (Renders official Google Button without Supabase redirect) */}
                  <div className="w-full flex flex-col items-center justify-center">
                    <div 
                      ref={googleBtnContainerRef}
                      className={`w-full flex justify-center ${gisLoaded && !googleLoading ? 'block' : 'hidden'} min-h-[44px]`}
                    />

                    {/* Fallback button if GIS script hasn't loaded or is authenticating */}
                    {(!gisLoaded || googleLoading) && (
                      <button 
                        type="button"
                        onClick={() => handleGoogleLogin()}
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
                    )}
                  </div>

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
                  {authMode === 'login' && (
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
                          <span>Masuk ke Dashboard Studio</span>
                        )}
                      </button>
                    </form>
                  )}

                  {/* BARBER: REGISTER FORM */}
                  {authMode === 'register' && (
                    <form onSubmit={handleBarberRegister} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-neutral-700 block mb-1">
                          Alamat Link Bio
                        </label>
                        <div className="flex items-center rounded-lg border border-neutral-200 focus-within:border-[#171717] focus-within:ring-1 focus-within:ring-[#171717] overflow-hidden bg-neutral-50/50">
                          <span className="px-3 py-2.5 text-xs text-neutral-400 font-mono select-none">
                            {appDomain}/
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
                            onChange={handleEmailChange}
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
                            <span>Mendaftarkan & Mengirim OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Daftar & Dapatkan Kode OTP</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-4 text-center text-[11px] text-neutral-400">
        © {CURRENT_YEAR} E-Cukur Indonesia • Platform Link-in-Bio Khusus Barber, Capster & Pangkas Rambut
      </footer>

    </div>
  );
}
