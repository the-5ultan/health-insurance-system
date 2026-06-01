import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BackgroundVideo from './components/BackgroundVideo';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminPolicyManagement from './pages/AdminPolicyManagement';
import HospitalDashboard from './pages/HospitalDashboard';
import PolicyholderDashboard from './pages/PolicyholderDashboard';
import AuthModal from './components/AuthModal';
import { AuthContext } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';

const Home = () => {
  return (
    <main className="relative bg-black min-h-screen w-full flex flex-col selection:bg-white selection:text-black overflow-x-hidden">
      {/* Hero Section - Full Screen */}
      <div className="h-screen w-full flex flex-col relative overflow-hidden shrink-0">
        <BackgroundVideo />
        <Navbar />
        <Hero />
      </div>
      
      {/* Services Section - Scrollable */}
      <Services />
      
      <footer className="relative z-10 py-12 text-center text-white/20 text-[10px] font-black uppercase tracking-[0.3em] border-t border-white/5 bg-black selection:bg-white selection:text-black">
        © 2026 Care Zone // Decentralized Claim Protocol
      </footer>
    </main>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If they are on the wrong dashboard, send them to their own
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const DashboardRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) return <Navigate to="/" />;

  switch (user.role) {
    case 'admin': return <Navigate to="/admin" />;
    case 'officer': return <Navigate to="/officer" />;
    case 'hospital': return <Navigate to="/hospital" />;
    case 'policyholder': return <Navigate to="/portal" />;
    default: return <Navigate to="/" />;
  }
};

const AppContent = () => {
  const { isAuthModalOpen } = useContext(AuthContext);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Unified Dashboard Entry Point (Restores Original Logic) */}
        <Route path="/dashboard" element={<DashboardRedirect />} />

        {/* Restore Admin Modules */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUserManagement />
          </ProtectedRoute>
        } />

        <Route path="/admin/policies" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPolicyManagement />
          </ProtectedRoute>
        } />
        
        {/* Restore Officer Adjudication */}
        <Route path="/officer" element={
          <ProtectedRoute allowedRoles={['officer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        } />
        
        {/* Restore Hospital Intake */}
        <Route path="/hospital" element={
          <ProtectedRoute allowedRoles={['hospital']}>
            <HospitalDashboard />
          </ProtectedRoute>
        } />
        
        {/* Restore Member Services */}
        <Route path="/portal" element={
          <ProtectedRoute allowedRoles={['policyholder']}>
            <PolicyholderDashboard />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      
      {/* Centralized High-Fidelity Auth Terminal */}
      <AnimatePresence>
        {isAuthModalOpen && <AuthModal />}
      </AnimatePresence>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
