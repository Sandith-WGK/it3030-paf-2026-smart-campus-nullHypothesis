import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { isAdmin } from './utils/auth';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';
import VerifyTwoFactor from './pages/VerifyTwoFactor';

// Booking pages
import MyBookings from './pages/bookings/MyBookings';
import NewBooking from './pages/bookings/NewBooking';
import EditBooking from './pages/bookings/EditBooking';
import BookingDetail from './pages/bookings/BookingDetail';
import AdminBookings from './pages/admin/AdminBookings';

// Wrapper for any authenticated route
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// A wrapper for admin-only routes
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<VerifyTwoFactor />} />
      
      {/* Protected routes (USER) */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* Booking routes (USER + ADMIN) */}
      <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
      <Route path="/bookings/new" element={<PrivateRoute><NewBooking /></PrivateRoute>} />
      <Route path="/bookings/:id" element={<PrivateRoute><BookingDetail /></PrivateRoute>} />
      <Route path="/bookings/:id/edit" element={<PrivateRoute><EditBooking /></PrivateRoute>} />

      {/* Admin routes */}
      <Route path="/admin/users" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;