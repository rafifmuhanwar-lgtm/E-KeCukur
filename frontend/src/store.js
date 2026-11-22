import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { uploadBarberProfilePhoto, uploadPortfolioPhoto, uploadBarberBannerPhoto } from './lib/imageUploader';
import { createGuestTicketToken } from './lib/bookingTracking';

// â”€â”€â”€ STATUS MAPPERS (SUPABASE DB <-> UI) â”€â”€â”€
export const dbToUiStatus = (dbStatus) => {
  switch (dbStatus) {
    case 'CONFIRMED':
      return 'Terkonfirmasi';
    case 'ARRIVED':
      return 'Tiba di Lokasi';
    case 'WAITING':
      return 'Menunggu';
    case 'IN_SERVICE':
      return 'Sedang Dilayani';
    case 'COMPLETED':
      return 'Selesai';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'Batal';
    case 'PENDING_PAYMENT':
    default:
      return 'Menunggu';
  }
};

export const uiToDbStatus = (uiStatus) => {
  switch (uiStatus) {
    case 'Terkonfirmasi':
      return 'CONFIRMED';
    case 'Tiba di Lokasi':
      return 'ARRIVED';
    case 'Sedang Dilayani':
      return 'IN_SERVICE';
    case 'Selesai':
      return 'COMPLETED';
    case 'Batal':
      return 'CANCELLED';
    case 'Menunggu':
    default:
      return 'PENDING_PAYMENT';
  }
};

// Helper: Ubah baris tabel Supabase 'barbers' menjadi objek siap pakai
export const mapSupabaseBarber = (row, _allServices = []) => {
  const cleanName = row.name || 'Barber';
  const slug = row.slug || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Format services jika ada (kosong secara default untuk akun baru)
  const rawServices = (Array.isArray(row.services) && row.services.length > 0)
    ? row.services
    : (Array.isArray(row.custom_services) && row.custom_services.length > 0)
    ? row.custom_services
    : [];

  const mappedServices = rawServices.map(s => ({
    id: s.id,
    name: s.name,
    price: Number(s.price) || 0,
    duration: s.duration ? s.duration : (s.duration_minutes ? `${s.duration_minutes}m` : '45m'),
    tag: s.tag || (s.price >= 100000 ? 'Premium' : s.price <= 30000 ? 'Hemat' : 'Layanan'),
    active: s.is_active !== false && s.active !== false,
    desc: s.description || s.desc || ''
  }));

  const rawLookbook = Array.isArray(row.lookbook) ? row.lookbook : [];
  const rawLinks = Array.isArray(row.custom_links) ? row.custom_links : (Array.isArray(row.customLinks) ? row.customLinks : []);

  // Bersihkan data seed default lama jika masih menempel di akun
  const isDummyBio = !row.bio || row.bio.includes('Siap melayani potongan rambut') || row.bio.includes('Siap melayani');
  const cleanBio = isDummyBio ? '' : row.bio;

  const isDummyAddress = !row.address || row.address === 'Studio Barber' || row.address === 'Alamat Belum Diatur';
  const cleanAddress = isDummyAddress ? '' : row.address;

  const isDummySchedule = !row.schedule || row.schedule.includes('Buka 10:00') || row.schedule.includes('Siap Terima Booking');
  const cleanSchedule = isDummySchedule ? '' : row.schedule;

  const barberObj = {
    id: row.id,
    user_id: row.user_id,
    slug: slug,
    name: cleanName,
    handle: `@${slug}`,
    email: row.email,
    phone: row.phone || row.whatsapp || '',
    whatsapp: row.whatsapp || row.phone || '',
    whatsappMessage: `Halo ${cleanName}, saya mau booking jadwal cukur lewat link bio kamu`,
    specialty: '',
    bio: cleanBio,
    photo: row.profile_photo || '',
    status: row.availability_status || 'AVAILABLE',
    schedule: cleanSchedule,
    workingHours: row.working_hours || '',
    openDays: row.open_days || '',
    theme: row.theme || 'forest',
    buttonStyle: row.button_style || 'rounded',
    address: cleanAddress,
    mapsUrl: row.maps_url || '',
    instagram: row.instagram || '',
    tiktok: row.tiktok || '',
    bannerImage: row.banner_image || row.cover_photo || row.coverImage || '',
    locationCity: row.location_city || row.city || '',
    services: mappedServices,
    lookbook: rawLookbook,
    customLinks: rawLinks,
    profileType: row.profile_type || 'barber',
    features: {
      booking: true,
      services: true,
      lookbook: true,
      team: false,
      location: true,
      tipping: true,
      operatingHours: {
        open: '09:00',
        close: '21:00',
        slotInterval: 30,
        bufferMinutes: 0,
        breakTime: {
          enabled: false,
          start: '12:00',
          end: '13:00',
          fridayStart: '11:30',
          fridayEnd: '13:00'
        }
      },
      ...(row.features || {})
    },
    teamMembers: Array.isArray(row.team_members) ? row.team_members : (Array.isArray(row.team) ? row.team : []),
    tippingConfig: row.tipping_config || {
      title: 'Traktir Kopi Capster',
      message: 'Puas dengan hasil potongan? Beri sedikit apresiasi agar capster favoritmu makin semangat berkarya!',
      qrisImage: '',
      bankName: 'BCA / QRIS',
      accountNumber: '',
      accountHolder: '',
      thankYouMessage: 'Terima kasih banyak atas tip kopinya! Sehat dan sukses selalu bro ðŸ™',
      presets: [
        { id: 'p1', amount: 5000, label: 'Kopi Tubruk', price: '5K', active: true, emoji: 'â˜•' },
        { id: 'p2', amount: 10000, label: 'Es Kopi Susu', price: '10K', active: true, emoji: 'ðŸ¥¤' },
        { id: 'p3', amount: 20000, label: 'Roti & Kopi', price: '20K', active: true, emoji: 'ðŸ¥' },
        { id: 'p4', amount: 35000, label: 'Paket Makan Siang', price: '35K', active: true, emoji: 'ðŸ±' },
        { id: 'p5', amount: 50000, label: 'Traktir Sultan', price: '50K', active: true, emoji: 'ðŸ‘‘' },
        { id: 'p6', amount: 100000, label: 'Super Fan Cukur', price: '100K', active: false, emoji: 'ðŸ”¥' },
      ]
    },
    tipsHistory: Array.isArray(row.tips_history) ? row.tips_history : [],
    tipBalance: typeof row.tip_balance === 'number' 
      ? row.tip_balance 
      : (Array.isArray(row.tips_history) ? row.tips_history.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) : 0),
    withdrawalsHistory: Array.isArray(row.withdrawals_history) ? row.withdrawals_history : [],
    payoutAccount: row.payout_account || {
      bankName: 'BCA',
      accountNumber: '',
      accountHolder: ''
    },
    plan: row.plan || row.features?.plan || (row.profile_type === 'capster' ? 'capster' : (row.features?.team ? 'barber' : 'free')),
    accountStatus: row.account_status || 'ACTIVE',
    stats: {
      views: 0,
      whatsappClicks: 0,
      bookings: 0,
      topService: '-'
    }
  };

  // Merge dengan local cache jika kolom database baru belum ditambahkan (khusus config tampilan)
  try {
    if (typeof localStorage !== 'undefined') {
      const cachedStr = localStorage.getItem(`ecukur_barber_cache_${row.id}`) || localStorage.getItem(`ecukur_barber_cache_${slug}`);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (!row.features && cached.features) barberObj.features = cached.features;
        if (!row.tipping_config && cached.tippingConfig) barberObj.tippingConfig = cached.tippingConfig;
        if (row.tip_balance === undefined && cached.tipBalance !== undefined) barberObj.tipBalance = cached.tipBalance;
        if (!row.plan && !row.features?.plan && cached.plan) barberObj.plan = cached.plan;
      }
      const directPlan = localStorage.getItem(`ecukur_plan_${row.id}`) || localStorage.getItem(`ecukur_plan_${slug}`);
      if (directPlan && !row.plan && !row.features?.plan) {
        barberObj.plan = directPlan;
      }
    }
  } catch {}

  return barberObj;
};

