import React, { useState, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User as UserIcon, LogOut, ChevronDown, Settings, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getUserAvatarSrc, getUserInitials } from '../utils/userAvatar';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, openAuth } = useContext(AuthContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const scrollToServices = (e) => {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative z-20 px-6 py-6 w-full"
    >
      <div className="liquid-glass rounded-full px-4 md:px-6 py-2 md:py-3 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-5 h-5 md:w-6 md:h-6 text-white" />
            <span className="text-white font-semibold text-base md:text-lg whitespace-nowrap">Care Zone</span>
          </Link>          <div className="hidden md:flex items-center gap-8 text-white/80 text-sm font-medium">
            <a href="#services" onClick={scrollToServices} className="hover:text-white transition-colors duration-300">Services</a>
            <Link to="/dashboard" className="hover:text-white transition-colors duration-300">Dashboard</Link>
            <a href="#" className="hover:text-white transition-colors duration-300">About</a>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center overflow-hidden">
                  {getUserAvatarSrc(user) ? (
                    <img
                      src={getUserAvatarSrc(user)}
                      alt={user.username || user.email || 'User avatar'}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // If an image breaks (expired Google URL etc.), fall back gracefully.
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-white text-[10px] font-bold">
                      {getUserInitials(user)}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-white/80 text-sm font-medium">
                  {user.firstName || user.username}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 liquid-glass rounded-2xl py-2 shadow-2xl border border-white/10 z-30"
                  >
                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                      <p className="text-white text-xs font-semibold truncate">{user.email}</p>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">{user.role}</p>
                    </div>
                    
                    <Link 
                      to="/dashboard" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        openAuth('profile-edit');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Profile
                    </button>
                    
                    <div className="h-px bg-white/5 my-2" />
                    
                    <button 
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button 
                onClick={() => openAuth('signup-email')}
                className="text-white hover:text-white/80 transition-colors text-xs md:text-sm font-medium cursor-pointer"
              >
                Sign Up
              </button>
              <button 
                onClick={() => openAuth('login')}
                className="liquid-glass rounded-full px-4 md:px-6 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
