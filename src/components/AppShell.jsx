import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Gamepad2 } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';
import { AnimatePresence } from 'framer-motion';
import BottomNav, { getActiveTab, getAppTabs } from './BottomNav';
import PageTransition from './PageTransition';
import PremiumBadge from './PremiumBadge';
import { safeStorage } from '@/lib/safeStorage';
import { useLanguage } from '@/lib/i18n';
import { TRACKS, useTrack } from '@/lib/trackContext';

const getUsageStorageKey = (email) => `totalUsageSeconds:${email || 'guest'}`;

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [isUserResolved, setIsUserResolved] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const trackMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const isSurvivalRoute = location.pathname.startsWith('/survival');
  const { locale, setLocale, t } = useLanguage();
  const { activeTrack, setActiveTrack, tracks, trackMeta } = useTrack();
  const appTabs = getAppTabs(t);
  const availableTracks = tracks;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const handleBottomNavReset = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('bottomNavReset', handleBottomNavReset);
    return () => window.removeEventListener('bottomNavReset', handleBottomNavReset);
  }, []);

  const handleEnterSurvival = () => {
    navigate('/survival', { state: { returnTo: activeTab || '/' } });
  };

  useEffect(() => {
    if (!trackMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!trackMenuRef.current?.contains(event.target)) {
        setTrackMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('touchstart', handleOutsideClick);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [trackMenuOpen]);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsUserResolved(true);
      });
    const start = Date.now();
    let usageEmail = 'guest';
    getCurrentUser()
      .then((u) => {
        usageEmail = u?.email || 'guest';
      })
      .catch(() => {
        usageEmail = 'guest';
      });
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
      const usageKey = getUsageStorageKey(usageEmail);
      const prev = parseInt(safeStorage.getItem(usageKey) || '0');
      safeStorage.setItem(usageKey, String(prev + elapsed));
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
      <div className={`mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col md:px-6 xl:px-8 ${isSurvivalRoute ? '' : 'pb-28 md:pb-10'}`}>
        {isSurvivalRoute ? (
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-5xl">
              <AnimatePresence mode="wait">
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
        ) : (
          <>
            <div className="sticky top-0 z-40 border-b border-border/60 bg-background/88 px-4 pb-3 pt-3 backdrop-blur-xl md:px-0 md:pt-6">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative" ref={trackMenuRef}>
                    <button
                      type="button"
                      onClick={() => setTrackMenuOpen((prev) => !prev)}
                      className="group flex items-center gap-2 rounded-2xl border border-border bg-card px-2.5 py-2 transition-colors hover:bg-muted/60"
                    >
                      <img
                        src="/logo.png"
                        alt="Finapple"
                        className="h-8 w-8 rounded-xl object-cover"
                      />
                      <div className="hidden text-left md:block">
                        <p className="text-[15px] font-extrabold tracking-tight text-foreground">{trackMeta.brand}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {locale === 'en' ? trackMeta.taglineEn : trackMeta.taglineKo}
                        </p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${trackMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {trackMenuOpen ? (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-2xl border border-border bg-card p-2 shadow-xl">
                        {availableTracks.map((track) => {
                          const selected = activeTrack === track.key;

                          return (
                            <button
                              key={track.key}
                              type="button"
                              onClick={() => {
                                setActiveTrack(track.key);
                                setTrackMenuOpen(false);
                              }}
                              className={`mb-1 w-full rounded-xl px-3 py-3 text-left transition-colors last:mb-0 ${
                                selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                              }`}
                            >
                              <p className="text-[13px] font-extrabold">
                                {track.brand}
                              </p>
                              <p className={`text-[11px] ${selected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                                {locale === 'en' ? track.labelEn : track.labelKo}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="hidden min-[430px]:block">
                    {getIsPremium(user) && <PremiumBadge compact />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnterSurvival}
                    className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-3 text-[12px] font-bold text-primary"
                  >
                    <Gamepad2 className="h-4 w-4" />
                    {t('tabSurvival', '생존')}
                  </button>
                  <div
                    className="inline-flex shrink-0 rounded-2xl border border-border bg-card p-1"
                    role="group"
                    aria-label={t('languageSelector', '언어 선택')}
                  >
                    {[
                      { value: 'ko', label: t('korean', '한국어') },
                      { value: 'en', label: t('english', 'English') },
                    ].map((option) => {
                      const active = locale === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setLocale(option.value)}
                          className={`min-w-[68px] whitespace-nowrap rounded-xl px-2.5 py-2 text-[11px] font-bold leading-none transition-colors sm:min-w-[74px] sm:px-3 ${
                            active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
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
                        <p className="text-[13px] font-bold text-foreground">{t('navigationMenu', '탐색 메뉴')}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {activeTrack === TRACKS.ONE ? 'Finapple One' : activeTrack === TRACKS.START ? 'Finapple Start' : 'Finapple Youth'}
                        </p>
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
          </>
        )}
      </div>
      {!isSurvivalRoute ? <BottomNav /> : null}
    </div>
  );
}
