import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Gamepad2, Gift, X } from 'lucide-react';
import { getCurrentUser } from '@/services/authService';
import { getIsFreeTrialPremium, getIsPremium } from '@/lib/premium';
import { isFreePremiumAccessEnabled, isPremiumFreeTrialCampaignEnabled } from '@/lib/runtimePlatform';
import { syncAdsenseForUser } from '@/lib/adsense';
import { AnimatePresence } from 'framer-motion';
import BottomNav, { getActiveTab, getAppTabs } from './BottomNav';
import PageTransition from './PageTransition';
import PremiumBadge from './PremiumBadge';
import SchoolOnboardingPrompt from './SchoolOnboardingPrompt';
import { safeStorage } from '@/lib/safeStorage';
import { useLanguage } from '@/lib/i18n';
import { BUSINESS_INFO_ITEMS } from '@/lib/legalContent';
import { TRACKS, useTrack } from '@/lib/trackContext';

const getUsageStorageKey = (email) => `totalUsageSeconds:${email || 'guest'}`;
const todayKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const FREE_TRIAL_BANNER_DISMISSED_KEY = 'finapple:premium-free-trial-banner-dismissed-date';

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [isUserResolved, setIsUserResolved] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const [freeTrialBannerDismissed, setFreeTrialBannerDismissed] = useState(false);
  const trackMenuRef = useRef(null);
  const mainRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);
  const isSurvivalRoute = location.pathname.startsWith('/survival');
  const { locale, setLocale, t } = useLanguage();
  const { activeTrack, setActiveTrack, tracks, trackMeta } = useTrack();
  const freePremiumAccess = isFreePremiumAccessEnabled();
  const freeTrialPremium = getIsFreeTrialPremium(user);
  const showFreeTrialBanner = isPremiumFreeTrialCampaignEnabled()
    && isUserResolved
    && !getIsPremium(user)
    && !freeTrialBannerDismissed
    && !location.pathname.startsWith('/premium');
  const appTabs = getAppTabs(t);
  const availableTracks = tracks;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const handleBottomNavReset = () => {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
    const handlePremiumTrialStarted = (e) => {
      if (e.detail?.user) {
        setUser(e.detail.user);
      } else {
        getCurrentUser().then(setUser).catch(() => {});
      }
    };
    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    window.addEventListener('premiumTrialStarted', handlePremiumTrialStarted);
    return () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const usageKey = getUsageStorageKey(usageEmail);
      const prev = parseInt(safeStorage.getItem(usageKey) || '0');
      safeStorage.setItem(usageKey, String(prev + elapsed));
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
      window.removeEventListener('premiumTrialStarted', handlePremiumTrialStarted);
    };
  }, []);

  useEffect(() => {
    if (!isUserResolved) {
      return;
    }

    syncAdsenseForUser({
      enabled: !getIsPremium(user) && !freePremiumAccess,
    });
  }, [freePremiumAccess, isUserResolved, user]);

  useEffect(() => {
    setFreeTrialBannerDismissed(safeStorage.getItem(FREE_TRIAL_BANNER_DISMISSED_KEY) === todayKey());
  }, []);

  const dismissFreeTrialBannerForToday = () => {
    safeStorage.setItem(FREE_TRIAL_BANNER_DISMISSED_KEY, todayKey());
    setFreeTrialBannerDismissed(true);
  };

  return (
    <div
      className="app-shell-gradient safe-area-top min-h-screen w-full max-w-full overflow-x-hidden bg-background md:h-screen md:overflow-hidden"
      style={{
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <div className={`mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-x-hidden md:h-screen md:min-h-0 md:px-6 xl:px-8 ${isSurvivalRoute ? '' : 'pb-[76px] md:pb-10'}`}>
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
            <div className="sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/92 px-2.5 pb-2 pt-2 backdrop-blur-xl md:px-0 md:pt-6">
              <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="relative" ref={trackMenuRef}>
                    <button
                      type="button"
                      onClick={() => setTrackMenuOpen((prev) => !prev)}
                      className="group flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 transition-colors hover:bg-muted/60"
                    >
                      <img
                        src="/logo.png"
                        alt="Finapple"
                        className="h-6 w-6 rounded-lg object-cover"
                      />
                      <div className="hidden text-left md:block">
                        <p className="text-[14px] font-extrabold tracking-tight text-foreground">{trackMeta.brand}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {locale === 'en' ? trackMeta.taglineEn : trackMeta.taglineKo}
                        </p>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${trackMenuOpen ? 'rotate-180' : ''}`} />
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
                    {getIsPremium(user) && !freePremiumAccess && <PremiumBadge compact freeTrial={freeTrialPremium} />}
                  </div>
                  <Link to="/profile" className="md:hidden">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/10 transition-transform active:scale-[0.97]">
                      {(user?.user_metadata?.profile_picture || user?.profile_picture) ? (
                        <img
                          src={user?.user_metadata?.profile_picture || user?.profile_picture}
                          alt="profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[13px] font-extrabold text-primary">
                          {(user?.user_metadata?.full_name || user?.user_metadata?.nickname || user?.email || '?')[0] || '?'}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 md:flex md:min-w-0 md:items-center">
                  <button
                    type="button"
                    onClick={handleEnterSurvival}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-[10px] font-bold text-primary"
                  >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    <span className="truncate">{locale === 'en' ? 'Survival' : t('tabSurvival', '생존')}</span>
                  </button>
                  <div
                    className="inline-flex min-w-0 w-full rounded-xl border border-border bg-card p-1 md:w-auto md:flex-none"
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
                          className={`min-w-0 flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[10px] font-bold leading-none transition-colors md:min-w-[74px] md:flex-none md:px-3 md:text-[11px] ${
                            active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <Link to="/profile" className="hidden md:block">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/10 transition-transform active:scale-[0.97]">
                      {(user?.user_metadata?.profile_picture || user?.profile_picture) ? (
                        <img
                          src={user?.user_metadata?.profile_picture || user?.profile_picture}
                          alt="profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-extrabold text-[13px]">
                          {(user?.user_metadata?.full_name || user?.user_metadata?.nickname || user?.email || '?')[0] || '?'}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {showFreeTrialBanner ? (
              <div className="mx-2.5 mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm md:mx-0">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/premium')}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                      <Gift className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-amber-950">파격 이벤트! 파이내플 한 달 무료체험 받아가세요</p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-4 text-amber-900">5월 1일 ~ 6월 1일 신청 가능 · 등록 즉시 프리미엄 1개월 적용</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={dismissFreeTrialBannerForToday}
                    className="flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-white/70"
                    aria-label="오늘 다시 보지 않기"
                  >
                    <span className="hidden sm:inline">오늘 다시 보지 않기</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 md:pt-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
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

              <main
                ref={mainRef}
                className="min-w-0 min-h-0 flex-1 overflow-y-auto scrollbar-hidden"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
              >
                <div className="mx-auto w-full max-w-5xl">
                  <AnimatePresence mode="wait">
                    <PageTransition>
                      <Outlet />
                    </PageTransition>
                  </AnimatePresence>

                  <footer className="mt-8 border-t border-border/70 px-3 py-6 text-[11px] leading-5 text-muted-foreground md:px-0">
                    <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                      {BUSINESS_INFO_ITEMS.map(({ label, value }) => (
                        <p key={label} className="min-w-0 break-words">
                          <span className="font-semibold text-foreground/80">{label}</span>
                          <span className="mx-1 text-border">|</span>
                          {value}
                        </p>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                      <Link to="/terms" className="font-semibold text-foreground/80 hover:text-foreground">
                        이용약관
                      </Link>
                      <Link to="/privacy" className="font-semibold text-foreground/80 hover:text-foreground">
                        개인정보 처리방침
                      </Link>
                    </div>
                  </footer>
                </div>
              </main>
            </div>
          </>
        )}
      </div>
      {!isSurvivalRoute ? <BottomNav /> : null}
      <SchoolOnboardingPrompt
        user={user}
        onSaved={(nextUser) => {
          if (nextUser) {
            setUser(nextUser);
          }
        }}
      />
    </div>
  );
}
