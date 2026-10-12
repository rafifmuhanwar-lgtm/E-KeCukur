import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import CustomerBarbers from './pages/customer/Barbers';
import BarberDetail from './pages/customer/BarberDetail';
import CustomerBookings from './pages/customer/Bookings';
import BookingFlow from './pages/customer/BookingFlow';
import StaffDashboard from './pages/staff/Dashboard';
import BarberDashboard from './pages/barber/Dashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Customer Routes */}
        <Route path="/customer/barbers" element={<CustomerBarbers />} />
        <Route path="/customer/barbers/:id" element={<BarberDetail />} />
        <Route path="/booking" element={<BookingFlow />} />
        <Route path="/customer/bookings" element={<CustomerBookings />} />
        
        {/* Staff Routes */}
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        
        {/* Barber Routes */}
        <Route path="/barber/dashboard" element={<BarberDashboard />} />
      </Routes>
    </Router>
  );
}
