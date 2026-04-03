import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';
import { AnimatePresence } from 'framer-motion';
import BottomNav from './BottomNav';
import PageTransition from './PageTransition';
import PremiumBadge from './PremiumBadge';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  // Save scroll position as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll:${location.pathname}`, String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Restore scroll position on route change
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll:${location.pathname}`);
    if (saved) {
      setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: 'instant' }), 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  useEffect(() => {
    getCurrentUser().then(u => setUser(u)).catch(() => {});
    const start = Date.now();
    const handleProfileUpdate = (e) => {
      setUser(prev => (
        prev
          ? {
              ...prev,
              profile_picture: e.detail.profile_picture,
              user_metadata: { ...(prev.user_metadata || {}), profile_picture: e.detail.profile_picture },
            }
          : prev
      ));
    };
    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    return () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const prev = parseInt(localStorage.getItem('totalUsageSeconds') || '0');
      localStorage.setItem('totalUsageSeconds', String(prev + elapsed));
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-background safe-area-top"
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="max-w-lg mx-auto pb-24">
        {/* Top bar: logo + profile */}
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Finapple"
              className="h-8 w-8 rounded-xl object-cover"
            />
            {getIsPremium(user) && <PremiumBadge compact />}
          </div>
          <Link to="/profile">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
              {(user?.user_metadata?.profile_picture || user?.profile_picture) ? (
                <img
                  src={user?.user_metadata?.profile_picture || user?.profile_picture}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary font-extrabold text-[14px]">
                  {(user?.user_metadata?.full_name || user?.user_metadata?.nickname || user?.email || '?')[0] || '?'}
                </span>
              )}
            </div>
          </Link>
        </div>
        <AnimatePresence mode="wait">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
