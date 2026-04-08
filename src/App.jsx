import { Component, lazy, Suspense, useEffect, useMemo } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import useSoundEffects from '@/hooks/useSoundEffects';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
const AppShell = lazy(() => import('./components/AppShell'));
const Study = lazy(() => import('./pages/Study'));
const StudyDetail = lazy(() => import('./pages/StudyDetail'));
const Quiz = lazy(() => import('./pages/Quiz'));
const QuizPlay = lazy(() => import('./pages/QuizPlay'));
const GlossaryQuizPlay = lazy(() => import('./pages/GlossaryQuizPlay'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Profile = lazy(() => import('./pages/Profile'));
const Premium = lazy(() => import('./pages/Premium'));
const PremiumResult = lazy(() => import('./pages/PremiumResult'));
const Shop = lazy(() => import('./pages/Shop'));
const Login = lazy(() => import('./pages/Login'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const ReviewNote = lazy(() => import('./pages/ReviewNote'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));


const FullScreenSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background px-6 py-10 text-foreground">
          <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-destructive">Runtime Error</p>
            <h1 className="mt-3 text-xl font-extrabold">앱을 불러오지 못했어요</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              새로고침 후 다시 시도해주세요. 문제가 계속되면 잠시 뒤 다시 접속해주세요.
            </p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-muted/70 p-3 text-xs text-muted-foreground">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              다시 불러오기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const isClickableElement = (target) => {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('[data-no-click-sound="true"]')) {
    return false;
  }

  const clickable = target.closest('button, a, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], summary');
  if (!clickable) {
    return false;
  }

  if (clickable.hasAttribute('disabled') || clickable.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  return true;
};

const GlobalInteractionSound = () => {
  const { playClickSound, primeSoundEffects } = useSoundEffects();

  useEffect(() => {
    let lastPlayedAt = 0;

    const playGlobalClick = async () => {
      const now = Date.now();
      if (now - lastPlayedAt < 50) {
        return;
      }

      lastPlayedAt = now;
      await primeSoundEffects();
      await playClickSound();
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0 || !isClickableElement(event.target)) {
        return;
      }

      void playGlobalClick();
    };

    const handleKeyDown = (event) => {
      if ((event.key !== 'Enter' && event.key !== ' ') || !isClickableElement(event.target)) {
        return;
      }

      void playGlobalClick();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [playClickSound, primeSoundEffects]);

  return null;
};

const AppRoutes = () => (
  <Suspense fallback={<FullScreenSpinner />}>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Study />} />
        <Route path="/study/:topicId" element={<StudyDetail />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/:quizId" element={<QuizPlay />} />
        <Route path="/glossary-quiz/:unitId" element={<GlossaryQuizPlay />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/review-note" element={<ReviewNote />} />
        <Route path="/review-note/:reviewId" element={<ReviewNote />} />
      </Route>
      <Route path="/premium" element={<Premium />} />
      <Route path="/premium/success" element={<PremiumResult status="success" />} />
      <Route path="/premium/fail" element={<PremiumResult status="fail" />} />
      <Route path="/premium/cancel" element={<PremiumResult status="cancel" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  </Suspense>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isPublicAuthRoute = location.pathname === '/login' || location.pathname === '/terms' || location.pathname === '/privacy';
  const shouldRedirectToLogin = Boolean(
    authError &&
    (authError.type === 'auth_required' || authError.type === 'email_not_verified') &&
    !isPublicAuthRoute
  );

  const isBootstrapping = useMemo(
    () => isLoadingPublicSettings || isLoadingAuth,
    [isLoadingPublicSettings, isLoadingAuth]
  );

  // Show loading spinner while checking app public settings or auth
  if (isBootstrapping) {
    return <FullScreenSpinner />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required' || authError.type === 'email_not_verified') {
      if (shouldRedirectToLogin) {
        return <Navigate to="/login" replace />;
      }

      return <AppRoutes />;
    }
  }

  // Render the main app
  return <AppRoutes />;
};


function App() {
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) {
      return undefined;
    }

    const apply = (dark) => document.documentElement.classList.toggle('dark', dark);
    const handleChange = (event) => apply(event.matches);

    apply(mq.matches);

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }

    if (typeof mq.addListener === 'function') {
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }

    return undefined;
  }, []);

  const appProviders = (
    <Router>
      <AuthenticatedApp />
    </Router>
  );

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <GlobalInteractionSound />
          {appProviders}
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
