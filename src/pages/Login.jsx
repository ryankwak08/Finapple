import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { findMaskedEmailByNickname, initializePasswordRecovery, requestPasswordReset, resendSignupConfirmation, signInWithEmail, signInWithOAuthProvider, signOut, signUpWithEmail, updatePassword, verifySignupEmailOtp } from '@/services/authService';
import { isNicknameAvailable } from '@/services/profileService';
import { NICKNAME_MAX_LENGTH, normalizeNickname, validateNickname, validatePassword } from '@/lib/profileRules';
import { useAuth } from '@/lib/AuthContext';

const OTP_LENGTH = 6;
const inputClassName = 'h-10 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 text-sm font-normal text-black outline-none transition placeholder:text-[#828282] focus:border-black/30';
const primaryButtonClassName = 'flex h-10 w-full items-center justify-center rounded-lg bg-black px-4 text-sm font-medium leading-[140%] text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName = 'flex h-10 w-full items-center justify-center rounded-lg border border-[#E0E0E0] bg-white px-4 text-sm font-medium text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';
const linkButtonClassName = 'font-medium text-[12px] text-black transition hover:opacity-70';
const socialButtonClassName = 'flex h-11 w-full items-center justify-center rounded-lg border border-[#DCDCDC] bg-white px-4 text-sm font-medium text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const POLICY_CONTENT = {
  terms: {
    title: '이용약관',
    effectiveDate: '2026년 4월 8일',
    paragraphs: [
      '본 약관은 Finapple(이하 "서비스")의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정합니다.',
      '이용자는 본 약관에 동의한 후 서비스를 이용할 수 있으며, 약관에 동의하지 않는 경우 서비스 가입 및 이용이 제한될 수 있습니다.',
      '서비스 제공자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 앱 또는 웹사이트를 통해 사전 고지합니다.',
      '이용자는 계정 정보를 안전하게 관리할 책임이 있으며, 계정 도용 또는 보안 문제를 인지한 경우 즉시 서비스 제공자에게 알려야 합니다.',
      '서비스 제공자는 안정적인 서비스 운영을 위해 시스템 점검, 업데이트, 정책 변경 등을 수행할 수 있습니다.',
      '이용자가 관련 법령 또는 본 약관을 위반하는 경우 서비스 이용이 제한되거나 계정이 정지될 수 있습니다.',
      '본 약관에 명시되지 않은 사항은 관계 법령 및 일반 상관례에 따릅니다.',
    ],
  },
  privacy: {
    title: '개인정보 처리방침',
    effectiveDate: '2026년 4월 8일',
    paragraphs: [
      'Finapple은 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 서비스에서 처리하는 개인정보 항목 및 이용 목적을 안내합니다.',
      '수집 항목: 이메일, 닉네임, 서비스 이용 기록(학습/퀴즈 진행 상태), 결제 상태(프리미엄 여부) 등 서비스 제공에 필요한 최소한의 정보.',
      '수집 목적: 회원 식별, 로그인 및 계정 관리, 학습 진도 저장, 고객 문의 대응, 서비스 품질 개선.',
      '보유 기간: 회원 탈퇴 시 지체 없이 파기하되, 관련 법령에 따라 보관이 필요한 정보는 해당 기간 동안 별도 보관합니다.',
      '제3자 제공: 원칙적으로 이용자 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령상 의무가 있는 경우 예외가 적용될 수 있습니다.',
      '이용자는 개인정보 열람, 정정, 삭제, 처리정지 요청 등 법령이 보장하는 권리를 행사할 수 있습니다.',
      '서비스는 개인정보 보호를 위해 접근 통제, 암호화, 권한 관리 등 안전성 확보 조치를 적용하기 위해 노력합니다.',
      '본 처리방침이 변경되는 경우 서비스 내 공지 또는 별도 고지를 통해 안내합니다.',
    ],
  },
};

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

