import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { findMaskedEmailByNickname, initializePasswordRecovery, requestPasswordReset, resendSignupConfirmation, signInWithEmail, signOut, signUpWithEmail, updatePassword, verifySignupEmailOtp } from '@/services/authService';
import { isNicknameAvailable } from '@/services/profileService';
import { NICKNAME_MAX_LENGTH, normalizeNickname, validateNickname, validatePassword } from '@/lib/profileRules';
import { useAuth } from '@/lib/AuthContext';

const OTP_LENGTH = 6;
const hasPasswordRecoveryContext = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    searchParams.get('mode') === 'reset-password' ||
    Boolean(searchParams.get('code')) ||
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    (Boolean(hashParams.get('access_token')) && Boolean(hashParams.get('refresh_token')))
  );
};

export default function Login() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const { checkAppState, isAuthenticated, authError, user } = useAuth();
  const [mode, setMode] = useState(hasPasswordRecoveryContext() ? 'reset-password' : 'signin');
  const [isRecoveryReady, setIsRecoveryReady] = useState(!hasPasswordRecoveryContext());
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [lookupNickname, setLookupNickname] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [nicknameCheckedValue, setNicknameCheckedValue] = useState('');
  const [nicknameCheckMessage, setNicknameCheckMessage] = useState('');
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resolvedVerificationEmail = useMemo(
    () => verificationEmail || authError?.email || user?.email || email,
    [authError?.email, email, user?.email, verificationEmail]
  );

  const isSignUp = mode === 'signup';
  const isVerify = mode === 'verify';
  const isFindEmail = mode === 'find-email';
  const isResetRequest = mode === 'reset-request';
  const isResetPassword = mode === 'reset-password';
  const normalizedNickname = normalizeNickname(nickname);
  const isNicknameVerified = normalizedNickname.length > 0 && nicknameCheckedValue === normalizedNickname;

  useEffect(() => {
    let cancelled = false;

    initializePasswordRecovery()
      .then((isRecovery) => {
        if (!cancelled) {
          if (isRecovery) {
            setMode('reset-password');
            setError('');
            setMessage('새 비밀번호를 입력해주세요.');
          }
          setIsRecoveryReady(true);
        }
      })
      .catch((recoveryError) => {
        if (!cancelled) {
          console.error('Password recovery initialization failed:', recoveryError);
          setError(recoveryError.message || '비밀번호 재설정 링크를 확인하지 못했어요. 다시 요청해주세요.');
          setIsRecoveryReady(true);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
        setError('');
        setMessage('새 비밀번호를 입력해주세요.');
      }
    });

    return () => {
      cancelled = true;
      if (listener?.subscription?.unsubscribe) {
        listener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecoveryReady) {
      return;
    }

    if (isAuthenticated && !hasPasswordRecoveryContext() && !isResetPassword) {
      navigate('/');
    }
  }, [isAuthenticated, isRecoveryReady, isResetPassword, navigate]);

  useEffect(() => {
    if (authError?.type === 'email_not_verified') {
      setMode('verify');
      setVerificationEmail(authError.email || user?.email || '');
      setMessage(authError.message);
    }
  }, [authError, user?.email]);

  const handleResendVerification = async () => {
    if (!resolvedVerificationEmail) {
      setError('인증 메일을 다시 보내려면 이메일을 먼저 입력해주세요.');
      return;
    }

    try {
      setIsResending(true);
      setError('');
      await resendSignupConfirmation(resolvedVerificationEmail);
      setMessage(`${resolvedVerificationEmail}로 인증 메일을 다시 보냈어요.`);
    } catch (resendError) {
      console.error('Resend verification failed:', resendError);
      setError(resendError.message || '인증 메일을 다시 보내지 못했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!resolvedVerificationEmail) {
      setError('인증 이메일 정보를 찾지 못했어요. 다시 회원가입을 진행해주세요.');
      return;
    }

    if (!verificationCode.trim()) {
      setError('이메일로 받은 인증 코드를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifySignupEmailOtp(resolvedVerificationEmail, verificationCode.trim());
      await checkAppState();
      navigate('/');
    } catch (verifyError) {
      console.error('Email verification failed:', verifyError);
      setError(verifyError.message || '인증 코드 확인 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindEmail = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const nicknameError = validateNickname(lookupNickname);
    if (nicknameError) {
      setError(nicknameError);
      return;
    }

    try {
      setIsSubmitting(true);
      const maskedEmail = await findMaskedEmailByNickname(lookupNickname.trim());
      setMessage(`가입 이메일은 ${maskedEmail} 입니다.`);
    } catch (lookupError) {
      setError(lookupError.message || '아이디를 찾지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckNickname = async () => {
    setError('');
    setMessage('');
    setNicknameCheckMessage('');

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setError(nicknameError);
      setNicknameCheckedValue('');
      return;
    }

    try {
      setIsCheckingNickname(true);
      const nicknameAvailable = await isNicknameAvailable(normalizedNickname);

      if (!nicknameAvailable) {
        setError('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.');
        setNicknameCheckedValue('');
        return;
      }

      setNicknameCheckedValue(normalizedNickname);
      setNicknameCheckMessage('사용 가능한 닉네임이에요.');
    } catch (checkError) {
      setError(checkError.message || '닉네임 확인 중 오류가 발생했습니다.');
      setNicknameCheckedValue('');
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!resetEmail.trim()) {
      setError('비밀번호를 재설정할 이메일을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await requestPasswordReset(resetEmail.trim());
      setMessage(`${resetEmail.trim()}로 비밀번호 재설정 메일을 보냈어요.`);
    } catch (requestError) {
      setError(requestError.message || '비밀번호 재설정 메일을 보내지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      await signOut();
      setMessage('비밀번호가 변경되었어요. 새 비밀번호로 로그인해주세요.');
      setMode('signin');
      window.history.replaceState({}, '', '/login');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (resetError) {
      setError(resetError.message || '비밀번호를 변경하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password || (isSignUp && !nickname.trim())) {
      setError(isSignUp ? '닉네임, 이메일, 비밀번호를 입력해주세요.' : '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (isSignUp) {
      const nicknameError = validateNickname(nickname);
      if (nicknameError) {
        setError(nicknameError);
        return;
      }

      if (!isNicknameVerified) {
        setError('닉네임 중복 확인을 먼저 완료해주세요.');
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    if (isSignUp && password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isSignUp) {
        const nicknameAvailable = await isNicknameAvailable(normalizedNickname);
        if (!nicknameAvailable) {
          setNicknameCheckedValue('');
          throw new Error('이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해주세요.');
        }

        await signUpWithEmail(email, password, nickname);
        setVerificationEmail(email);
        setMessage(`${email}로 인증 코드 메일을 보냈어요.`);
        setMode('verify');
        setNickname('');
        setNicknameCheckedValue('');
        setNicknameCheckMessage('');
        setConfirmPassword('');
        setPassword('');
      } else {
        await signInWithEmail(email, password);
        await checkAppState();
        navigate('/');
      }
    } catch (submitError) {
      console.error('Login submit failed:', submitError);
      const nextMessage = submitError.message || '로그인 처리 중 오류가 발생했습니다.';
      if (/email not confirmed/i.test(nextMessage)) {
        setError('이메일 인증이 아직 완료되지 않았어요. 메일함에서 인증한 뒤 다시 로그인해주세요.');
        setVerificationEmail(email);
        setMode('verify');
        setMessage('인증 메일이 보이지 않으면 아래 버튼으로 다시 보낼 수 있어요.');
      } else {
        setError(nextMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">FinApple 로그인</h1>
          <p className="mt-2 text-sm text-slate-600">
            경제 학습 기록과 프리미엄 기능을 이용하려면 로그인하세요.
          </p>
        </div>

        {authError?.type === 'email_not_verified' ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {authError.message}
          </div>
        ) : null}

        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setMessage('');
              setVerificationCode('');
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setMessage('');
              setVerificationCode('');
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            회원가입
          </button>
        </div>

        {isVerify ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">이메일 인증 코드 입력</p>
              <p className="mt-1 text-sm text-slate-600">{resolvedVerificationEmail || '가입한 이메일'}</p>
              <p className="mt-2 text-xs text-slate-500">메일이 바로 안 보이면 스팸함이나 프로모션함도 함께 확인해주세요.</p>
            </div>

            <div>
              <label htmlFor="verificationCode" className="mb-1 block text-sm font-medium text-slate-700">
                6자리 인증 코드
              </label>
              <div className="relative">
                <input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  placeholder="123456"
                  autoComplete="one-time-code"
                />
                <div
                  className="grid grid-cols-6 gap-2"
                  onClick={() => document.getElementById('verificationCode')?.focus()}
                >
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                    const digit = verificationCode[index] || '';
                    const isActive = index === verificationCode.length;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => document.getElementById('verificationCode')?.focus()}
                        className={`h-14 rounded-2xl border text-lg font-black transition ${
                          digit
                            ? 'border-primary bg-primary/5 text-foreground'
                            : isActive
                            ? 'border-primary/50 bg-primary/5 text-foreground'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      >
                        {digit || ''}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">메일에 보이는 6자리 숫자를 그대로 입력해주세요. 메일이 없으면 스팸함도 확인해주세요.</p>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '인증 중...' : '인증 완료하기'}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? '인증 메일 다시 보내는 중...' : '인증 메일 다시 보내기'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
                setVerificationCode('');
              }}
              className="w-full text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              로그인 화면으로 돌아가기
            </button>
          </form>
        ) : isFindEmail ? (
          <form onSubmit={handleFindEmail} className="space-y-4">
            <div>
              <label htmlFor="lookupNickname" className="mb-1 block text-sm font-medium text-slate-700">
                가입한 닉네임
              </label>
              <input
                id="lookupNickname"
                type="text"
                value={lookupNickname}
                onChange={(event) => setLookupNickname(event.target.value.slice(0, NICKNAME_MAX_LENGTH))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="닉네임 입력"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '확인 중...' : '아이디 찾기'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
              className="w-full text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              로그인 화면으로 돌아가기
            </button>
          </form>
        ) : isResetRequest ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="resetEmail" className="mb-1 block text-sm font-medium text-slate-700">
                가입 이메일
              </label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="you@example.com"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '보내는 중...' : '비밀번호 재설정 메일 보내기'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
              className="w-full text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              로그인 화면으로 돌아가기
            </button>
          </form>
        ) : isResetPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                새 비밀번호
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="새 비밀번호를 입력하세요"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              </button>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                새 비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="새 비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
              </button>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '변경 중...' : '새 비밀번호 저장'}
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-slate-700">
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(event) => {
                  const nextValue = event.target.value.slice(0, NICKNAME_MAX_LENGTH);
                  setNickname(nextValue);
                  if (normalizeNickname(nextValue) !== nicknameCheckedValue) {
                    setNicknameCheckedValue('');
                    setNicknameCheckMessage('');
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="앱에서 표시될 이름"
                autoComplete="nickname"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={isCheckingNickname || !normalizedNickname}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCheckingNickname ? '확인 중...' : '닉네임 중복 확인'}
                </button>
                {isNicknameVerified ? (
                  <span className="text-xs font-semibold text-emerald-600">확인 완료</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">한글, 영문, 숫자, 밑줄(_) 가능 · {NICKNAME_MAX_LENGTH}자 이하</p>
              {nicknameCheckMessage ? <p className="mt-1 text-xs text-emerald-600">{nicknameCheckMessage}</p> : null}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              비밀번호
            </label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="비밀번호를 입력하세요"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            </button>
            {isSignUp ? (
              <p className="mt-1 text-xs text-slate-500">영문, 숫자, 특수문자를 포함한 8자 이상</p>
            ) : null}
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
              </button>
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? '처리 중...'
              : isSignUp
                ? '회원가입하기'
                : '로그인하기'}
          </button>

          {!isSignUp && resolvedVerificationEmail ? (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? '인증 메일 다시 보내는 중...' : '인증 메일 다시 보내기'}
            </button>
          ) : null}

          {!isSignUp ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('find-email');
                  setError('');
                  setMessage('');
                }}
                className="font-medium text-slate-500 hover:text-slate-700"
              >
                아이디 찾기
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset-request');
                  setError('');
                  setMessage('');
                }}
                className="font-medium text-slate-500 hover:text-slate-700"
              >
                비밀번호 찾기
              </button>
            </div>
          ) : null}
        </form>
        )}
      </div>
    </div>
  );
}
