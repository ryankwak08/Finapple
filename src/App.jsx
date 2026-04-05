import { useEffect, useMemo } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppShell from './components/AppShell';
import Study from './pages/Study';
import StudyDetail from './pages/StudyDetail';
import Quiz from './pages/Quiz';
import QuizPlay from './pages/QuizPlay';
import GlossaryQuizPlay from './pages/GlossaryQuizPlay';
import Glossary from './pages/Glossary';
import Profile from './pages/Profile';
import Premium from './pages/Premium';
import PremiumResult from './pages/PremiumResult';
import Shop from './pages/Shop';
import Login from './pages/Login';
import ReviewNote from './pages/ReviewNote';
import Leaderboard from './pages/Leaderboard';


const FullScreenSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AppRoutes = () => (
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
    <Route path="*" element={<PageNotFound />} />
  </Routes>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
      // If already on login page, let the route render.
      if (window.location.pathname === '/login') {
        return <AppRoutes />;
      }
      // Otherwise redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return <AppRoutes />;
};


function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark) => document.documentElement.classList.toggle('dark', dark);
    apply(mq.matches);
    mq.addEventListener('change', e => apply(e.matches));
    return () => mq.removeEventListener('change', e => apply(e.matches));
  }, []);

  const appProviders = (
    <Router>
      <AuthenticatedApp />
    </Router>
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {appProviders}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
