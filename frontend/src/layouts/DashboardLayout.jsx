import React, { useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Hospital, 
  UserCircle, 
  Users,
  Database,
  LogOut, 
  Menu, 
  X, 
  Settings, 
  Bell, 
  Search,
  ChevronRight,
  Globe
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { getUserAvatarSrc, getUserInitials } from '../utils/userAvatar';

const DashboardLayout = ({ children, title }) => {
  const { user, logout, openAuth } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { 
      label: 'Global Stats', 
      icon: LayoutDashboard, 
      path: '/admin', 
      roles: ['admin'] 
    },
    {
      label: 'User Management',
      icon: Users,
      path: '/admin/users',
      roles: ['admin']
    },
    {
      label: 'Policy Architecture',
      icon: Database,
      path: '/admin/policies',
      roles: ['admin']
    },
    { 
      label: 'Security Queue', 
      icon: ShieldAlert, 
      path: '/officer', 
      roles: ['officer'] 
    },
    { 
      label: 'Hospital Intake', 
      icon: Hospital, 
      path: '/hospital', 
      roles: ['hospital'] 
    },
    { 
      label: 'Member Portal', 
      icon: UserCircle, 
      path: '/portal', 
      roles: ['policyholder'] 
    },
  ].filter(item => item.roles.includes(user?.role));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex overflow-hidden">
      
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-40 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col shrink-0"
      >
        <div className="p-6 h-20 flex items-center justify-between border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-black text-lg tracking-tighter"
                >
                  Care Zone
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${
                  isActive 
                    ? 'bg-white/5 text-white shadow-xl shadow-black/20 border border-white/5' 
                    : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-2xl -z-10"
                  />
                )}
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:scale-110 transition-transform'}`} />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-bold tracking-tight"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && isSidebarOpen && (
                  <ChevronRight className="w-4 h-4 ml-auto text-blue-400/50" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/5 transition-all group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-bold"
                >
                  Terminate Session
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-black/20 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              {isSidebarOpen ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white/90">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Node Primary Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <Search className="w-4 h-4 text-white/30" />
              <input 
                placeholder="Global telemetry search..." 
                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/20 w-48 font-medium"
              />
            </div>
            
            <div className="flex items-center gap-4 border-l border-white/5 pl-6">
              <button className="relative p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-black" />
              </button>
              <button 
                onClick={() => openAuth('profile-edit')}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-0.5 group-hover:border-white/30 transition-all overflow-hidden flex items-center justify-center">
                  {getUserAvatarSrc(user) ? (
                    <img 
                      src={getUserAvatarSrc(user)} 
                      alt={user.username || 'User Profile'} 
                      className="w-full h-full object-cover rounded-[10px]"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-[10px] bg-black flex items-center justify-center text-white text-xs font-black">
                      {getUserInitials(user)}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-20">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;
