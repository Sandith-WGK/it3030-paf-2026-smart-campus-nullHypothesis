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

// Booking pages
import MyBookings from './pages/bookings/MyBookings';
import NewBooking from './pages/bookings/NewBooking';
import EditBooking from './pages/bookings/EditBooking';
import BookingDetail from './pages/bookings/BookingDetail';
import AdminBookings from './pages/admin/AdminBookings';

// Resource pages 
import ResourceList from './pages/resources/ResourceList';
import ResourceDetail from './pages/resources/ResourceDetail';
import ResourceForm from './pages/resources/ResourceForm';
import AdminResources from './pages/resources/AdminResources';

// Wrapper for any authenticated route
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Wrapper for admin-only routes
const AdminRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
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

      {/* Protected routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* Booking routes (USER + ADMIN) */}
      <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
      <Route path="/bookings/new" element={<PrivateRoute><NewBooking /></PrivateRoute>} />
      <Route path="/bookings/:id" element={<PrivateRoute><BookingDetail /></PrivateRoute>} />
      <Route path="/bookings/:id/edit" element={<PrivateRoute><EditBooking /></PrivateRoute>} />

      {/* Resource routes (USER + ADMIN) */}
      <Route path="/resources" element={<PrivateRoute><ResourceList /></PrivateRoute>} />
      <Route path="/resources/:id" element={<PrivateRoute><ResourceDetail /></PrivateRoute>} />

      {/* Admin routes */}
      <Route path="/admin/users" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
      <Route path="/admin/resources" element={<AdminRoute><AdminResources /></AdminRoute>} />
      <Route path="/admin/resources/new" element={<AdminRoute><ResourceForm /></AdminRoute>} />
      <Route path="/admin/resources/:id/edit" element={<AdminRoute><ResourceForm /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
