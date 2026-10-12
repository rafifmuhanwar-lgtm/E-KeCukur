import { create } from 'zustand';

export const useStore = create((set) => ({
  // Demo Data Barbers
  barbers: [
    { id: 'reza', name: 'Reza', specialty: 'Classic Cut & Fade', bio: 'Expert dalam potongan klasik dan fade modern.', photo: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop', status: 'AVAILABLE' },
    { id: 'bima', name: 'Bima', specialty: 'Hair Coloring & Perm', bio: 'Spesialis pewarnaan dan styling kekinian.', photo: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop', status: 'AVAILABLE' },
    { id: 'andi', name: 'Andi', specialty: 'Beard Grooming & Shave', bio: 'Ahli merawat brewok dan grooming pria.', photo: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop', status: 'AVAILABLE' },
    { id: 'doni', name: 'Doni', specialty: 'Modern Undercut', bio: 'Ahli variasi undercut kontemporer.', photo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop', status: 'BREAK' }
  ],
  
  // Demo Data Services
  services: [
    { id: 'cukur-dewasa', name: 'CUKUR DEWASA', description: 'Cukuran klasik dan modern', duration: '45 menit', price: 40000 },
    { id: 'cukur-anak', name: 'CUKUR ANAK', description: 'Potong rambut khusus anak', duration: '30 menit', price: 25000 },
    { id: 'keramas', name: 'KERAMAS', description: 'Cuci rambut relaxing & hair tonic', duration: '20 menit', price: 20000 },
    { id: 'coloring', name: 'HAIR COLORING', description: 'Pewarnaan rambut trendi', duration: '120 menit', price: 100000 },
    { id: 'perm', name: 'PERM', description: 'Keriting texture pria modern', duration: '180 menit', price: 150000 }
  ],

  // Bookings
  bookings: [
    { 
      id: 'BK-101', 
      customerName: 'Rian Saputra', 
      customerPhone: '081234567890',
      barberName: 'Reza', 
      serviceName: 'CUKUR DEWASA', 
      date: 'Sab 3 Okt', 
      time: '10:00', 
      status: 'Menunggu', 
      paymentMethod: 'Tunai', 
      paymentStatus: 'UNPAID',
      price: 40000 
    },
    { 
      id: 'BK-102', 
      customerName: 'Fajar Nugraha', 
      customerPhone: '081987654321',
      barberName: 'Bima', 
      serviceName: 'HAIR COLORING', 
      date: 'Min 4 Okt', 
      time: '13:00', 
      status: 'Selesai', 
      paymentMethod: 'QRIS', 
      paymentStatus: 'PAID',
      price: 100000 
    }
  ],

  // Actions
  addBooking: (booking) => set((state) => ({ 
    bookings: [
      { 
        ...booking, 
        id: `BK-${Math.floor(100 + Math.random() * 900)}`,
        status: 'Menunggu',
        paymentStatus: booking.paymentMethod === 'QRIS' ? 'PAID' : 'UNPAID'
      }, 
      ...state.bookings
    ] 
  })),

  updateBookingStatus: (id, status) => set((state) => ({
    bookings: state.bookings.map(b => b.id === id ? { ...b, status } : b)
  }))
}));
