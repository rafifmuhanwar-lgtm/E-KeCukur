import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabase.js';
import qrisRouter from './routes/qrisPayment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ━━━ QRIS Payment Gateway Routes ━━━
app.use('/api/payment/qris', qrisRouter);

// ━━━ 1. Health Check Route ━━━
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'E-CUKUR Barbershop API is active' 
  });
});

// ━━━ 2. Services Endpoints ━━━
app.get('/api/services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━ 3. Barbers Endpoints ━━━
app.get('/api/barbers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ━━━ 4. Bookings Endpoints ━━━
app.get('/api/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        barber:barbers(name, specialty),
        service:services(name, duration_minutes),
        customer:users(name, phone, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      barberId,
      serviceId,
      bookingDate,
      startTime,
      paymentMethod,
      totalPrice
    } = req.body;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        customer_name: customerName || 'Pelanggan',
        customer_phone: customerPhone || '-',
        barber_id: barberId || null,
        service_id: serviceId || null,
        booking_date: bookingDate || new Date().toISOString().split('T')[0],
        start_time: startTime || '10:00:00',
        end_time: '11:00:00',
        booking_status: 'CONFIRMED',
        payment_method: paymentMethod || 'CASH',
        payment_status: paymentMethod === 'QRIS' ? 'PAID' : 'UNPAID',
        total_price: totalPrice || 40000
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`💈 E-CUKUR API Server running on port ${PORT}`);
});
