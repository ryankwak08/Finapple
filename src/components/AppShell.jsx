import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';
import { AnimatePresence } from 'framer-motion';
import BottomNav, { appTabs, getActiveTab } from './BottomNav';
import PageTransition from './PageTransition';
import PremiumBadge from './PremiumBadge';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

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
      className="app-shell-gradient min-h-[100dvh] bg-background safe-area-top"
      style={{
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col pb-28 md:px-6 md:pb-10 xl:px-8">
        <div className="sticky top-0 z-40 border-b border-border/60 bg-background/88 px-4 pb-3 pt-3 backdrop-blur-xl md:px-0 md:pt-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo.png"
                  alt="Finapple"
                  className="h-8 w-8 rounded-xl object-cover"
                />
                <div className="hidden md:block">
                  <p className="text-[15px] font-extrabold tracking-tight text-foreground">Finapple</p>
                  <p className="text-[11px] text-muted-foreground">생활 금융 학습 앱</p>
                </div>
              </div>
              {getIsPremium(user) && <PremiumBadge compact />}
            </div>
            <Link to="/profile">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/10 transition-transform active:scale-[0.97]">
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
        </div>

        <div className="md:grid md:flex-1 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 md:pt-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-[108px] space-y-4">
              <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm shadow-primary/5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">탐색 메뉴</p>
                  </div>
                </div>
                <nav className="space-y-2">
                  {appTabs.map(({ root, label, icon: Icon }) => {
                    const active = activeTab === root;

                    return (
                      <Link
                        key={root}
                        to={root}
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('bottomNavReset', { detail: { tabRoot: root } }));
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/15'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-white/15' : 'bg-background'}`}>
                          <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
                        </div>
                        <span className="text-[14px] font-semibold">{label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="mx-auto w-full max-w-5xl">
              <AnimatePresence mode="wait">
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
