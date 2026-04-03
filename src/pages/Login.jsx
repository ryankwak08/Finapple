import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail } from '@/services/authService';
import { useAuth } from '@/lib/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isSignUp = mode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isSignUp) {
        await signUpWithEmail(email, password);
        setMessage('회원가입이 완료되었습니다. 이메일 인증이 필요할 수 있습니다.');
        setMode('signin');
        setConfirmPassword('');
      } else {
        await signInWithEmail(email, password);
        await checkAppState();
        navigate('/');
      }
    } catch (submitError) {
      console.error('Login submit failed:', submitError);
      setError(submitError.message || '로그인 처리 중 오류가 발생했습니다.');
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

        <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setMessage('');
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
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
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="비밀번호를 입력하세요"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="비밀번호를 다시 입력하세요"
                autoComplete="new-password"
              />
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
        </form>
      </div>
    </div>
  );
}
