import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import CustomerTicket from './pages/customer/Ticket';
import BookingFlow from './pages/customer/BookingFlow';
import BarberDashboard from './pages/barber/Dashboard';
import AdminMasterDashboard from './pages/admin/Dashboard';

import Messages from './pages/Messages';
import BarberStatus from './pages/admin/BarberStatus';
import DomainMigrationNotice from './components/DomainMigrationNotice';
import ErrorBoundary from './components/ErrorBoundary';
import BarberBioLink from './pages/customer/BarberBioLink';
import GlobalBroadcastModal from './components/GlobalBroadcastModal';
import FloatingHelpdesk from './components/FloatingHelpdesk';
import { useStore } from './store';

/* ---------- Overlay that covers the whole screen ---------- */
const LoadingOverlay = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#fff',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {/* Optional spinner component */}
    <div className="spinner" />
  </div>
);

export default function App() {
  // State to indicate when initApp has finished
  const [isAppReady, setIsAppReady] = useState(false);

  const initApp = useStore((state) => state.initApp);

  // Run initApp and mark ready when it resolves (without blocking UI)
  useEffect(() => {
    void initApp().finally(() => setIsAppReady(true));
  }, [initApp]);

  // While the app is initializing, show the overlay to hide any loading text
  if (!isAppReady) {
    return <LoadingOverlay />;
  }

  // Redirect old Vercel domains without affecting preview deployments.
  const isVercelDomain =
    typeof window !== 'undefined' &&
    ['ecukur.vercel.app', 'e-cukur.vercel.app'].includes(window.location.hostname);

  if (isVercelDomain) {
    return <DomainMigrationNotice />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <GlobalBroadcastModal />
        <FloatingHelpdesk />
        <Routes>
          {/* Public Core Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login defaultTab="register" />} />
          <Route path="/daftar" element={<Login defaultTab="register" />} />
          <Route path="/internal" element={<Navigate to="/login" replace />} />

          {/* Customer Routes */}
          <Route path="/customer/barbers" element={<Navigate to="/" replace />} />
          <Route path="/customer/barbers/:id" element={<BarberBioLink />} />
          <Route path="/booking" element={<BookingFlow />} />
          <Route path="/customer/bookings" element={<Navigate to="/" replace />} />
          <Route path="/tiket/:id" element={<CustomerTicket />} />
          <Route path="/ticket/:id" element={<CustomerTicket />} />
          <Route path="/messages" element={<Messages />} />

          {/* Legacy staff route redirects to Barber Studio Dashboard */}
          <Route path="/staff/dashboard" element={<Navigate to="/barber/dashboard" replace />} />

          {/* Master Admin / Super Admin Portal */}
          <Route path="/admin" element={<AdminMasterDashboard />} />
          <Route path="/admin/dashboard" element={<AdminMasterDashboard />} />
          <Route path="/admin/barbers" element={<BarberStatus />} />
          <Route path="/master" element={<Navigate to="/admin" replace />} />

          {/* Barber Creator Studio Dashboard */}
          <Route path="/barber/dashboard" element={<BarberDashboard />} />
          <Route path="/barber/messages" element={<Messages barberMode />} />

          {/* Lynk.id Style Micro-site Personal Link (e.g. /b/reza or /reza) */}
          <Route path="/b/:id" element={<BarberBioLink />} />
          <Route path="/:id" element={<BarberBioLink />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
