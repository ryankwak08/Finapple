import { createContext, useEffect, useState, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { syncUserProfileRecord } from '@/services/profileService';

const AuthContext = createContext(null);

const emptyUser = null;
const getIsVerifiedEmailUser = (user) => Boolean(user?.email_confirmed_at || user?.confirmed_at);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(emptyUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const refreshUser = async () => {
    setIsLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      if (data?.user) {
        if (getIsVerifiedEmailUser(data.user)) {
          setUser(data.user);
          setIsAuthenticated(true);
          setAuthError(null);
          syncUserProfileRecord(data.user).catch((syncError) => {
            console.error('Profile sync failed:', syncError);
          });
        } else {
          setUser(data.user);
          setIsAuthenticated(false);
          setAuthError({
            type: 'email_not_verified',
            message: '이메일 인증을 완료한 뒤 로그인해주세요.',
            email: data.user.email,
          });
        }
      } else {
        setUser(emptyUser);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: '로그인 필요' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(emptyUser);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: '로그인 필요' });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (getIsVerifiedEmailUser(session.user)) {
          setUser(session.user);
          setIsAuthenticated(true);
          setAuthError(null);
          syncUserProfileRecord(session.user).catch((syncError) => {
            console.error('Profile sync failed:', syncError);
          });
        } else {
          setUser(session.user);
          setIsAuthenticated(false);
          setAuthError({
            type: 'email_not_verified',
            message: '이메일 인증을 완료한 뒤 로그인해주세요.',
            email: session.user.email,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(emptyUser);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: '로그인 필요' });
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
    setUser(emptyUser);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: '로그인 필요' });
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
