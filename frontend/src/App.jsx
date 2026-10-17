import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import CustomerBarbers from './pages/customer/Barbers';
import CustomerBookings from './pages/customer/Bookings';
import BookingFlow from './pages/customer/BookingFlow';
import StaffDashboard from './pages/staff/Dashboard';
import BarberDashboard from './pages/barber/Dashboard';

import InternalLogin from './pages/InternalLogin';
import BarberBioLink from './pages/customer/BarberBioLink';
import { useStore } from './store';

export default function App() {
  const initApp = useStore((state) => state.initApp);

  useEffect(() => {
    initApp();
  }, [initApp]);

  return (
    <Router>
      <Routes>
        {/* Public Core Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login defaultTab="register" />} />
        <Route path="/daftar" element={<Login defaultTab="register" />} />
        <Route path="/internal" element={<InternalLogin />} />

        {/* Customer Routes */}
        <Route path="/customer/barbers" element={<CustomerBarbers />} />
        <Route path="/customer/barbers/:id" element={<BarberBioLink />} />
        <Route path="/booking" element={<BookingFlow />} />
        <Route path="/customer/bookings" element={<CustomerBookings />} />
        
        {/* Staff Routes */}
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        
        {/* Barber Creator Studio Dashboard */}
        <Route path="/barber/dashboard" element={<BarberDashboard />} />

        {/* Lynk.id Style Micro-site Personal Link (e.g. /b/reza or /reza) */}
        <Route path="/b/:id" element={<BarberBioLink />} />
        <Route path="/:id" element={<BarberBioLink />} />
      </Routes>
    </Router>
  );
}