function StatusMessage({ tone = 'neutral', children }) {
  if (!children) {
    return null;
  }

  const toneClassName = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-600'
    : tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-[#E0E0E0] bg-white text-[#828282]';

  return (
    <p className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${toneClassName}`}>
      {children}
    </p>
  );
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  helper,
  trailingAction,
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={inputClassName}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {trailingAction}
      {helper ? <p className="text-xs text-[#828282]">{helper}</p> : null}
    </div>
  );
}

function PolicyModal({ type, onClose }) {
  if (!type) {
    return null;
  }

  const content = POLICY_CONTENT[type];
  if (!content) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-black">{content.title}</h2>
            <p className="text-xs text-[#707070]">시행일: {content.effectiveDate}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-[#666] transition hover:bg-slate-100 hover:text-black"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[calc(88vh-76px)] overflow-y-auto px-5 py-4">
          <div className="space-y-4 text-sm leading-relaxed text-[#2D2D2D]">
            {content.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
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
  const [isSocialLoading, setIsSocialLoading] = useState('');
  const [policyModalType, setPolicyModalType] = useState(null);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    marketing: false,
  });
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
  const isDefaultSignIn = mode === 'signin';
  const areRequiredAgreementsChecked = agreements.terms && agreements.privacy && agreements.age;

  const toggleAgreement = (key) => {
    setAgreements((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSocialSignIn = async (provider) => {
    setError('');
    setMessage('');
    setIsSocialLoading(provider);

    try {
      await signInWithOAuthProvider(provider);
    } catch (socialError) {
      setError(socialError.message || '소셜 로그인 중 오류가 발생했습니다.');
      setIsSocialLoading('');
    }
  };

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

      if (!areRequiredAgreementsChecked) {
        setError('회원가입을 위해 필수 약관에 동의해주세요.');
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

        await signUpWithEmail(email, password, nickname, {
          termsAgreedAt: new Date().toISOString(),
          privacyAgreedAt: new Date().toISOString(),
          ageConfirmedAt: new Date().toISOString(),
          marketingOptIn: agreements.marketing,
        });
        setVerificationEmail(email);
        setMessage(`${email}로 인증 코드 메일을 보냈어요.`);
        setMode('verify');
        setNickname('');
        setNicknameCheckedValue('');
        setNicknameCheckMessage('');
        setConfirmPassword('');
        setPassword('');
        setAgreements({
          terms: false,
          privacy: false,
          age: false,
          marketing: false,
        });
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
    <>
      <PolicyModal type={policyModalType} onClose={() => setPolicyModalType(null)} />
      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f6f7fb_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_0%,_rgba(0,0,0,0)_70%)]" />
      <div className="mx-auto flex min-h-[812px] w-full max-w-[1200px] items-center justify-center">
        <div className={`w-full rounded-[30px] border border-black/5 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] ${isDefaultSignIn ? 'overflow-hidden md:grid md:grid-cols-[1.08fr_0.92fr]' : 'mx-auto max-w-[540px] p-4 md:p-6'}`}>
          {isDefaultSignIn ? (
            <section className="relative hidden md:flex md:flex-col md:justify-between md:bg-[linear-gradient(160deg,#F4F5F7_0%,#ECEFF2_100%)] md:p-10 lg:p-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B5B5B]">Finapple</p>
                <h1 className="mt-4 text-[44px] font-semibold leading-[120%] tracking-[-1.2px] text-black">
                  금융 공부,
                  <br />
                  더 쉽고 즐겁게.
                </h1>
                <p className="mt-5 text-base leading-relaxed text-[#4F4F4F]">
                  매일 조금씩 배우는 금융 상식.
                  <br />
                  Finapple과 함께 시작해보세요.
                </p>
              </div>
              <div className="mt-12 rounded-[24px] border border-black/5 bg-white/60 p-8 shadow-[0_16px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
                <img
                  src="/login-pineapple.png"
                  alt=""
                  className="mx-auto h-auto w-[220px] lg:w-[260px]"
                />
              </div>
            </section>
          ) : null}
          <div className={`w-full ${isDefaultSignIn ? 'mx-auto max-w-[375px] px-4 py-6 md:max-w-none md:px-8 md:py-10 lg:px-12' : 'mx-auto max-w-[420px] px-1 py-2 md:max-w-none md:px-4 md:py-6'}`}>
          {isDefaultSignIn ? (
            <div className="text-center md:hidden">
              <h1 className="mx-auto flex w-full flex-col justify-center text-center text-[32px] font-semibold leading-[140%] tracking-[-0.64px] text-black">
                <span className="whitespace-nowrap">Finapple에 오신 것을</span>
                <span>환영합니다</span>
              </h1>
              <img
                src="/login-pineapple.png"
                alt=""
                className="mx-auto mt-10 h-auto w-[196px]"
              />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#828282]">Finapple</p>
              <h1 className="mt-3 text-[28px] font-semibold leading-[140%] tracking-[-0.56px] text-black">
                {isSignUp
                  ? '회원가입'
                  : isVerify
                  ? '이메일 인증'
                  : isFindEmail
                  ? '아이디 찾기'
                  : isResetRequest
                  ? '비밀번호 찾기'
                  : '비밀번호 재설정'}
              </h1>
            </div>
          )}

          {authError?.type === 'email_not_verified' ? (
            <div className="mt-6">
              <StatusMessage tone="success">{authError.message}</StatusMessage>
            </div>
          ) : null}

          {isVerify ? (
            <form onSubmit={handleVerifyCode} className="mt-10 space-y-4">
              <StatusMessage>{resolvedVerificationEmail || '가입한 이메일'}</StatusMessage>

              <div>
                <label htmlFor="verificationCode" className="sr-only">
                  6자리 인증 코드
                </label>
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
                        className={`h-12 rounded-lg border text-base font-semibold transition ${
                          digit
                            ? 'border-black bg-black/5 text-black'
                            : isActive
                            ? 'border-black/40 bg-black/5 text-black'
                            : 'border-[#E0E0E0] bg-white text-[#828282]'
                        }`}
                      >
                        {digit || ''}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-[#828282]">메일에 보이는 6자리 숫자를 그대로 입력해주세요.</p>
              </div>

              <StatusMessage tone="error">{error}</StatusMessage>
              <StatusMessage tone="success">{message}</StatusMessage>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClassName}
              >
                {isSubmitting ? '인증 중...' : '인증 완료하기'}
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className={secondaryButtonClassName}
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
                className="w-full pt-2 text-center text-sm font-medium text-[#828282] transition hover:text-black"
              >
                로그인 화면으로 돌아가기
              </button>
            </form>
          ) : isFindEmail ? (
            <form onSubmit={handleFindEmail} className="mt-10 space-y-4">
              <AuthField
                id="lookupNickname"
                label="가입한 닉네임"
                type="text"
                value={lookupNickname}
                onChange={(event) => setLookupNickname(event.target.value.slice(0, NICKNAME_MAX_LENGTH))}
                placeholder="닉네임 입력"
                autoComplete="nickname"
              />

              <StatusMessage tone="error">{error}</StatusMessage>
              <StatusMessage tone="success">{message}</StatusMessage>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClassName}
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
                className="w-full pt-2 text-center text-sm font-medium text-[#828282] transition hover:text-black"
              >
                로그인 화면으로 돌아가기
              </button>
            </form>
          ) : isResetRequest ? (
            <form onSubmit={handleRequestReset} className="mt-10 space-y-4">
              <AuthField
                id="resetEmail"
                label="가입 이메일"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="이메일"
                autoComplete="email"
              />

              <StatusMessage tone="error">{error}</StatusMessage>
              <StatusMessage tone="success">{message}</StatusMessage>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClassName}
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
                className="w-full pt-2 text-center text-sm font-medium text-[#828282] transition hover:text-black"
              >
                로그인 화면으로 돌아가기
              </button>
            </form>
          ) : isResetPassword ? (
            <form onSubmit={handleResetPassword} className="mt-10 space-y-4">
              <AuthField
                id="password"
                label="새 비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="새 비밀번호를 입력하세요"
                autoComplete="new-password"
                trailingAction={(
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#828282] transition hover:text-black"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  </button>
                )}
              />

              <AuthField
                id="confirmPassword"
                label="새 비밀번호 확인"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요"
                autoComplete="new-password"
                trailingAction={(
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#828282] transition hover:text-black"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                  </button>
                )}
              />

              <StatusMessage tone="error">{error}</StatusMessage>
              <StatusMessage tone="success">{message}</StatusMessage>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClassName}
              >
                {isSubmitting ? '변경 중...' : '새 비밀번호 저장'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className={`space-y-4 ${isDefaultSignIn ? 'mt-14 md:mt-6 lg:mt-8' : 'mt-10'}`}>
              {isSignUp ? (
                <AuthField
                  id="nickname"
                  label="닉네임"
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
                  placeholder="닉네임"
                  autoComplete="nickname"
                  helper={`한글, 영문, 숫자, 밑줄(_) 가능 · ${NICKNAME_MAX_LENGTH}자 이하`}
                  trailingAction={(
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCheckNickname}
                        disabled={isCheckingNickname || !normalizedNickname}
                        className="rounded-lg border border-[#E0E0E0] px-3 py-2 text-xs font-medium text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCheckingNickname ? '확인 중...' : '닉네임 중복 확인'}
                      </button>
                      {isNicknameVerified ? <span className="text-xs font-medium text-emerald-600">확인 완료</span> : null}
                    </div>
                  )}
                />
              ) : null}

              {isSignUp ? (
                <div className="space-y-3 rounded-xl border border-[#E7E7E7] bg-[#FAFAFA] p-4">
                  <div className="flex items-start gap-2">
                    <input
                      id="agreement-terms"
                      type="checkbox"
                      checked={agreements.terms}
                      onChange={() => toggleAgreement('terms')}
                      className="mt-0.5 h-4 w-4 rounded border-[#CFCFCF] text-black focus:ring-black"
                    />
                    <label htmlFor="agreement-terms" className="text-sm text-black">
                      [필수] 이용약관 동의
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      id="agreement-privacy"
                      type="checkbox"
                      checked={agreements.privacy}
                      onChange={() => toggleAgreement('privacy')}
                      className="mt-0.5 h-4 w-4 rounded border-[#CFCFCF] text-black focus:ring-black"
                    />
                    <label htmlFor="agreement-privacy" className="text-sm text-black">
                      [필수] 개인정보 처리방침 동의
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      id="agreement-age"
                      type="checkbox"
                      checked={agreements.age}
                      onChange={() => toggleAgreement('age')}
                      className="mt-0.5 h-4 w-4 rounded border-[#CFCFCF] text-black focus:ring-black"
                    />
                    <label htmlFor="agreement-age" className="text-sm text-black">
                      [필수] 만 14세 이상입니다.
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      id="agreement-marketing"
                      type="checkbox"
                      checked={agreements.marketing}
                      onChange={() => toggleAgreement('marketing')}
                      className="mt-0.5 h-4 w-4 rounded border-[#CFCFCF] text-black focus:ring-black"
                    />
                    <label htmlFor="agreement-marketing" className="text-sm text-[#5F5F5F]">
                      [선택] 이벤트/마케팅 정보 수신 동의
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#6D6D6D]">
                    <button
                      type="button"
                      onClick={() => setPolicyModalType('terms')}
                      className="underline underline-offset-2 hover:text-black"
                    >
                      이용약관 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setPolicyModalType('privacy')}
                      className="underline underline-offset-2 hover:text-black"
                    >
                      개인정보 처리방침 보기
                    </button>
                  </div>
                </div>
              ) : null}

              <AuthField
                id="email"
                label="이메일"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="이메일"
                autoComplete="email"
              />

              <AuthField
                id="password"
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                helper={isSignUp ? '영문, 숫자, 특수문자를 포함한 8자 이상' : undefined}
                trailingAction={(
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#828282] transition hover:text-black"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  </button>
                )}
              />

              {isSignUp ? (
                <AuthField
                  id="confirmPassword"
                  label="비밀번호 확인"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호 확인"
                  autoComplete="new-password"
                  trailingAction={(
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#828282] transition hover:text-black"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                    </button>
                  )}
                />
              ) : null}

              {nicknameCheckMessage ? <StatusMessage tone="success">{nicknameCheckMessage}</StatusMessage> : null}
              <StatusMessage tone="error">{error}</StatusMessage>
              <StatusMessage tone="success">{message}</StatusMessage>

              <div className="relative">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={primaryButtonClassName}
                >
                  {isSubmitting
                    ? '처리 중...'
                    : isSignUp
                    ? '회원가입하기'
                    : '로그인하기'}
                </button>
              </div>
              {isDefaultSignIn ? (
                <>
                  <div className="flex items-center gap-4 pt-4">
                    <div className="h-px flex-1 bg-[#E0E0E0]" />
                    <span className="text-center text-sm font-normal leading-[140%] text-[#828282]">또는</span>
                    <div className="h-px flex-1 bg-[#E0E0E0]" />
                  </div>

                  <div className="space-y-2 pt-3">
                    <button
                      type="button"
                      onClick={() => handleSocialSignIn('google')}
                      disabled={isSocialLoading.length > 0}
                      className={socialButtonClassName}
                    >
                      {isSocialLoading === 'google' ? '구글 로그인 연결 중...' : '구글로 로그인'}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-5 pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('find-email');
                        setError('');
                        setMessage('');
                      }}
                      className={`${linkButtonClassName} font-['IBM_Plex_Sans_JP',sans-serif]`}
                    >
                      아이디 찾기
                    </button>
                    <span className="text-sm text-black">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset-request');
                        setError('');
                        setMessage('');
                      }}
                      className={`${linkButtonClassName} font-['IBM_Plex_Sans_JP',sans-serif]`}
                    >
                      비밀번호 찾기
                    </button>
                    <span className="text-sm text-black">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setError('');
                        setMessage('');
                        setVerificationCode('');
                      }}
                      className={`${linkButtonClassName} font-['IBM_Plex_Sans_JP',sans-serif]`}
                    >
                      회원가입
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError('');
                      setMessage('');
                      setVerificationCode('');
                    }}
                    className="font-medium text-[#828282] transition hover:text-black"
                  >
                    로그인
                  </button>
                  <span className="text-[#828282]">/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError('');
                      setMessage('');
                      setVerificationCode('');
                    }}
                    className="font-medium text-[#828282] transition hover:text-black"
                  >
                    회원가입
                  </button>
                </div>
              )}
            </form>
          )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
