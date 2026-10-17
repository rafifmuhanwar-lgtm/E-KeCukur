import React from 'react';

/**
 * Official E Cukur Logo Component
 * Matches the official Brand Guidelines (Sora Typography + Razor 'e' Symbol + Barber & More)
 *
 * Variants:
 * - 'horizontal' (default): Razor 'e' mark | e cukur + BARBER & MORE
 * - 'compact': Razor 'e' mark + e cukur (no divider/tagline)
 * - 'mark': Just the Razor 'e' symbol
 * - 'badge': Circular seal badge (EST. 2024)
 * - 'app-icon': Squircle icon
 */

// Exact vector path of the Razor 'e' mark from the official brand identity
export function RazorEMark({ className = "w-6 h-6", color = "currentColor" }) {
  return (
    <svg 
      viewBox="0 0 120 128" 
      fill={color} 
      fillRule="evenodd"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M0.0 57.0 L1.7 48.0 L5.7 37.0 L10.9 28.0 L15.5 22.0 L28.0 10.7 L39.0 4.7 L48.0 1.7 L59.0 0.2 L71.0 0.6 L86.0 4.8 L92.0 7.7 L102.0 14.7 L108.3 21.0 L114.4 30.0 L97.0 41.2 L62.0 61.5 L47.0 71.5 L41.0 73.5 L1.0 102.0 L0.5 101.0 L5.6 92.0 L1.6 81.0 L0.0 71.8 Z M25.3 72.0 L83.0 36.3 L87.5 33.0 L87.5 32.0 L85.0 28.9 L78.0 23.8 L71.0 20.8 L65.0 19.7 L54.0 20.6 L43.0 25.7 L38.0 29.6 L30.6 38.0 L24.7 50.0 L22.7 59.0 L22.5 68.0 L23.2 72.0 L24.0 72.8 L25.3 72.0 Z M69.0 127.0 L58.0 127.4 L50.0 126.4 L35.0 121.4 L21.3 112.0 L13.8 104.0 L11.7 100.0 L45.0 85.3 L76.0 68.7 L96.0 65.8 L95.1 69.0 L93.0 71.7 L86.0 77.1 L68.0 85.3 L44.0 92.7 L36.4 96.0 L38.0 98.5 L43.0 102.1 L50.0 105.2 L60.0 107.1 L68.0 106.5 L77.0 103.5 L84.0 99.0 L90.4 92.0 L95.0 85.0 L118.0 85.1 L118.6 86.0 L117.3 90.0 L111.4 101.0 L105.0 108.8 L98.0 115.3 L84.0 123.3 L69.0 127.0 Z M86.4 73.0 L88.3 71.0 L87.2 69.0 L86.0 68.7 L84.1 71.0 L85.0 72.8 L86.4 73.0 Z" />
    </svg>
  );
}

export default function Logo({ 
  variant = 'horizontal', 
  theme = 'dark', // 'dark' (charcoal text for light bg) | 'light' (white text for dark bg) | 'forest'
  size = 'md', // 'sm' | 'md' | 'lg'
  withTagline = true,
  className = ''
}) {
  const isLight = theme === 'light';
  const textColor = isLight ? 'text-white' : (theme === 'forest' ? 'text-[#285844]' : 'text-[#0F1110]');
  const dividerColor = isLight ? 'bg-white/30' : 'bg-[#0F1110]/25';
  const subtextColor = isLight ? 'text-white/75' : 'text-neutral-500';

  // Mark only variant
  if (variant === 'mark') {
    const markSizes = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-10 h-10',
      xl: 'w-14 h-14'
    };
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <RazorEMark className={markSizes[size] || markSizes.md} color="currentColor" />
      </div>
    );
  }

  // App icon squircle variant
  if (variant === 'app-icon') {
    const appSizes = {
      sm: 'w-8 h-8 rounded-lg p-1.5',
      md: 'w-10 h-10 rounded-xl p-2',
      lg: 'w-12 h-12 rounded-2xl p-2.5',
      xl: 'w-16 h-16 rounded-[22px] p-3.5'
    };
    return (
      <div className={`bg-[#0F1110] text-[#F5F4EF] flex items-center justify-center shadow-sm shrink-0 ${appSizes[size] || appSizes.md} ${className}`}>
        <RazorEMark className="w-full h-full" color="#F5F4EF" />
      </div>
    );
  }

  // Circular seal badge variant (EST. 2024 • BARBER & MORE)
  if (variant === 'badge') {
    return (
      <div className={`relative inline-flex items-center justify-center rounded-full bg-[#1A3326] text-[#F5F4EF] border border-[#2E4A3A] p-4 ${className}`}>
        <img 
          src="/logo_seal_badge.png" 
          alt="E Cukur Seal" 
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-full" 
        />
      </div>
    );
  }

  // Compact variant (Mark + Wordmark, no vertical divider)
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${textColor} ${className}`}>
        <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
          <RazorEMark className="w-full h-full" color="currentColor" />
        </div>
        <span className="font-sora font-extrabold text-lg sm:text-xl tracking-tight leading-none lowercase">
          e cukur
        </span>
      </div>
    );
  }

  // Default: Horizontal Brand Lockup (Razor 'e' Mark | e cukur + BARBER & MORE)
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${textColor} ${className}`}>
      
      {/* Icon: Razor 'e' */}
      <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
        <RazorEMark className="w-full h-full" color="currentColor" />
      </div>

      {/* Vertical Hairline Divider (from brand guideline) */}
      <div className={`w-[1px] h-6 sm:h-7 ${dividerColor} shrink-0`} />

      {/* Wordmark + Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span className="font-sora font-extrabold text-base sm:text-lg tracking-tight leading-none lowercase">
            e cukur
          </span>
          <span className="text-[9px] font-sans font-bold leading-none opacity-60">®</span>
        </div>
        
        {withTagline && (
          <span className={`font-sora font-semibold text-[7px] sm:text-[8px] uppercase tracking-[0.25em] leading-tight mt-0.5 ${subtextColor}`}>
            BARBER & MORE
          </span>
        )}
      </div>

    </div>
  );
}
