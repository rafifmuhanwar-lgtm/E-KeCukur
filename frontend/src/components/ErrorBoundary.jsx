import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      isChunkError: false 
    };
  }

  static getDerivedStateFromError(error) {
    // Deteksi jika error terjadi karena file chunk baru di-deploy (ChunkLoadError)
    const isChunk = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.name === 'ChunkLoadError';

    return { 
      hasError: true, 
      error, 
      isChunkError: isChunk 
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[E-CUKUR ErrorBoundary caught]:', error, errorInfo);
    this.setState({ errorInfo });

    // Jika error karena update bundle baru di server, otomatis reload sekali
    if (this.state.isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempt');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempt', 'true');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('chunk_reload_attempt');
    window.location.reload();
  };

  handleResetAndHome = () => {
    sessionStorage.clear();
    // Bersihkan cache spesifik tanpa menghapus token login penting
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('ecukur_') && !k.includes('auth')) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F6F2] text-[#171717] font-sans flex items-center justify-center p-4 selection:bg-[#285844] selection:text-white">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-200 shadow-lg text-center space-y-5">
            
            <div className="w-14 h-14 rounded-2xl bg-[#E8EFEA] text-[#285844] flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display font-bold text-xl text-[#171717]">
                {this.state.isChunkError ? 'Pembaruan Sistem Tersedia' : 'Halaman Mengalami Kendala'}
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                {this.state.isChunkError 
                  ? 'Ada versi terbaru dari E-CUKUR yang baru saja dirilis. Klik tombol di bawah untuk memuat versi terbaru.'
                  : 'Terjadi sedikit gangguan teknis saat menampilkan data. Silakan muat ulang halaman untuk kembali normal.'}
              </p>
            </div>

            {/* Error detail (hanya ringkas & aman) */}
            {this.state.error && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-left font-mono text-[10px] text-neutral-600 max-h-24 overflow-y-auto break-all">
                {String(this.state.error?.message || this.state.error)}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-[#285844] hover:bg-[#1E4334] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndHome}
                className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda Utama</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] text-neutral-400 font-mono flex items-center justify-center gap-1">
              <span>E-CUKUR Safe Recovery Mode</span>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
