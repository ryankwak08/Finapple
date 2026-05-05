import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Heart, Loader2, NotebookPen, ShieldCheck, Sparkles } from 'lucide-react';
import {
  createPremiumOrderId,
  createTossCheckoutSession,
  PREMIUM_MONTHLY_PRICE,
} from '@/api/paymentClient';
import { useAuth } from '@/lib/AuthContext';
import { getIsPremium } from '@/lib/premium';
import { arePaidProductsEnabled, isNativeAndroidApp, isNativeIOSApp } from '@/lib/runtimePlatform';

const formatKrw = (value) => new Intl.NumberFormat('ko-KR').format(value);

export default function Premium() {
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const paidProductsEnabled = arePaidProductsEnabled();
  const isPremium = getIsPremium(user);

  const benefits = useMemo(() => ([
    { icon: Heart, title: '무제한 하트', description: '하트 제한 없이 퀴즈를 이어서 풀 수 있어요.' },
    { icon: NotebookPen, title: '오답노트', description: '틀린 문제를 저장하고 다시 복습할 수 있어요.' },
    { icon: ShieldCheck, title: '스트릭 보호', description: 'Streak Freezer 3개와 자동 보호를 사용할 수 있어요.' },
    { icon: Sparkles, title: '전체 퀴즈 해금', description: '무료 한도 이후의 퀴즈와 해설까지 열립니다.' },
  ]), []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleStartCheckout = async () => {
    if (!isAuthenticated || !user?.email) {
      navigateToLogin();
      return;
    }

    setIsStartingCheckout(true);
    setCheckoutError('');

    const orderId = createPremiumOrderId();
    const displayName =
      user?.user_metadata?.nickname?.trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user.email.split('@')[0];

    const result = await createTossCheckoutSession({
      amount: PREMIUM_MONTHLY_PRICE,
      orderId,
      orderName: 'FinApple Premium Monthly',
      customerName: displayName,
      customerEmail: user.email,
    });

    if (!result.success) {
      setCheckoutError(result.error || '결제창을 열지 못했습니다.');
      setIsStartingCheckout(false);
      return;
    }

    window.location.assign(result.url);
  };

  return (
    <div className="min-h-[100dvh] bg-background px-5 py-8">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={handleGoBack}
          className="mb-6 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-primary">Premium</p>
              <h1 className="text-2xl font-extrabold text-foreground">프리미엄 시작하기</h1>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">월간 플랜</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">웹에서는 토스페이먼츠 카드 결제로 바로 활성화됩니다.</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-foreground">₩{formatKrw(PREMIUM_MONTHLY_PRICE)}</p>
                <p className="text-xs font-semibold text-muted-foreground">월</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{benefit.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-muted/60 p-4">
            {[
              '유닛당 무료 퀴즈 제한 해제',
              '퀴즈 해설과 오답 복습',
              '하트 제한 없이 학습',
              '광고 제거 및 스트릭 보호',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">{item}</span>
              </div>
            ))}
          </div>

          {!paidProductsEnabled ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              {isNativeAndroidApp()
                ? 'Android 앱에서는 현재 유료 상품을 열지 않습니다. 웹에서 결제를 진행해주세요.'
                : isNativeIOSApp()
                ? 'iOS 앱에서는 App Store 상품 설정 후 이용할 수 있습니다. 웹 결제를 이용해주세요.'
                : '현재 환경에서는 결제를 시작할 수 없습니다.'}
            </div>
          ) : isPremium ? (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="mt-6 w-full rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground"
            >
              이미 프리미엄 이용 중
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={isStartingCheckout}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow shadow-primary/20 active:scale-[0.98] disabled:opacity-70"
            >
              {isStartingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isStartingCheckout ? '결제창 여는 중' : '토스로 결제하기'}
            </button>
          )}

          {checkoutError ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {checkoutError}
            </p>
          ) : null}

          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            결제 완료 후 프리미엄 권한이 계정에 자동 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
