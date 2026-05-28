import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios for credentials (cookies)
axios.defaults.withCredentials = true;
const API_URL = 'http://localhost:5000';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState('login');
  const [initialEmail, setInitialEmail] = useState('');

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${API_URL}/auth/current-user`);
        if (res.data.loggedIn) {
          setUser(res.data.user);
          
          // Check for onboarding redirect
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'onboarding' && !res.data.user.username) {
            setAuthView('onboarding');
            setIsAuthModalOpen(true);
          }
        } else {
          // Even if not logged in, if view=onboarding is requested, show modal
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'onboarding') {
            setIsAuthModalOpen(true);
            setAuthView('login'); // They need to login first
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const openAuth = (view = 'login', email = '') => {
    setAuthView(view);
    setInitialEmail(email);
    setIsAuthModalOpen(true);
  };

  const closeAuth = () => {
    setIsAuthModalOpen(false);
    setInitialEmail('');
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.success) {
        setUser(res.data.user);
        if (!res.data.user.username) {
          setAuthView('onboarding');
          setIsAuthModalOpen(true);
        }
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Login failed" };
    }
  };

  const signup = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/auth/finalize-signup`, formData);
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Signup failed" };
    }
  };

  const logout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`);
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const updateProfile = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/auth/complete-profile`, formData);
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Update failed" };
    }
  };

  const uploadProfilePic = async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePic', file);
      const res = await axios.post(`${API_URL}/auth/upload-profile-pic`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Upload failed" };
    }
  };

  const sendOtp = async (email) => {
    try {
      const res = await axios.post(`${API_URL}/auth/send-otp`, { email });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Failed to send OTP" };
    }
  };

  const verifyOtp = async (email, otpToken) => {
    try {
      const res = await axios.post(`${API_URL}/auth/verify-otp`, { email, otpToken });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Invalid OTP" };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      loading, 
      sendOtp, 
      verifyOtp,
      updateProfile,
      uploadProfilePic,
      isAuthModalOpen,
      authView,
      initialEmail,
      openAuth,
      closeAuth
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
