import { createContext, useCallback, useEffect, useRef, useState, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { syncUserProfileRecord } from '@/services/profileService';

const AuthContext = createContext(null);

const emptyUser = null;
const getIsVerifiedEmailUser = (user) => Boolean(user?.email_confirmed_at || user?.confirmed_at);
const getAuthRequiredError = () => ({ type: 'auth_required', message: '로그인 필요' });

const syncProfileSafely = (user) => {
  syncUserProfileRecord(user).catch((syncError) => {
    console.error('Profile sync failed:', syncError);
  });
};

const getProfileSyncKey = (user) => JSON.stringify({
  id: user?.id || '',
  email: user?.email || '',
  nickname: user?.user_metadata?.nickname || '',
  fullName: user?.user_metadata?.full_name || '',
  avatar: user?.user_metadata?.profile_picture || '',
  schoolName: user?.user_metadata?.school_name || '',
  schoolCode: user?.user_metadata?.school_code || '',
  educationOfficeCode: user?.user_metadata?.education_office_code || '',
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(emptyUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const lastProfileSyncKeyRef = useRef('');

  const applyAuthenticatedUser = useCallback((nextUser) => {
    if (getIsVerifiedEmailUser(nextUser)) {
      setUser(nextUser);
      setIsAuthenticated(true);
      setAuthError(null);
      const profileSyncKey = getProfileSyncKey(nextUser);
      if (profileSyncKey !== lastProfileSyncKeyRef.current) {
        lastProfileSyncKeyRef.current = profileSyncKey;
        syncProfileSafely(nextUser);
      }
      return;
    }

    setUser(nextUser);
    setIsAuthenticated(false);
    setAuthError({
      type: 'email_not_verified',
      message: '이메일 인증을 완료한 뒤 로그인해주세요.',
      email: nextUser?.email,
    });
  }, []);

  const applySignedOutState = useCallback(() => {
    setUser(emptyUser);
    setIsAuthenticated(false);
    setAuthError(getAuthRequiredError());
  }, []);

  const refreshUser = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setIsLoadingAuth(true);
    }
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (sessionData?.session?.user) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        applyAuthenticatedUser(userData?.user || sessionData.session.user);
      } else {
        applySignedOutState();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      applySignedOutState();
    } finally {
      if (showLoading) {
        setIsLoadingAuth(false);
      }
    }
  }, [applyAuthenticatedUser, applySignedOutState]);

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
        void refreshUser({ showLoading: false });
      } else if (event === 'SIGNED_OUT') {
        applySignedOutState();
        setIsLoadingAuth(false);
      }
    });

    const handleFocus = () => {
      void refreshUser({ showLoading: false });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshUser({ showLoading: false });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      listener?.subscription?.unsubscribe && listener.subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applySignedOutState, refreshUser]);

  const checkAppState = useCallback(async () => {
    await refreshUser({ showLoading: false });
  }, [refreshUser]);

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
