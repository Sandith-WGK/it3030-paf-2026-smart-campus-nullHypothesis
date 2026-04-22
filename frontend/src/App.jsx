import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

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
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

// Booking pages
import MyBookings from './pages/bookings/MyBookings';
import NewBooking from './pages/bookings/NewBooking';
import EditBooking from './pages/bookings/EditBooking';
import BookingDetail from './pages/bookings/BookingDetail';
import VerifyBooking from './pages/bookings/VerifyBooking';
import AdminBookings from './pages/admin/AdminBookings';

// Resource pages 
import ResourceList from './pages/resources/ResourceList';
import ResourceDetail from './pages/resources/ResourceDetail';
import ResourceForm from './pages/resources/ResourceForm';
import AdminResources from './pages/resources/AdminResources';

// Ticket pages
import MyTicketsPage from './pages/tickets/MyTicketsPage';
import CreateTicketForm from './pages/tickets/CreateTicketForm';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import TechnicianTasksPage from './pages/tickets/TechnicianTasksPage';


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

// Wrapper for technician-only routes
const TechnicianRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  // 1. Wait if the initial loading is true
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. IMPORTANT: If we are authenticated but the 'user' object hasn't 
  // been decoded yet, stay in the loading state. 
  // This prevents the "bounce" to the dashboard.
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  // 3. Now that we are sure 'user' exists, check the role
  const isTech = user?.role === 'TECHNICIAN';
  const isAdm = user?.role === 'ADMIN';

  if (!isTech && !isAdm) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<VerifyTwoFactor />} />
      <Route path="/verify-booking/:id" element={<VerifyBooking />} />
      
      {/* Protected routes (USER) */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

      {/* Booking routes (USER + ADMIN) */}
      <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
      <Route path="/bookings/new" element={<PrivateRoute><NewBooking /></PrivateRoute>} />
      <Route path="/bookings/:id" element={<PrivateRoute><BookingDetail /></PrivateRoute>} />
      <Route path="/bookings/:id/edit" element={<PrivateRoute><EditBooking /></PrivateRoute>} />

      {/* Resource routes (USER + ADMIN) */}
      <Route path="/resources" element={<PrivateRoute><ResourceList /></PrivateRoute>} />
      <Route path="/resources/:id" element={<PrivateRoute><ResourceDetail /></PrivateRoute>} />
       
      {/* Ticket routes (USER + ADMIN) */}
      <Route path="/tickets" element={<PrivateRoute><MyTicketsPage /></PrivateRoute>} />
      <Route path="/tickets/new" element={<PrivateRoute><CreateTicketForm /></PrivateRoute>} />
      <Route path="/tickets/:id" element={<PrivateRoute><TicketDetailPage /></PrivateRoute>} />

      {/* Technician routes */}
      <Route path="/technician/tasks" element={<TechnicianRoute><TechnicianTasksPage /></TechnicianRoute>} />

      {/* Admin routes */}
      <Route path="/admin/users" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
      <Route path="/admin/resources" element={<AdminRoute><AdminResources /></AdminRoute>} />
      <Route path="/admin/resources/new" element={<AdminRoute><ResourceForm /></AdminRoute>} />
      <Route path="/admin/resources/:id/edit" element={<AdminRoute><ResourceForm /></AdminRoute>} />
      <Route path="/admin/tickets" element={<AdminRoute><AdminTicketsPage /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;