async function saveBarberPayloadToSupabase(barberId, payload) {
  if (!isSupabaseConfigured || !barberId || !payload || Object.keys(payload).length === 0) {
    return { success: false, error: 'Supabase is not configured or the update is invalid.' };
  }

  let toSend = { ...payload };
  let lastError = null;

  // Temukan target di store untuk mendapatkan UUID dan slug yang valid
  let target = null;
  try {
    const state = useStore.getState();
    target = state?.barbers?.find((b) => b.id === barberId || b.slug === barberId) || state?.activeBarber;
  } catch {}

  const realId = target?.id || barberId;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(realId));
  const realSlug = target?.slug || (!isUUID ? barberId : null);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      let query = supabase.from('barbers').update(toSend);
      if (isUUID) {
        query = query.eq('id', realId);
      } else if (realSlug) {
        query = query.eq('slug', realSlug);
      } else {
        query = query.eq('id', barberId);
      }

      const { data, error } = await query.select();

      if (!error) {
        // Jika tidak ada baris yang ter-update dan dicoba via UUID, coba via slug jika ada
        if (Array.isArray(data) && data.length === 0 && realSlug) {
          const retrySlug = await supabase.from('barbers').update(toSend).eq('slug', realSlug).select();
          if (!retrySlug.error && retrySlug.data?.length > 0) {
            return { success: true, data: retrySlug.data };
          }
        }
        return { success: true, data };
      }
      lastError = error.message;

      // Jika kolom tertentu belum ada di Supabase, hapus dari toSend lalu ulangi sisa kolom
      const match = error.message && (
        error.message.match(/Could not find the '([^']+)' column/i) ||
        error.message.match(/column (?:[a-zA-Z0-9_]+\.)?([a-zA-Z0-9_]+) does not exist/i)
      );
      if (match && match[1]) {
        delete toSend[match[1]];
        if (Object.keys(toSend).length === 0) break;
      } else {
        console.warn('[Supabase update notice]:', error.message);
        break;
      }
    } catch (e) {
      console.warn('[Supabase update exception]:', e.message);
      lastError = e.message;
      break;
    }
  }
  return { success: false, error: lastError || 'Unable to save the profile update.' };
}

let bookingsChannel = null;
let barbersChannel = null;
let anonymousSessionRequest = null;

