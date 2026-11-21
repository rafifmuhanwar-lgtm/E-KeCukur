import React from 'react';

/**
 * VerifiedBadge - Lencana Resmi Terverifikasi (Official Pro Verified Badge)
 * Berbentuk rosette 12-titik biru dengan centang putih membulat,
 * sesuai tampilan lencana verifikasi Twitter / Instagram / Meta Pro.
 */
export default function VerifiedBadge({ className = 'w-5 h-5', title = 'Akun Terverifikasi' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} inline-block shrink-0 select-none align-middle`}
      aria-label={title}
      title={title}
      style={{ overflow: 'visible' }}
    >
      {/* 12-Point Scalloped Rosette Starburst */}
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        fill="#0095F6"
      />
      {/* Bold White Rounded Checkmark */}
      <path
        d="M10.25 15.65a.997.997 0 0 1-.71-.29l-2.75-2.75a1 1 0 0 1 1.41-1.41l2.04 2.04 5.3-5.59a1 1 0 1 1 1.45 1.38l-6.02 6.35a.996.996 0 0 1-.72.27z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
