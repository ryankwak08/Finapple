import { createContext, useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { syncUserProfileRecord } from '@/services/profileService';
import { initializeRevenueCatForUser, resetRevenueCatSession } from '@/services/revenueCatService';

const AuthContext = createContext(null);

const emptyUser = null;
const getIsVerifiedEmailUser = (user) => Boolean(user?.email_confirmed_at || user?.confirmed_at);
const getAuthRequiredError = () => ({ type: 'auth_required', message: '로그인 필요' });

const syncProfileSafely = (user) => {
  syncUserProfileRecord(user).catch((syncError) => {
    console.error('Profile sync failed:', syncError);
  });
};

const syncNativePremiumSafely = (user) => {
  initializeRevenueCatForUser(user).catch((syncError) => {
    console.error('RevenueCat sync failed:', syncError);
  });
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(emptyUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const applyAuthenticatedUser = (nextUser) => {
    if (getIsVerifiedEmailUser(nextUser)) {
      setUser(nextUser);
      setIsAuthenticated(true);
      setAuthError(null);
      syncProfileSafely(nextUser);
      syncNativePremiumSafely(nextUser);
      return;
    }

    setUser(nextUser);
    setIsAuthenticated(false);
    setAuthError({
      type: 'email_not_verified',
      message: '이메일 인증을 완료한 뒤 로그인해주세요.',
      email: nextUser?.email,
    });
  };

  const applySignedOutState = () => {
    setUser(emptyUser);
    setIsAuthenticated(false);
    setAuthError(getAuthRequiredError());
    resetRevenueCatSession().catch((error) => {
      console.error('RevenueCat reset failed:', error);
    });
  };

  const refreshUser = async () => {
    setIsLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data?.session?.user) {
        applyAuthenticatedUser(data.session.user);
      } else {
        applySignedOutState();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      applySignedOutState();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED') &&
        session?.user
      ) {
        applyAuthenticatedUser(session.user);
        setIsLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        applySignedOutState();
        setIsLoadingAuth(false);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe && listener.subscription.unsubscribe();
    };
  }, []);

  const checkAppState = async () => {
    await refreshUser();
  };

  const logout = async (shouldRedirect = true) => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    applySignedOutState();
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
