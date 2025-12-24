import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import BowlingBookingPage from '@/pages/BowlingBookingPage';
import RestaurantBookingPage from '@/pages/RestaurantBookingPage';
import EventHallBookingPage from '@/pages/EventHallBookingPage';
import AdminDashboard from '@/pages/AdminDashboard';
import PaymentSuccessPage from '@/pages/PaymentSuccessPage';
import PaymentCancelPage from '@/pages/PaymentCancelPage';
import CancelBookingPage from '@/pages/CancelBookingPage';

function App() {
  return (
    <AuthProvider>
      <Helmet>
        <title>Goldgrube Bowling Center</title>
        <meta name="description" content="Reserve bowling lanes, restaurant tables, and event halls at Goldgrube Bowling Center" />
      </Helmet>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bowling" element={<BowlingBookingPage />} />
          <Route path="/restaurant" element={<RestaurantBookingPage />} />
          <Route path="/events" element={<EventHallBookingPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancel" element={<PaymentCancelPage />} />
          <Route path="/cancel-booking" element={<CancelBookingPage />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;