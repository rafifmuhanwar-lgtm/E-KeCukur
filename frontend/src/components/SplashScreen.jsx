import React from 'react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: '#F7F6F2' }}
    >
      <div className="flex flex-col items-center text-center px-6">
        {/* Brand Icon Box with subtle pulse */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute -inset-2 bg-[#285844]/10 rounded-[32px] blur-md animate-pulse" />
          <div className="relative w-20 h-20 bg-[#285844] rounded-2xl flex items-center justify-center shadow-lg shadow-[#285844]/25">
            <svg
              className="w-11 h-11 text-[#F5F4EF]"
              viewBox="0 0 120 128"
              fill="currentColor"
              fillRule="evenodd"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0.0 57.0 L1.7 48.0 L5.7 37.0 L10.9 28.0 L15.5 22.0 L28.0 10.7 L39.0 4.7 L48.0 1.7 L59.0 0.2 L71.0 0.6 L86.0 4.8 L92.0 7.7 L102.0 14.7 L108.3 21.0 L114.4 30.0 L97.0 41.2 L62.0 61.5 L47.0 71.5 L41.0 73.5 L1.0 102.0 L0.5 101.0 L5.6 92.0 L1.6 81.0 L0.0 71.8 Z M25.3 72.0 L83.0 36.3 L87.5 33.0 L87.5 32.0 L85.0 28.9 L78.0 23.8 L71.0 20.8 L65.0 19.7 L54.0 20.6 L43.0 25.7 L38.0 29.6 L30.6 38.0 L24.7 50.0 L22.7 59.0 L22.5 68.0 L23.2 72.0 L24.0 72.8 L25.3 72.0 Z M69.0 127.0 L58.0 127.4 L50.0 126.4 L35.0 121.4 L21.3 112.0 L13.8 104.0 L11.7 100.0 L45.0 85.3 L76.0 68.7 L96.0 65.8 L95.1 69.0 L93.0 71.7 L86.0 77.1 L68.0 85.3 L44.0 92.7 L36.4 96.0 L38.0 98.5 L43.0 102.1 L50.0 105.2 L60.0 107.1 L68.0 106.5 L77.0 103.5 L84.0 99.0 L90.4 92.0 L95.0 85.0 L118.0 85.1 L118.6 86.0 L117.3 90.0 L111.4 101.0 L105.0 108.8 L98.0 115.3 L84.0 123.3 L69.0 127.0 Z M86.4 73.0 L88.3 71.0 L87.2 69.0 L86.0 68.7 L84.1 71.0 L85.0 72.8 L86.4 73.0 Z" />
            </svg>
          </div>
        </div>

        {/* Brand Text */}
        <div className="font-display font-extrabold text-2xl tracking-tight text-[#171717] flex items-center justify-center gap-1.5">
          <span>E-CUKUR</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#285844]" />
        </div>
        <p className="text-xs text-neutral-500 font-medium tracking-wide mt-1">
          Platform Digital Barbershop & Capster
        </p>

        {/* Elegant Animated Progress Bar */}
        <div className="w-40 h-1.5 bg-[#D9E5DC] rounded-full overflow-hidden mt-6 relative">
          <div
            className="absolute top-0 bottom-0 bg-[#285844] rounded-full"
            style={{
              width: '45%',
              animation: 'ecukur-shimmer 1.4s ease-in-out infinite alternate',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes ecukur-shimmer {
          0% { left: 0%; transform: translateX(0%); }
          100% { left: 100%; transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
