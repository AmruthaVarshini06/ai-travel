"use client";

import React from 'react';
import { 
  Compass, 
  Bookmark, 
  MessageSquare, 
  Bell, 
  Menu,
  X,
  Navigation,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isLoggedIn = isAuthenticated;
  const userName = user?.name || 'Traveler';

  const [avatarUrl, setAvatarUrl] = React.useState(
    localStorage.getItem('user_avatar_data') || 
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${localStorage.getItem('user_avatar_seed') || userName}`
  );

  React.useEffect(() => {
    const handleStorageChange = () => {
      const customAvatar = localStorage.getItem('user_avatar_data');
      if (customAvatar) {
        setAvatarUrl(customAvatar);
      } else {
        setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${localStorage.getItem('user_avatar_seed') || userName}`);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage-local', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage-local', handleStorageChange);
    };
  }, [userName]);

  // 🌈 Define the specific color for each label
  const getButtonColors = (label: string, isActive: boolean) => {
    // If active, we use a slightly stronger version of the color
    if (isActive) {
      switch(label) {
        case 'Home': return 'bg-blue-100 text-blue-600 shadow-sm shadow-blue-200';
        case 'Navigate': return 'bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200';
        case 'My Trips': return 'bg-orange-100 text-orange-600 shadow-sm shadow-orange-200';
        case 'Explore': return 'bg-purple-100 text-purple-600 shadow-sm shadow-purple-200';
        case 'AI Assistant': return 'bg-pink-100 text-pink-600 shadow-sm shadow-pink-200';
        case 'Alerts': return 'bg-yellow-100 text-yellow-600 shadow-sm shadow-yellow-200';
        default: return 'bg-white text-blue-600 shadow-sm shadow-blue-200';
      }
    }

    // If not active, we use the pastel hover colors
    switch(label) {
      case 'Home': return 'text-slate-500 hover:bg-blue-50 hover:text-blue-500 hover:shadow-sm hover:shadow-blue-200/20';
      case 'Navigate': return 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-500 hover:shadow-sm hover:shadow-emerald-200/20';
      case 'My Trips': return 'text-slate-500 hover:bg-orange-50 hover:text-orange-500 hover:shadow-sm hover:shadow-orange-200/20';
      case 'Explore': return 'text-slate-500 hover:bg-purple-50 hover:text-purple-500 hover:shadow-sm hover:shadow-purple-200/20';
      case 'AI Assistant': return 'text-slate-500 hover:bg-pink-50 hover:text-pink-500 hover:shadow-sm hover:shadow-pink-200/20';
      case 'Alerts': return 'text-slate-500 hover:bg-yellow-50 hover:text-yellow-500 hover:shadow-sm hover:shadow-yellow-200/20';
      default: return 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';
    }
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Navigation, label: 'Navigate', path: '/navigate' },
    { icon: Bookmark, label: 'My Trips', path: '/trips' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: MessageSquare, label: 'AI Assistant', path: '/assistant' },
    { icon: Bell, label: 'Alerts', path: '/alerts' },
  ];

  const handleNavigation = (path: string) => {
    if (path !== '/' && !isLoggedIn) {
      navigate('/login');
    } else {
      navigate(path);
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="rounded-xl overflow-hidden bg-white p-1 shadow-sm">
            <img src="./logo.png" alt="AI Travel Logo" className="w-16 h-16 object-contain"/>
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-800">
            AI <span className="text-slate-500">Travel</span>
          </span>
        </div>

        {/* Desktop Menu - The Rainbow Hover Effect */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100/60">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={idx}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm",
                  getButtonColors(item.label, isActive)
                )}
              >
                <item.icon className="w-4 h-4 transition-colors" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="font-bold text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl px-6 transition-colors"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/login')}
                className="font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 shadow-lg shadow-slate-900/20 transition-all hover:scale-105"
              >
                Sign Up
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 font-bold text-slate-600 hover:text-blue-500 rounded-xl px-4 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm">
                <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
              </div>
              <span className="hidden sm:inline text-slate-700">{userName}</span>
            </Button>
          )}
          
          {/* Mobile Menu Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-slate-500 hover:text-blue-500 hover:bg-blue-50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-100/50 p-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <div className="grid grid-cols-1 gap-2">
            {menuItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={idx}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold",
                    getButtonColors(item.label, isActive)
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
          {!isLoggedIn && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => handleNavigation('/login')} className="rounded-xl font-bold h-12 border-slate-200 text-slate-500 hover:text-blue-500 hover:bg-blue-50">Login</Button>
              <Button onClick={() => handleNavigation('/login')} className="rounded-xl font-black h-12 bg-slate-900 text-white shadow-md shadow-slate-900/30 hover:scale-105 transition-all">Sign Up</Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;