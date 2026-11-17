// src/pages/admin/BarberStatus.jsx
import React, { useEffect } from 'react';
import { useStore } from '../../store';
import BarberCard from '../../components/BarberCard';
import { motion } from 'framer-motion';

/**
 * Halaman admin untuk mengelola status barber (capster).
 * Menampilkan daftar barber dengan badge status dan tombol toggle.
 */
export default function BarberStatus() {
  const {
    barbers,
    fetchBarbers,
    updateBarberStatus,
    isLoading,
  } = useStore((s) => ({
    barbers: s.barbers,
    fetchBarbers: s.fetchBarbers,
    updateBarberStatus: s.updateBarberStatus,
    isLoading: s.isLoading,
  }));

  // Load barbers saat komponen mount
  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  // Siklus status yang di‑toggle oleh admin
  const statusCycle = {
    AVAILABLE: 'BREAK',
    BREAK: 'LEAVE',
    LEAVE: 'OFF',
    OFF: 'AVAILABLE',
  };

  const handleToggle = async (barber) => {
    const next = statusCycle[barber.status] ?? 'AVAILABLE';
    await updateBarberStatus(barber.id, next);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manajemen Status Capster</h1>

      {isLoading && <p>Memuat data…</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {barbers.map((b) => (
          <motion.div
            key={b.id}
            whileHover={{ scale: 1.02 }}
            className="border rounded-lg p-4 flex flex-col"
          >
            <BarberCard barber={b} />
            <motion.button
              whileTap={{ scale: 0.95 }}
              className={`mt-3 px-4 py-2 rounded text-white ${
                b.status === 'AVAILABLE'
                  ? 'bg-green-600 hover:bg-green-500'
                  : b.status === 'OFF'
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-yellow-600 hover:bg-yellow-500'
              }`}
              onClick={() => handleToggle(b)}
            >
              Ubah ke {statusCycle[b.status] ?? 'AVAILABLE'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
