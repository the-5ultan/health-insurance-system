import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios for credentials (cookies)
axios.defaults.withCredentials = true;
const API_URL = 'http://localhost:5000';

// Axios interceptor to add Authorization header with token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Axios interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      // If we are not on the homepage, redirect to login
      if (window.location.pathname !== '/') {
        localStorage.removeItem('authToken');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

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
        // Fetch current user (axios interceptor will attach token if exists)
        const res = await axios.get(`${API_URL}/auth/current-user`);
        
        if (res.data.loggedIn) {
          setUser(res.data.user);
          
          // Store/Refresh token in localStorage if returned by backend
          if (res.data.token) {
            localStorage.setItem('authToken', res.data.token);
          }
          
          // Check for onboarding redirect
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'onboarding' && !res.data.user.username) {
            setAuthView('onboarding');
            setIsAuthModalOpen(true);
          }
        } else {
          // Not logged in, clear any stale token
          localStorage.removeItem('authToken');
          
          // Even if not logged in, if view=onboarding is requested, show modal
          const params = new URLSearchParams(window.location.search);
          if (params.get('view') === 'onboarding') {
            setIsAuthModalOpen(true);
            setAuthView('login'); // They need to login first
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Only clear token if it's definitely an auth error (e.g. 401/403)
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('authToken');
        }
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
        // Store the token in localStorage
        if (res.data.token) {
          localStorage.setItem('authToken', res.data.token);
        }
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
        // Store the token in localStorage
        if (res.data.token) {
          localStorage.setItem('authToken', res.data.token);
        }
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || "Signup failed", type: err.response?.data?.type };
    }
  };

  const logout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`);
      setUser(null);
      localStorage.removeItem('authToken');
      window.location.href = '/';
    } catch (err) {
      console.error("Logout failed:", err);
      setUser(null);
      localStorage.removeItem('authToken');
      window.location.href = '/';
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

  const uploadProfilePic = async (file, options = {}) => {
    try {
      const formData = new FormData();
      formData.append('profilePic', file);
      const res = await axios.post(`${API_URL}/auth/upload-profile-pic`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(options.onboardingUploadToken
            ? { 'x-onboarding-upload-token': options.onboardingUploadToken }
            : {})
        }
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
      return { success: false, message: err.response?.data?.message || "Failed to send OTP", type: err.response?.data?.type };
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

  const submitRoleRequest = async ({ requestedRole, details }) => {
    try {
      const res = await axios.post(`${API_URL}/auth/role-requests`, { requestedRole, details });
      return res.data;
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to submit role request' };
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
      submitRoleRequest,
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
