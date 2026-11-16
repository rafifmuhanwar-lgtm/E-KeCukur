import React from 'react';

/**
 * Komponen kartu barber yang menampilkan nama, foto, dan status.
 * Status ditampilkan sebagai badge berwarna:
 * - AVAILABLE (Free)   → hijau
 * - BREAK / LEAVE      → kuning
 * - OFF                → merah
 *
 * Props:
 * - barber: objek barber (id, name, photo, status, slug, ...)
 * - onSelect: fungsi dipanggil saat kartu dipilih (hanya bila status AVAILABLE)
 */
export default function BarberCard({ barber, onSelect }) {
  const statusMap = {
    AVAILABLE: { label: 'Free', color: 'bg-green-500' },
    BREAK: { label: 'Break', color: 'bg-yellow-500' },
    LEAVE: { label: 'Leave', color: 'bg-yellow-500' },
    OFF: { label: 'Offline', color: 'bg-red-500' },
  };
  const { label, color } = statusMap[barber.status] || { label: barber.status, color: 'bg-gray-400' };

  const isSelectable = barber.status === 'AVAILABLE';

  return (
    <div
      className={`border rounded-lg p-4 flex items-center space-x-4 cursor-${isSelectable ? 'pointer' : 'default'} hover:shadow`}
      onClick={() => isSelectable && onSelect && onSelect(barber)}
    >
      <img
        src={barber.photo || '/default-avatar.png'}
        alt={barber.name}
        className="w-12 h-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <div className="font-semibold text-lg">{barber.name}</div>
        <div className="text-sm text-gray-500">@{barber.handle?.replace('@', '')}</div>
      </div>
      <span className={`text-white px-2 py-1 rounded ${color} text-xs`}>{label}</span>
    </div>
  );
}
