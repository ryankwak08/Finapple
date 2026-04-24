import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import {
  PREMIUM_MONTHLY_PRICE,
  PREMIUM_ANNUAL_PRICE,
  createPremiumOrderId,
  createTossCheckoutSession,
  getBankTransferInstructions,
} from '@/api/paymentClient';
import { isNativeIOSApp } from '@/lib/runtimePlatform';
import {
  canUseRevenueCat,
  getRevenueCatPaywall,
  hasActivePremiumEntitlement,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '@/services/revenueCatService';

const isRunningInIframe = () => { try { return window.self !== window.top; } catch { return true; } };

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('toss'); // 'toss' | 'bank'
  const [iosPackage, setIosPackage] = useState(null);
  const [iosPackages, setIosPackages] = useState({ monthly: null, annual: null });
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [iosError, setIosError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const nativeIOS = isNativeIOSApp();
  const revenueCatEnabled = canUseRevenueCat();
  const selectedFallbackPrice = selectedPlan === 'annual'
    ? `₩${PREMIUM_ANNUAL_PRICE.toLocaleString()}`
    : `₩${PREMIUM_MONTHLY_PRICE.toLocaleString()}`;
  const selectedBillingPeriodLabel = selectedPlan === 'annual' ? '/년' : '/월';
  const activePackageType = iosPackage?.packageType === 'ANNUAL' ? 'annual' : 'monthly';
  const displayPlan = nativeIOS
    ? (iosPackage ? activePackageType : selectedPlan)
    : 'monthly';
  const priceLabel = nativeIOS
    ? (iosPackage?.product?.priceString || selectedFallbackPrice)
    : `₩${PREMIUM_MONTHLY_PRICE.toLocaleString()}`;
  const billingPeriodLabel = nativeIOS
    ? (iosPackage?.packageType === 'ANNUAL' ? '/년' : selectedBillingPeriodLabel)
    : '/월';
  const titleLabel = nativeIOS
    ? (displayPlan === 'annual' ? 'App Store 연간 구독' : 'App Store 월간 구독')
    : '프리미엄 구독';
  const hasPremiumAccess = Boolean(user?.user_metadata?.is_premium || user?.is_premium);

  useEffect(() => {
    if (!nativeIOS) {
      return;
    }

    let cancelled = false;

    const loadPaywall = async () => {
      if (!revenueCatEnabled) {
        setIosError('RevenueCat iOS 키가 아직 설정되지 않았어요. App Store Connect와 RevenueCat 설정을 먼저 연결해주세요.');
        return;
      }

      try {
        setIosError('');
        const paywall = await getRevenueCatPaywall(user);
        if (!cancelled) {
          const nextMonthlyPackage = paywall?.monthlyPackage || null;
          const nextAnnualPackage = paywall?.annualPackage || null;
          const nextSelectedPackage = paywall?.selectedPackage || null;
          setIosPackages({
            monthly: nextMonthlyPackage,
            annual: nextAnnualPackage,
          });
          setIosPackage(nextSelectedPackage);
          if (nextSelectedPackage?.packageType === 'ANNUAL') {
            setSelectedPlan('annual');
          } else if (nextSelectedPackage || nextMonthlyPackage) {
            setSelectedPlan('monthly');
          } else if (nextAnnualPackage) {
            setSelectedPlan('annual');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setIosError(error.message || '인앱 구독 상품을 불러오지 못했습니다.');
        }
      }
    };

    void loadPaywall();

    return () => {
      cancelled = true;
    };
  }, [nativeIOS, revenueCatEnabled, user]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCheckout = async () => {
    if (nativeIOS) {
      if (!revenueCatEnabled) {
        alert('RevenueCat iOS 설정이 아직 완료되지 않았습니다. 환경변수와 App Store Connect 상품을 먼저 연결해주세요.');
        return;
      }

      setLoading(true);
      try {
        await purchaseRevenueCatPackage({ user, aPackage: iosPackage });
        alert('인앱 구독이 반영되었습니다. 프리미엄 권한을 확인해보세요.');
      } catch (error) {
        if (error?.userCancelled) {
          return;
        }

        console.error('iOS subscription failed:', error);
        alert(error.message || '인앱 구독 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRunningInIframe()) {
      alert("결제는 배포된 앱에서만 이용 가능합니다. 앱을 publish 후 이용해주세요.");
      return;
    }

    if (paymentMethod === 'bank') {
      return;
    }

    setLoading(true);
    try {
      const customerName = user?.user_metadata?.full_name || user?.user_metadata?.nickname || user?.email || 'Finapple User';

      if (paymentMethod === 'toss') {
        const response = await createTossCheckoutSession({
          amount: PREMIUM_MONTHLY_PRICE,
          orderId: createPremiumOrderId(),
          orderName: 'Finapple 프리미엄',
          customerName,
          customerEmail: user?.email || undefined,
        });

        if (response.success && response.url) {
          window.location.href = response.url;
          return;
        }

        throw new Error(response.error || '결제 세션 생성 실패');
      }

    } catch (error) {
      console.error("Checkout error:", error);
      alert(error.message || "결제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    setRestoring(true);
    try {
      const customerInfo = await restoreRevenueCatPurchases(user);
      if (hasActivePremiumEntitlement(customerInfo)) {
        alert('기존 구독을 복원했어요. 프리미엄 권한이 다시 적용됩니다.');
      } else {
        alert('복원 가능한 활성 구독을 찾지 못했습니다.');
      }
    } catch (error) {
      console.error('Restore purchases failed:', error);
      alert(error.message || '구독 복원 중 오류가 발생했습니다.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="px-5 pt-12 pb-8 flex items-center gap-3">
        <button onClick={handleGoBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="font-extrabold text-foreground text-xl">프리미엄 구독</h1>
      </div>
      <div className="px-5 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-2xl font-bold text-foreground">{titleLabel}</h1>
          <p className="text-muted-foreground mt-2">KDI 경제교육 모든 콘텐츠를 무제한으로</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          {nativeIOS ? (
            <div className="mb-6 grid grid-cols-2 gap-3">
              {[
                {
                  key: 'monthly',
                  label: '월간',
                  subLabel: '/월',
                  aPackage: iosPackages.monthly,
                },
                {
                  key: 'annual',
                  label: '연간',
                  subLabel: '/년',
                  aPackage: iosPackages.annual,
                },
              ].map(({ key, label, subLabel, aPackage }) => {
                const active = displayPlan === key;
                const fallbackPrice = key === 'annual'
                  ? `₩${PREMIUM_ANNUAL_PRICE.toLocaleString()}`
                  : `₩${PREMIUM_MONTHLY_PRICE.toLocaleString()}`;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(key);
                      if (aPackage) {
                        setIosPackage(aPackage);
                      } else {
                        setIosPackage(null);
                      }
                    }}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background'
                    } active:scale-[0.98]`}
                  >
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="mt-2 text-xl font-extrabold text-foreground">
                      {aPackage?.product?.priceString || fallbackPrice}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-bold text-foreground">{priceLabel}</span>
            <span className="text-muted-foreground mb-1">{billingPeriodLabel}</span>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              "✅ 모든 단원 학습 자료 무제한 열람",
              "✅ 800+ 경제 용어 사전 전체 이용",
              "✅ 무한 하트와 광고 제거",
              "✅ 퀴즈 해설, 진도 확인, 오답노트",
              "✅ Streak Freezer와 연속 학습 관리",
              "✅ 틀린 문제 다시 풀기",
            ].map((item, i) => (
              <li key={i} className="text-foreground text-sm">{item}</li>
            ))}
          </ul>

          {nativeIOS ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">iOS 앱 결제 안내</p>
              <p className="mt-2 leading-relaxed">
                프리미엄은 디지털 학습 콘텐츠 해금 상품이라 iPhone 앱에서는 외부 결제 대신 App Store 인앱 구독을 사용해야 합니다.
                RevenueCat로 App Store 구독을 연결했고, 현재 상품 조회와 구매/복원 흐름을 이 화면에서 사용합니다.
              </p>
              {iosPackage?.product?.title ? (
                <p className="mt-2 text-xs text-amber-800">
                  상품: {iosPackage.product.title}
                </p>
              ) : null}
              {iosPackage?.packageType ? (
                <p className="mt-1 text-xs text-amber-800">
                  선택한 플랜: {iosPackage.packageType === 'ANNUAL' ? '연간 구독' : '월간 구독'}
                </p>
              ) : nativeIOS ? (
                <p className="mt-1 text-xs text-amber-800">
                  선택한 플랜: {selectedPlan === 'annual' ? '연간 구독' : '월간 구독'}
                </p>
              ) : null}
              {iosError ? (
                <p className="mt-2 text-xs text-red-700">{iosError}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-semibold text-foreground mb-2">결제 수단 선택</label>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod('toss')}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    paymentMethod === 'toss'
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  💳 토스페이먼츠 결제
                </button>
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-primary text-primary-foreground border-2 border-primary'
                      : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  🏦 계좌이체
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || hasPremiumAccess || (nativeIOS && (!revenueCatEnabled || !iosPackage))}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {nativeIOS
              ? loading
                ? '구독 처리 중...'
                : hasPremiumAccess
                ? '이미 프리미엄 이용 중'
                : displayPlan === 'annual'
                ? 'App Store로 연간 구독하기'
                : 'App Store로 월간 구독하기'
              : paymentMethod === 'bank' 
              ? "계좌이체 안내 보기" 
              : loading 
              ? "처리 중..." 
              : "토스페이먼츠로 결제하기"}
          </button>

          {nativeIOS ? (
            <button
              onClick={handleRestorePurchases}
              disabled={restoring || !revenueCatEnabled}
              className="mt-3 w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {restoring ? '구독 복원 중...' : '기존 구독 복원'}
            </button>
          ) : null}

          {!nativeIOS && paymentMethod === 'bank' && (
            <div className="mt-6 p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-600">
              <strong className="text-sm text-foreground">계좌이체 선결제</strong>
              <p className="mt-2">아래 정보를 통해 지정된 은행 계좌로 금액을 송금하세요. 송금 완료 후 고객센터에 등록하시면 프리미엄 계정으로 즉시 전환됩니다.</p>
              {(() => {
                const bank = getBankTransferInstructions();
                return (
                  <ul className="mt-2 space-y-1">
                    <li>은행명: {bank.bankName}</li>
                    <li>계좌번호: {bank.accountNumber}</li>
                    <li>예금주: {bank.accountHolder}</li>
                    <li>금액: {bank.amount.toLocaleString()}원</li>
                    <li>입금 메시지: {bank.message}</li>
                  </ul>
                );
              })()}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-3">
            {nativeIOS ? '구독 변경과 취소는 App Store 구독 관리에서 진행할 수 있어요.' : '웹에서는 토스페이먼츠 결제와 계좌이체 안내를 제공합니다.'}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