export const useStore = create((set, get) => ({
  barbers: [],
  services: [],
  bookings: [],
  activeBarberId: null,
  activeBarber: null,
  authUser: null,
  isLoading: true,
  isSyncedWithSupabase: isSupabaseConfigured,
  error: null,

  // â”€â”€â”€ INITIALIZATION (AUTH & DATABASE REALTIME) â”€â”€â”€
  initApp: async () => {
    set({ isLoading: true });
    
    try {
      // 1. Cek sesi Auth Supabase
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          let user = sessionData?.session?.user || null;
          if (user?.is_anonymous) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
              await supabase.auth.signOut().catch(() => {});
              user = null;
            } else {
              user = userData.user;
            }
          }
          set({ authUser: user });

          // Listen perubahan auth (login / logout di tab lain)
          supabase.auth.onAuthStateChange(async (_event, session) => {
            const u = session?.user || null;
            set({ authUser: u });
            if (u) {
              get().matchActiveBarber(u);
              get().fetchBookingsFromSupabase();
              get().subscribeToBookings();
            } else {
              set({ activeBarber: null, activeBarberId: null });
              set({ bookings: [] });
              if (bookingsChannel) {
                supabase.removeChannel(bookingsChannel);
                bookingsChannel = null;
              }
            }
          });
        } catch (err) {
          console.warn('Auth session check error:', err);
        }
      }

      // 2. Fetch Services & Barbers dari Supabase (aman dengan fallback)
      await get().fetchServicesFromSupabase().catch(() => []);
      await get().fetchBarbersFromSupabase().catch(() => []);

      // 3. Fetch Bookings dari Supabase & subscribe Realtime
      await get().fetchBookingsFromSupabase().catch(() => []);
      try {
        get().subscribeToBookings();
      } catch (subErr) {
        console.warn('Realtime subscribe warning:', subErr);
      }
    } catch (globalErr) {
      console.warn('initApp caught error:', globalErr);
    } finally {
      set({ isLoading: false });
    }
  },

  // Match barbershop profile dengan user yang sedang login (termasuk auto-provision untuk Google OAuth)
  matchActiveBarber: async (user) => {
    if (!user) return null;
    if (user.is_anonymous) {
      set({ activeBarber: null, activeBarberId: null });
      return null;
    }

    if (isSupabaseConfigured) {
      try {
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (String(userProfile?.role || '').toUpperCase() === 'CUSTOMER') {
          set({ activeBarber: null, activeBarberId: null });
          return null;
        }
      } catch (err) {
        console.warn('Unable to verify account role before barber matching:', err);
        return null;
      }
    }

    const { barbers, services } = get();

    // 1. Cari di local state barbers berdasarkan user_id atau email
    const match = barbers.find(
      b => b.user_id === user.id || b.email?.toLowerCase() === user.email?.toLowerCase()
    );
    if (match) {
      set({ activeBarber: match, activeBarberId: match.id });
      return match;
    }

    // 2. Jika belum ada di local state, query langsung ke Supabase
    if (isSupabaseConfigured) {
      try {
        const { data: dbBarber } = await supabase
          .from('barbers')
          .select('*')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle();

        if (dbBarber) {
          const mapped = mapSupabaseBarber(dbBarber, services);
          set({
            barbers: [...barbers.filter(b => b.id !== mapped.id), mapped],
            activeBarber: mapped,
            activeBarberId: mapped.id
          });
          return mapped;
        }

        // 3. Jika belum ada di tabel barbers, buat otomatis untuk pengguna Google OAuth
        const meta = user.user_metadata || {};
        const name = meta.name || meta.full_name || user.email?.split('@')[0] || 'Barber E-Cukur';
        const rawSlug = meta.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '') || `barber-${user.id.slice(0, 6)}`;
        const cleanSlug = rawSlug.slice(0, 30);
        const photo = meta.avatar_url || meta.picture || '';
        const phone = meta.phone || '';

        const { data: newRow, error } = await supabase
          .from('barbers')
          .insert({
            user_id: user.id,
            name: name,
            email: user.email,
            phone: phone,
            whatsapp: phone,
            slug: cleanSlug,
            specialty: '',
            bio: '',
            profile_photo: photo,
            availability_status: 'AVAILABLE',
            account_status: 'ACTIVE'
          })
          .select()
          .maybeSingle();

        if (!error && newRow) {
          const createdBarber = mapSupabaseBarber(newRow, []);
          set({
            barbers: [...barbers, createdBarber],
            activeBarber: createdBarber,
            activeBarberId: createdBarber.id
          });
          return createdBarber;
        }
      } catch (err) {
        console.warn('Auto provision barber error:', err);
      }
    }

    // 4. Fallback in-memory jika offline / Supabase trigger belum dijalankan
    const meta = user.user_metadata || {};
    const name = meta.name || meta.full_name || user.email?.split('@')[0] || 'Barber E-Cukur';
    const cleanSlug = (meta.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'barber').slice(0, 30);
    const photo = meta.avatar_url || meta.picture || '';

    const fallback = {
      id: user.id,
      user_id: user.id,
      slug: cleanSlug,
      name: name,
      handle: `@${cleanSlug}`,
      email: user.email,
      phone: '',
      whatsapp: '',
      whatsappMessage: `Halo ${name}, saya mau booking jadwal cukur lewat link bio kamu`,
      specialty: '',
      bio: '',
      photo: photo,
      status: 'AVAILABLE',
      schedule: '',
      workingHours: '',
      openDays: '',
      theme: 'forest',
      buttonStyle: 'rounded',
      address: '',
      mapsUrl: '',
      instagram: '',
      tiktok: '',
      bannerImage: '',
      locationCity: '',
      services: [],
      lookbook: [],
      customLinks: [],
      profileType: 'barber',
      features: {
        booking: true,
        services: true,
        lookbook: true,
        team: false,
        location: true,
        tipping: true,
      },
      teamMembers: [],
      stats: { views: 0, whatsappClicks: 0, bookings: 0, topService: '-' }
    };

    set({
      barbers: [...barbers.filter(b => b.id !== fallback.id), fallback],
      activeBarber: fallback,
      activeBarberId: fallback.id
    });
    return fallback;
  },

  setActiveBarberId: (id) => {
    const b = get().barbers.find(item => item.id === id || item.slug === id);
    set({ activeBarberId: id, activeBarber: b || null });
  },

  // Alias methods for compatibility across components
  fetchServices: async () => {
    return await get().fetchServicesFromSupabase();
  },
  fetchBarbers: async () => {
    return await get().fetchBarbersFromSupabase();
  },

  // Update status barber (admin) â€“ mengirim PATCH ke backend dan memperbarui state lokal
  updateBarberStatus: async (barberId, newStatus) => {
    if (!isSupabaseConfigured) return { success: false, error: 'Supabase tidak terkonfigurasi' };
    const allowed = ['AVAILABLE', 'BREAK', 'LEAVE', 'OFF'];
    if (!allowed.includes(newStatus)) {
      return { success: false, error: 'Nilai status tidak valid' };
    }
    try {
      const { data, error } = await supabase
        .from('barbers')
        .update({ availability_status: newStatus })
        .eq('id', barberId)
        .single();
      if (error) throw error;
      // Perbarui state lokal
      set(state => {
        const updatedBarbers = state.barbers.map(b => b.id === barberId ? { ...b, status: newStatus } : b);
        const active = state.activeBarberId === barberId ? { ...state.activeBarber, status: newStatus } : state.activeBarber;
        return { barbers: updatedBarbers, activeBarber: active };
      });
      return { success: true, data };
    } catch (err) {
      console.warn('updateBarberStatus error:', err);
      return { success: false, error: err.message };
    }
  },
  fetchBookings: async () => {
    return await get().fetchBookingsFromSupabase();
  },

  // â”€â”€â”€ FETCH SERVICES DARI SUPABASE â”€â”€â”€
  fetchServicesFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (!error && Array.isArray(data)) {
        set({ services: data });
        return data;
      }
    } catch (err) {
      console.warn('Fetch services error:', err);
    }
    return [];
  },

  // â”€â”€â”€ FETCH BARBERS DARI SUPABASE â”€â”€â”€
  fetchBarbersFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: barberRows, error } = await supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(barberRows) && barberRows.length > 0) {
        const systemConfigRow = barberRows.find(row => row.slug === 'ecukur_system_config');
        if (systemConfigRow?.features?.platformSettings && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem('ecukur_platform_settings', JSON.stringify(systemConfigRow.features.platformSettings));
          } catch {}
        }

        const services = get().services;
        const currentBarbers = get().barbers || [];
        const mappedBarbers = barberRows
          .filter(row => row.slug !== 'ecukur_system_config')
          .map(row => {
          const mapped = mapSupabaseBarber(row, services);
          const existing = currentBarbers.find(b => b.id === row.id || b.slug === row.slug);
          // Pertahankan plan lokal jika row Supabase belum menyimpan karena RLS policy
          if (existing && existing.plan && (!row.plan && !row.features?.plan)) {
            mapped.plan = existing.plan;
          }
          return mapped;
        });
        
        set({ barbers: mappedBarbers });

        // Set active barber hanya jika user sedang login
        const authUser = get().authUser;
        if (authUser) {
          get().matchActiveBarber(authUser);
        }
      }
    } catch (err) {
      console.warn('Fetch barbers error:', err);
    }
  },

  // â”€â”€â”€ FETCH BOOKINGS REALTIME DARI SUPABASE â”€â”€â”€
  fetchBookingsFromSupabase: async () => {
    if (!isSupabaseConfigured) return;
    if (!get().authUser) {
      set({ bookings: [] });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Fetch bookings error:', error);
        return;
      }

      if (Array.isArray(data)) {
        const currentBarbers = get().barbers || [];
        const mapped = data.map((row) => {
          const matchedBarber = currentBarbers.find(b => {
            if (row.barber_id && (b.id === row.barber_id || b.slug === row.barber_id)) return true;
            if (row.barber_name) {
              const rName = String(row.barber_name).trim().toLowerCase();
              return (b.name && b.name.trim().toLowerCase() === rName) || (b.slug && b.slug.trim().toLowerCase() === rName);
            }
            return false;
          });

            const rawPrice = Number(row.total_price) || 0;
            // Bersihkan kode unik jika booking QRIS tersimpan dengan 3 digit unik (misal 50.758 -> 50.000)
            const cleanPrice = (rawPrice > 1000 && (rawPrice % 1000) >= 100 && row.payment_method === 'QRIS')
              ? rawPrice - (rawPrice % 1000)
              : rawPrice;

            return {
              id: row.id,
              customerName: row.customer_name || 'Pelanggan',
              customerPhone: row.customer_phone || '-',
              barberId: row.barber_id || matchedBarber?.id || '',
              barberName: row.barber_name || matchedBarber?.name || 'Semua Capster',
              capsterId: row.capster_id || null,
              capsterName: row.capster_name || null,
              serviceName: row.service_name || 'Layanan Cukur',
              date: row.booking_date || 'Hari Ini',
              time: row.start_time ? row.start_time.substring(0, 5) : '10:00',
              status: dbToUiStatus(row.booking_status),
              paymentMethod: row.payment_method === 'QRIS' ? 'QRIS' : (row.payment_method || 'Tunai'),
              paymentStatus: row.payment_status || 'UNPAID',
              price: cleanPrice,
              rawPrice,
              note: '',
              createdAt: row.created_at
            };
        });

        set({ bookings: mapped });
      }
    } catch (err) {
      console.warn('Fetch bookings error:', err);
    }
  },
  // Realtime subscription ke tabel barbers (status updates)
  subscribeToBarbers: () => {
    if (!isSupabaseConfigured) return () => {};
    try {
      if (barbersChannel) {
        supabase.removeChannel(barbersChannel);
        barbersChannel = null;
      }
      barbersChannel = supabase
        .channel(`realtime:barbers:${Date.now()}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'barbers' }, () => {
          get().fetchBarbersFromSupabase();
        })
        .subscribe();
      return () => {
        if (barbersChannel) {
          supabase.removeChannel(barbersChannel);
          barbersChannel = null;
        }
      };
    } catch (err) {
      console.warn('Supabase barbers subscribe error:', err);
      return () => {};
    }
  },

  // Realtime subscription ke tabel bookings (booking updates)
  subscribeToBookings: () => {
    try {
      if (bookingsChannel) {
        try {
          supabase.removeChannel(bookingsChannel);
        } catch {}
        bookingsChannel = null;
      }

      bookingsChannel = supabase
        .channel(`realtime:bookings:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bookings' },
          () => {
            get().fetchBookingsFromSupabase();
          }
        )
        .subscribe();

      return () => {
        if (bookingsChannel) {
          supabase.removeChannel(bookingsChannel);
          bookingsChannel = null;
        }
      };
    } catch (err) {
      console.warn('Supabase subscribe error:', err);
      return () => {};
    }
  },

  // AUTHENTICATION

  // â”€â”€â”€ AUTHENTICATION (LOGIN & DAFTAR SUPABASE) â”€â”€â”€
  signUpBarber: async ({ name, email, password, phone, slug }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      const barberName = name || slug || email.split('@')[0];
      const cleanSlug = (slug || barberName.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''));
      
      // 1. Sign up di Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: barberName,
            phone,
            slug: cleanSlug,
            role: 'barber'
          }
        }
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Pendaftaran tidak mengembalikan data user.');

      // 2. Insert ke tabel barbers Supabase langsung jika session langsung terbentuk
      if (data.session) {
        try {
          const { data: newBarberRow, error: barberInsertError } = await supabase
            .from('barbers')
            .insert({
              user_id: user.id,
              name: barberName,
              email,
              phone,
              whatsapp: phone,
              slug: cleanSlug,
              specialty: '',
              bio: '',
              availability_status: 'AVAILABLE',
              account_status: 'ACTIVE'
            })
            .select()
            .single();

          if (!barberInsertError && newBarberRow) {
            const mapped = mapSupabaseBarber(newBarberRow, get().services);
            set((state) => ({
              barbers: [mapped, ...state.barbers],
              activeBarber: mapped,
              activeBarberId: mapped.id
            }));
          }
        } catch (insertErr) {
          console.warn('Notice inserting barber row:', insertErr.message);
        }

        set({ authUser: user });
      }

      return { 
        success: true, 
        user, 
        hasSession: Boolean(data.session) 
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  signUpCustomer: async ({ name, email, password }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            role: 'customer'
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Pendaftaran tidak mengembalikan data user.');

      if (data.session) {
        set({ authUser: data.user });
      }

      return { success: true, user: data.user, hasSession: Boolean(data.session) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  verifyOtpCustomer: async ({ email, token }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup'
      });

      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email'
        });
        if (retry.error) throw retry.error;
        data = retry.data;
      }

      if (!data?.user) throw new Error('Verifikasi tidak mengembalikan data user.');
      set({ authUser: data.user });
      return { success: true, session: data.session, user: data.user };
    } catch (err) {
      return {
        success: false,
        error: err.message === 'Token has expired or is invalid'
          ? 'Kode OTP salah atau sudah kedaluwarsa. Silakan periksa kembali atau kirim ulang kode baru.'
          : err.message || 'Gagal memverifikasi kode OTP.'
      };
    }
  },

  verifyOtpBarber: async ({ email, token, slug, phone }) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup'
      });

      // Jika verify dengan 'signup' gagal, coba dengan 'email'
      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email'
        });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }

      if (error) throw error;

      const user = data?.user;
      if (user) {
        set({ authUser: user });

        // Pastikan record di barbers ada
        try {
          const { data: existingBarber } = await supabase
            .from('barbers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!existingBarber) {
            const barberName = user.user_metadata?.name || slug || email.split('@')[0];
            const cleanSlug = slug || user.user_metadata?.slug || barberName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
            const barberPhone = phone || user.user_metadata?.phone || '';

            const { data: newRow } = await supabase
              .from('barbers')
              .insert({
                user_id: user.id,
                name: barberName,
                email: user.email,
                phone: barberPhone,
                whatsapp: barberPhone,
                slug: cleanSlug,
                availability_status: 'AVAILABLE',
                account_status: 'ACTIVE'
              })
              .select()
              .single();

            if (newRow) {
              const mapped = mapSupabaseBarber(newRow, get().services);
              set((state) => ({
                barbers: [mapped, ...state.barbers],
                activeBarber: mapped,
                activeBarberId: mapped.id
              }));
            }
          } else {
            const mapped = mapSupabaseBarber(existingBarber, get().services);
            set({
              activeBarber: mapped,
              activeBarberId: mapped.id
            });
          }
        } catch (dbErr) {
          console.warn('Sync barber post-OTP error:', dbErr?.message);
        }

        await get().fetchBarbersFromSupabase();
      }

      return { success: true, session: data?.session, user };
    } catch (err) {
      return { 
        success: false, 
        error: err.message === 'Token has expired or is invalid' 
          ? 'Kode OTP salah atau sudah kedaluwarsa. Silakan periksa kembali atau kirim ulang kode baru.'
          : err.message || 'Gagal memverifikasi kode OTP.' 
      };
    }
  },

  resendOtp: async (email) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      });
      if (error) {
        const retry = await supabase.auth.resend({
          type: 'email',
          email: email.trim()
        });
        if (retry.error) throw retry.error;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Gagal mengirim ulang kode OTP.' };
    }
  },

  signInBarber: async (email, password) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;
      set({ authUser: user });

      // Refresh data barbers & cocokan akun
      await get().fetchBarbersFromSupabase();
      get().matchActiveBarber(user);

      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  signInCustomer: async (email, password) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ authUser: data.user });
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  ensureAnonymousCustomerSession: async () => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase belum dikonfigurasi untuk sesi konsultasi.' };
    }

    if (!anonymousSessionRequest) {
      anonymousSessionRequest = (async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData.session?.user) {
          if (!sessionData.session.user.is_anonymous) {
            return sessionData.session.user;
          }
          // Verifikasi apakah akun tamu masih aktif di database (belum dihapus oleh cleanup 24 jam)
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (!userError && userData?.user) {
            return userData.user;
          }
          // Jika akun tamu sudah dihapus dari server, reset sesi lokal
          await supabase.auth.signOut().catch(() => {});
        }

        const { data, error } = await supabase.auth.signInAnonymously({
          options: { data: { role: 'customer', name: 'Pelanggan' } }
        });
        if (error) {
          if (/anonymous sign-ins? (are|is) disabled/i.test(error.message || '')) {
            throw new Error('Sesi tamu belum diaktifkan di Supabase. Minta pemilik project mengaktifkan Anonymous Sign-Ins di Authentication > Sign In / Providers.');
          }
          throw error;
        }
        if (!data.user) throw new Error('Supabase tidak mengembalikan sesi pelanggan tamu.');
        return data.user;
      })();
    }

    try {
      const user = await anonymousSessionRequest;
      set({ authUser: user });
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message || 'Gagal memulai sesi konsultasi tamu.' };
    } finally {
      anonymousSessionRequest = null;
    }
  },

  signOutUser: async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn(e);
      }
    }
    set({ authUser: null, activeBarber: null, activeBarberId: null });
  },

  // â”€â”€â”€ SYNC KE SUPABASE & LOCALSTORAGE HELPER â”€â”€â”€
  syncBarberToSupabase: async (barberId) => {
    const { barbers, activeBarber } = get();
    const target = (activeBarber && (activeBarber.id === barberId || activeBarber.slug === barberId))
      ? activeBarber
      : barbers.find(b => b.id === barberId || b.slug === barberId);

    if (!target) return;

    // 1. Simpan salinan lokal ke localStorage agar tidak pernah hilang
    try {
      if (typeof localStorage !== 'undefined') {
        if (target.id) localStorage.setItem(`ecukur_barber_cache_${target.id}`, JSON.stringify(target));
        if (target.slug) localStorage.setItem(`ecukur_barber_cache_${target.slug}`, JSON.stringify(target));
      }
    } catch {}

    // 2. Kirim payload lengkap ke database Supabase
    const payload = {
      name: target.name,
      slug: target.slug,
      bio: target.bio,
      specialty: target.specialty,
      profile_photo: target.photo,
      availability_status: target.status,
      phone: target.phone,
      whatsapp: target.whatsapp,
      schedule: target.schedule,
      working_hours: target.workingHours,
      open_days: target.openDays,
      theme: target.theme,
      button_style: target.buttonStyle,
      address: target.address,
      maps_url: target.mapsUrl,
      instagram: target.instagram,
      tiktok: target.tiktok,
      profile_type: target.profileType,
      segment: target.segment,
      features: target.features,
      tipping_config: target.tippingConfig,
      tip_balance: target.tipBalance,
      withdrawals_history: target.withdrawalsHistory,
      tips_history: target.tipsHistory,
      payout_account: target.payoutAccount,
      lookbook: target.lookbook,
      custom_links: target.customLinks,
      team_members: target.teamMembers,
      services: target.services,
      plan: target?.plan || 'free'
    };

    await saveBarberPayloadToSupabase(target.id || barberId, payload);
  },

  // â”€â”€â”€ UPDATE PROFIL BARBER (KE SUPABASE & LOCALSTORAGE) â”€â”€â”€
  updateBarber: async (barberId, updates) => {
    // 1. Update state lokal seketika (optimistic)
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => 
        (b.id === barberId || b.slug === barberId) ? { ...b, ...updates } : b
      );
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, ...updates }
        : state.activeBarber;

      // Update cache
      try {
        const target = active || updatedBarbers.find(b => b.id === barberId || b.slug === barberId);
        if (target && typeof localStorage !== 'undefined') {
          if (target.id) localStorage.setItem(`ecukur_barber_cache_${target.id}`, JSON.stringify(target));
          if (target.slug) localStorage.setItem(`ecukur_barber_cache_${target.slug}`, JSON.stringify(target));
          if (target.slug && updates.bannerImage) localStorage.setItem(`ecukur_banner_${target.slug}`, updates.bannerImage);
          if (target.id && updates.bannerImage) localStorage.setItem(`ecukur_banner_${target.id}`, updates.bannerImage);
          if (updates.plan) {
            if (target.id) localStorage.setItem(`ecukur_plan_${target.id}`, updates.plan);
            if (target.slug) localStorage.setItem(`ecukur_plan_${target.slug}`, updates.plan);
            if (barberId) localStorage.setItem(`ecukur_plan_${barberId}`, updates.plan);
          }
          localStorage.setItem('ecukur_last_active_slug', target.slug || target.id);
          window.dispatchEvent(new Event('storage'));
        }
      } catch {}

      return { barbers: updatedBarbers, activeBarber: active };
    });

    // 2. Simpan ke database Supabase
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.specialty !== undefined) payload.specialty = updates.specialty;
    if (updates.photo !== undefined) payload.profile_photo = updates.photo;
    if (updates.status !== undefined) payload.availability_status = updates.status;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.schedule !== undefined) payload.schedule = updates.schedule;
    if (updates.workingHours !== undefined) payload.working_hours = updates.workingHours;
    if (updates.openDays !== undefined) payload.open_days = updates.openDays;
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.buttonStyle !== undefined) payload.button_style = updates.buttonStyle;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.mapsUrl !== undefined) payload.maps_url = updates.mapsUrl;
    if (updates.instagram !== undefined) payload.instagram = updates.instagram;
    if (updates.tiktok !== undefined) payload.tiktok = updates.tiktok;
    if (updates.profileType !== undefined) payload.profile_type = updates.profileType;
    if (updates.segment !== undefined) payload.segment = updates.segment;
    if (updates.features !== undefined) payload.features = updates.features;
    if (updates.tippingConfig !== undefined) payload.tipping_config = updates.tippingConfig;
    if (updates.tipBalance !== undefined) payload.tip_balance = updates.tipBalance;
    if (updates.payoutAccount !== undefined) payload.payout_account = updates.payoutAccount;
    if (updates.withdrawalsHistory !== undefined) payload.withdrawals_history = updates.withdrawalsHistory;
    if (updates.tipsHistory !== undefined) payload.tips_history = updates.tipsHistory;
    if (updates.teamMembers !== undefined) payload.team_members = updates.teamMembers;
    if (updates.customLinks !== undefined) payload.custom_links = updates.customLinks;
    if (updates.lookbook !== undefined) payload.lookbook = updates.lookbook;
    if (updates.services !== undefined) payload.services = updates.services;
    if (updates.bannerImage !== undefined) payload.banner_image = updates.bannerImage;
    if (updates.locationCity !== undefined) payload.location_city = updates.locationCity;
    if (updates.plan !== undefined) {
      payload.plan = updates.plan;
      payload.features = {
        ...(payload.features || updates.features || {}),
        plan: updates.plan,
        team: updates.plan === 'barber'
      };
    }
    if (updates.accountStatus !== undefined) payload.account_status = updates.accountStatus;
    if (updates.availabilityStatus !== undefined) payload.availability_status = updates.availabilityStatus;

    return await saveBarberPayloadToSupabase(barberId, payload);
  },

  // â”€â”€â”€ TAMBAH BOOKING REALTIME (DARI LINK BIO) â”€â”€â”€
  addBooking: async (booking) => {
    let finalId = `ECK-${Math.floor(100 + Math.random() * 900)}`;
    let ticketToken;
    try {
      ticketToken = createGuestTicketToken();
    } catch (err) {
      return { success: false, error: err.message };
    }

    // 1. Simpan ke database Supabase
    if (isSupabaseConfigured) {
      try {
        const barberId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(booking.barberId))
          ? booking.barberId
          : null;
        const rpcName = booking.capsterId
          ? 'create_guest_booking_with_capster'
          : 'create_guest_booking_with_ticket';
        const rpcParams = {
          p_customer_name: booking.customerName,
          p_customer_phone: booking.customerPhone || '080000000000',
          p_customer_email: get().authUser?.email || null,
          p_barber_id: barberId,
          p_barber_name: booking.barberName || null,
          p_service_id: booking.serviceId ? String(booking.serviceId) : null,
          p_service_name: booking.serviceName,
          p_booking_date: booking.dateIso || new Date().toISOString().split('T')[0],
          p_start_time: booking.time ? (booking.time.length === 5 ? `${booking.time}:00` : booking.time) : '10:00:00',
          p_payment_method: booking.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai',
          p_total_price: Number(booking.price) || 0,
          p_ticket_token: ticketToken
        };
        if (booking.capsterId) rpcParams.p_capster_id = String(booking.capsterId);
        let { data, error } = await supabase.rpc(rpcName, rpcParams);

        // Jika fungsi create_guest_booking_with_capster belum ada di DB Supabase (PGRST202),
        // otomatis fallback ke create_guest_booking_with_ticket agar booking tidak gagal!
        if (error && error.code === 'PGRST202' && rpcName === 'create_guest_booking_with_capster') {
          console.warn('Fungsi create_guest_booking_with_capster belum di-migrasi di DB, fallback ke create_guest_booking_with_ticket');
          const fallbackParams = { ...rpcParams };
          delete fallbackParams.p_capster_id;
          const fallbackRes = await supabase.rpc('create_guest_booking_with_ticket', fallbackParams);
          data = fallbackRes.data;
          error = fallbackRes.error;

          if (data && (booking.capsterId || booking.capsterName)) {
            supabase
              .from('bookings')
              .update({
                capster_id: booking.capsterId ? String(booking.capsterId) : null,
                capster_name: booking.capsterName || null
              })
              .eq('id', data)
              .then(() => {})
              .catch(() => {});
          }
        }

        if (error) return { success: false, error: error.message };
        if (!data) return { success: false, error: 'Database tidak mengembalikan ID booking.' };
        finalId = data;
      } catch (err) {
        console.error('Supabase booking insert failed:', err);
        return { success: false, error: err.message };
      }
    }

    const newBooking = {
      ...booking,
      id: finalId,
      ticketToken,
      status: 'Menunggu',
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      bookings: [newBooking, ...state.bookings]
    }));

    return newBooking;
  },

  // â”€â”€â”€ UPDATE STATUS BOOKING (KONFIRMASI / SELESAI / BATAL) â”€â”€â”€
  updateBookingStatus: async (id, status) => {
    if (isSupabaseConfigured) {
      try {
        const dbStatus = uiToDbStatus(status);
        const { error } = await supabase.rpc('update_booking_tracking_status', {
          p_booking_id: id,
          p_new_status: dbStatus,
          p_notes: null
        });
        if (error) {
          // Fallback update langsung ke tabel bookings jika RPC gagal / butuh auth khusus
          const { error: directErr } = await supabase
            .from('bookings')
            .update({
              booking_status: dbStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
          if (directErr) throw error;
        }
      } catch (err) {
        console.error('Supabase update status failed:', err);
        await get().fetchBookingsFromSupabase();
        return { success: false, error: err.message };
      }
    }

    set((state) => ({
      bookings: state.bookings.map((b) => (b.id === id ? { ...b, status } : b))
    }));
    return { success: true };
  },

  // â”€â”€â”€ UPLOAD FOTO PROFIL KE SUPABASE STORAGE (KOMPRESI PERSEGI 1:1) â”€â”€â”€
  uploadBarberPhoto: async (barberId, file) => {
    try {
      const result = await uploadBarberProfilePhoto(file, barberId);
      
      // Update store
      await get().updateBarber(barberId, { photo: result.url });

      return { success: true, url: result.url, source: result.source, stats: result.stats };
    } catch (err) {
      console.error('Upload photo failed:', err);
      return { success: false, error: err.message };
    }
  },

  // â”€â”€â”€ UPLOAD FOTO PORTOFOLIO KE SUPABASE STORAGE (KOMPRESI RASIO ASLI) â”€â”€â”€
  uploadBarberPortfolioPhoto: async (barberId, file, itemData = {}) => {
    try {
      const result = await uploadPortfolioPhoto(file, barberId);
      const newItem = {
        title: itemData.title || 'Model Potongan Cukur',
        img: result.url,
        tag: itemData.tag || 'Trending'
      };
      get().addBarberLookbook(barberId, newItem);
      return { success: true, item: newItem, url: result.url, source: result.source, stats: result.stats };
    } catch (err) {
      console.error('Upload portfolio photo failed:', err);
      return { success: false, error: err.message };
    }
  },

  // â”€â”€â”€ UPLOAD FOTO BANNER COVER KE SUPABASE STORAGE (KOMPRESI LANSKAP) â”€â”€â”€
  uploadBarberBanner: async (barberId, file) => {
    try {
      const result = await uploadBarberBannerPhoto(file, barberId);
      await get().updateBarber(barberId, { bannerImage: result.url });
      return { success: true, url: result.url, source: result.source, stats: result.stats };
    } catch (err) {
      console.error('Upload banner photo failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Layanan Barber (CRUD dengan sinkronisasi ke Supabase 'services' & profil barber)
  addBarberService: async (barberId, newService) => {
    let serviceId = `srv-${Date.now()}`;

    // 1. Simpan ke tabel services Supabase jika terhubung
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('services')
          .insert({
            name: newService.name,
            description: newService.desc || newService.description || '',
            price: Number(newService.price) || 0,
            duration_minutes: parseInt(newService.duration) || 45,
            is_active: newService.active !== false
          })
          .select()
          .single();

        if (!error && data?.id) {
          serviceId = data.id;
        }
      } catch (err) {
        console.warn('Supabase add service notice:', err.message);
      }
    }

    const serviceWithId = {
      ...newService,
      id: serviceId,
      active: newService.active !== false
    };

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const currentServices = b.services || [];
          return { ...b, services: [serviceWithId, ...currentServices] };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, services: [serviceWithId, ...(state.activeBarber.services || [])] }
        : state.activeBarber;

      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);
  },

  updateBarberService: async (barberId, serviceId, updates) => {
    if (isSupabaseConfigured && serviceId && !serviceId.startsWith('srv-')) {
      try {
        const payload = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.desc !== undefined || updates.description !== undefined) {
          payload.description = updates.desc || updates.description;
        }
        if (updates.price !== undefined) payload.price = Number(updates.price);
        if (updates.duration !== undefined) payload.duration_minutes = parseInt(updates.duration) || 45;
        if (updates.active !== undefined) payload.is_active = updates.active;

        if (Object.keys(payload).length > 0) {
          await supabase.from('services').update(payload).eq('id', serviceId);
        }
      } catch (err) {
        console.warn('Supabase update service notice:', err.message);
      }
    }

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const updatedServices = (b.services || []).map((s) =>
            s.id === serviceId ? { ...s, ...updates } : s
          );
          return { ...b, services: updatedServices };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            services: (state.activeBarber.services || []).map((s) =>
              s.id === serviceId ? { ...s, ...updates } : s
            )
          }
        : state.activeBarber;

      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);
  },

  deleteBarberService: async (barberId, serviceId) => {
    if (isSupabaseConfigured && serviceId && !serviceId.startsWith('srv-')) {
      try {
        await supabase.from('services').delete().eq('id', serviceId);
      } catch (err) {
        console.warn('Supabase delete service notice:', err.message);
      }
    }

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, services: (b.services || []).filter((s) => s.id !== serviceId) };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            services: (state.activeBarber.services || []).filter((s) => s.id !== serviceId)
          }
        : state.activeBarber;

      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);
  },

  toggleBarberService: async (barberId, serviceId) => {
    const barber = get().barbers.find(b => b.id === barberId || b.slug === barberId);
    const target = barber?.services?.find(s => s.id === serviceId);
    const nextActive = target ? !target.active : true;

    if (isSupabaseConfigured && serviceId && !serviceId.startsWith('srv-')) {
      try {
        await supabase.from('services').update({ is_active: nextActive }).eq('id', serviceId);
      } catch (err) {
        console.warn('Supabase toggle service notice:', err.message);
      }
    }

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const updatedServices = (b.services || []).map((s) =>
            s.id === serviceId ? { ...s, active: !s.active } : s
          );
          return { ...b, services: updatedServices };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            services: (state.activeBarber.services || []).map((s) =>
              s.id === serviceId ? { ...s, active: !s.active } : s
            )
          }
        : state.activeBarber;

      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);
  },

  // Lookbook CRUD
  addBarberLookbook: (barberId, item) => {
    set((state) => {
      const newItem = { likes: 0, ...item, id: item.id || Date.now() };
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, lookbook: [newItem, ...(b.lookbook || [])] };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, lookbook: [newItem, ...(state.activeBarber.lookbook || [])] }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  toggleLookbookLike: (barberId, postId, isLiked) => {
    let updatedLookbook = null;
    set((state) => {
      const updateList = (list) => {
        return (list || []).map((item) => {
          if (String(item.id) === String(postId)) {
            const currentLikes = Number(item.likes) || 0;
            const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
            return { ...item, likes: newLikes };
          }
          return item;
        });
      };

      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          updatedLookbook = updateList(b.lookbook);
          return { ...b, lookbook: updatedLookbook };
        }
        return b;
      });

      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, lookbook: updateList(state.activeBarber.lookbook) }
        : state.activeBarber;

      return { barbers: updatedBarbers, activeBarber: active };
    });

    if (updatedLookbook) {
      get().syncBarberToSupabase(barberId);
    }
  },

  deleteBarberLookbook: (barberId, itemId) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, lookbook: (b.lookbook || []).filter((l) => l.id !== itemId) };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, lookbook: (state.activeBarber.lookbook || []).filter((l) => l.id !== itemId) }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  // Custom Links CRUD
  addBarberCustomLink: (barberId, link) => {
    set((state) => {
      const newLinkItem = { ...link, id: `link-${Date.now()}`, active: true };
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, customLinks: [...(b.customLinks || []), newLinkItem] };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, customLinks: [...(state.activeBarber.customLinks || []), newLinkItem] }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  deleteBarberCustomLink: (barberId, linkId) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, customLinks: (b.customLinks || []).filter((l) => l.id !== linkId) };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, customLinks: (state.activeBarber.customLinks || []).filter((l) => l.id !== linkId) }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  toggleBarberCustomLink: (barberId, linkId) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const updatedLinks = (b.customLinks || []).map((l) =>
            l.id === linkId ? { ...l, active: !l.active } : l
          );
          return { ...b, customLinks: updatedLinks };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            customLinks: (state.activeBarber.customLinks || []).map((l) =>
              l.id === linkId ? { ...l, active: !l.active } : l
            )
          }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  // Team Members CRUD (Kelola Tim Capster untuk Barbershop)
  addBarberTeamMember: (barberId, member) => {
    set((state) => {
      const newMember = { ...member, id: `capster-${Date.now()}` };
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, teamMembers: [...(b.teamMembers || []), newMember] };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, teamMembers: [...(state.activeBarber.teamMembers || []), newMember] }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  deleteBarberTeamMember: (barberId, memberId) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          return { ...b, teamMembers: (b.teamMembers || []).filter((m) => m.id !== memberId) };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, teamMembers: (state.activeBarber.teamMembers || []).filter((m) => m.id !== memberId) }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  updateBarberTeamMember: (barberId, memberId, updates) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const updatedMembers = (b.teamMembers || []).map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          );
          return { ...b, teamMembers: updatedMembers };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            teamMembers: (state.activeBarber.teamMembers || []).map((m) =>
              m.id === memberId ? { ...m, ...updates } : m
            )
          }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  // Tipping Configuration & Ledger
  updateBarberTippingConfig: (barberId, updates) => {
    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const currentConfig = b.tippingConfig || {};
          return { ...b, tippingConfig: { ...currentConfig, ...updates } };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { ...state.activeBarber, tippingConfig: { ...(state.activeBarber.tippingConfig || {}), ...updates } }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });
    get().syncBarberToSupabase(barberId);
  },

  addBarberTip: (barberId, tipData) => {
    const tipAmount = Number(tipData.amount) || 10000;
    const newTip = {
      id: `tip-${Date.now()}`,
      date: new Date().toISOString(),
      customerName: tipData.customerName || 'Pelanggan Setia',
      amount: tipAmount,
      coffeeLabel: tipData.coffeeLabel || 'Kopi',
      message: tipData.message || 'Semoga makin berkah & sukses!',
      method: tipData.method || 'Payment Gateway QRIS'
    };

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const history = Array.isArray(b.tipsHistory) ? b.tipsHistory : [];
          const currentBal = typeof b.tipBalance === 'number' ? b.tipBalance : 0;
          return { ...b, tipsHistory: [newTip, ...history], tipBalance: currentBal + tipAmount };
        }
        return b;
      });
      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? { 
            ...state.activeBarber, 
            tipsHistory: [newTip, ...(state.activeBarber.tipsHistory || [])],
            tipBalance: (typeof state.activeBarber.tipBalance === 'number' ? state.activeBarber.tipBalance : 0) + tipAmount
          }
        : state.activeBarber;
      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);
  },

  // Withdrawal / Pencairan Saldo Tip (Minimal Rp 15.000)
  requestBarberWithdrawal: (barberId, withdrawalData) => {
    let result = { success: false, message: '' };
    const amount = Number(withdrawalData.amount);
    if (isNaN(amount) || amount < 15000) {
      return { success: false, message: 'Minimal penarikan saldo adalah Rp 15.000' };
    }

    const { barbers, activeBarber } = get();
    const targetBarber = (activeBarber && (activeBarber.id === barberId || activeBarber.slug === barberId))
      ? activeBarber
      : barbers.find((b) => b.id === barberId || b.slug === barberId);

    const currentBalance = typeof withdrawalData.maxAvailable === 'number'
      ? withdrawalData.maxAvailable
      : (typeof targetBarber?.tipBalance === 'number' ? targetBarber.tipBalance : 0);

    if (amount > currentBalance) {
      return { success: false, message: `Saldo tidak mencukupi (Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')})` };
    }

    const newWithdrawal = {
      id: `wd-${Date.now()}`,
      date: new Date().toISOString(),
      amount: amount,
      bankName: withdrawalData.bankName || 'BCA',
      accountNumber: withdrawalData.accountNumber,
      accountHolder: withdrawalData.accountHolder,
      status: 'Menunggu Transfer',
      referenceId: `TRX-WD-${Date.now().toString().slice(-6)}`
    };

    set((state) => {
      const updatedBarbers = state.barbers.map((b) => {
        if (b.id === barberId || b.slug === barberId) {
          const wds = Array.isArray(b.withdrawalsHistory) ? b.withdrawalsHistory : [];
          return {
            ...b,
            tipBalance: currentBalance - amount,
            withdrawalsHistory: [newWithdrawal, ...wds],
            payoutAccount: {
              bankName: withdrawalData.bankName,
              accountNumber: withdrawalData.accountNumber,
              accountHolder: withdrawalData.accountHolder
            }
          };
        }
        return b;
      });

      const active = state.activeBarber && (state.activeBarber.id === barberId || state.activeBarber.slug === barberId)
        ? {
            ...state.activeBarber,
            tipBalance: currentBalance - amount,
            withdrawalsHistory: [newWithdrawal, ...(state.activeBarber.withdrawalsHistory || [])],
            payoutAccount: {
              bankName: withdrawalData.bankName,
              accountNumber: withdrawalData.accountNumber,
              accountHolder: withdrawalData.accountHolder
            }
          }
        : state.activeBarber;

      result = { 
        success: true, 
        message: `Pengajuan penarikan Rp ${amount.toLocaleString('id-ID')} berhasil diajukan dan sedang menunggu verifikasi/transfer oleh admin.` 
      };
      return { barbers: updatedBarbers, activeBarber: active };
    });

    get().syncBarberToSupabase(barberId);

    // Kirim notifikasi instan ke Telegram Group via Serverless API (Aman tanpa hardcode token)
    try {
      fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WITHDRAWAL',
          barberName: targetBarber?.name || 'Capster E-CUKUR',
          amount,
          bankName: withdrawalData.bankName || 'BCA',
          accountNumber: withdrawalData.accountNumber,
          accountHolder: withdrawalData.accountHolder,
          referenceId: newWithdrawal.referenceId
        })
      }).catch(() => {});
    } catch {}

    return result;
  }
}));
