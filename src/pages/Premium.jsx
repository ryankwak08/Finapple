import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarDays, Check, Crown, Heart, Loader2, MessageCircle, NotebookPen, Palette, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { startPremiumFreeTrial } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';
import { isPremiumFreeTrialCampaignEnabled } from '@/lib/runtimePlatform';
import { PREMIUM_FEATURES } from '@/lib/premiumFeatures';

export default function Premium() {
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin, checkAppState } = useAuth();
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [trialError, setTrialError] = useState('');
  const [trialSuccess, setTrialSuccess] = useState('');
  const freeTrialActive = isPremiumFreeTrialCampaignEnabled();
  const isPremium = getIsPremium(user);
  const hasClaimedTrial = Boolean(user?.user_metadata?.premium_free_trial_claimed_at);

  useEffect(() => {
    void checkAppState();
  }, [checkAppState]);

  const benefits = useMemo(() => {
    const icons = {
      'ad-free': Ban,
      'unlimited-chat': MessageCircle,
      'unlimited-quiz': Heart,
      'review-explanations': NotebookPen,
      'character-customization': Palette,
    };

    return PREMIUM_FEATURES.map((feature) => ({
      ...feature,
      icon: icons[feature.id] || Sparkles,
    }));
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const handleStartFreeTrial = async () => {
    if (!isAuthenticated || !user?.email) {
      navigateToLogin();
      return;
    }

    setIsStartingTrial(true);
    setTrialError('');
    setTrialSuccess('');

    try {
      const result = await startPremiumFreeTrial();
      await checkAppState();
      window.dispatchEvent(new CustomEvent('premiumTrialStarted', { detail: { user: result.user } }));
      const expires = result.premiumExpiresAt
        ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(result.premiumExpiresAt))
        : '1개월 뒤';
      setTrialSuccess(`${expires}까지 프리미엄 무료체험이 적용됐어요.`);
    } catch (error) {
      setTrialError(error.message || '무료체험을 시작하지 못했습니다.');
    } finally {
      setIsStartingTrial(false);
    }
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

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-950">5월 1일 ~ 6월 1일 프리미엄 무료체험 이벤트</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  이벤트 기간 동안 신청하면 계정에 1개월 프리미엄 무료체험이 적용됩니다.
                </p>
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
              '광고 없는 학습 환경',
              '금융 챗봇 무제한 질문',
              '매일 하트 제한 없이 퀴즈 반복 풀이',
              '오답노트 상세 해설과 캐릭터 커스터마이징',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 py-1">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">{item}</span>
              </div>
            ))}
          </div>

          {trialSuccess ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
              {trialSuccess}
            </div>
          ) : null}

          {trialError ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {trialError}
            </p>
          ) : null}

          {isPremium || trialSuccess ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow shadow-primary/20 active:scale-[0.98]"
            >
              {trialSuccess ? '무료 체험으로 프리미엄 이용하기' : '프리미엄 이용 중'}
            </button>
          ) : hasClaimedTrial ? (
            <div className="mt-5 rounded-2xl border border-muted bg-muted/60 p-4 text-sm font-bold leading-6 text-muted-foreground">
              이미 무료체험을 신청한 계정입니다.
            </div>
          ) : freeTrialActive ? (
            <button
              type="button"
              onClick={handleStartFreeTrial}
              disabled={isStartingTrial}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow shadow-primary/20 active:scale-[0.98] disabled:opacity-70"
            >
              {isStartingTrial ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isStartingTrial ? '무료체험 등록 중' : '프리미엄 1개월 무료체험 시작하기'}
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
              현재 무료체험 신청 기간이 아닙니다. 결제는 잠시 중단되었습니다.
            </div>
          )}

          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            1개월 무료 체험 후 카드 등록 시 자동 결제 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
