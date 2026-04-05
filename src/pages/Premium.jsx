import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from '@/lib/AuthContext';
import {
  PREMIUM_MONTHLY_PRICE,
  createPremiumOrderId,
  createTossCheckoutSession,
  getBankTransferInstructions,
} from '@/api/paymentClient';

const isRunningInIframe = () => { try { return window.self !== window.top; } catch { return true; } };

export default function Premium() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('toss'); // 'toss' | 'kakao' | 'bank'

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleCheckout = async () => {
    if (isRunningInIframe()) {
      alert("결제는 배포된 앱에서만 이용 가능합니다. 앱을 publish 후 이용해주세요.");
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

      if (paymentMethod === 'kakao') {
        alert('카카오페이는 아직 승인 단계가 연결되지 않아, 지금은 토스 결제만 테스트할 수 있어요.');
        return;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error.message || "결제 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-12 pb-8 flex items-center gap-3">
        <button onClick={handleGoBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="font-extrabold text-foreground text-xl">프리미엄 구독</h1>
      </div>
      <div className="px-5 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎓</div>
          <h1 className="text-2xl font-bold text-foreground">프리미엄 구독</h1>
          <p className="text-muted-foreground mt-2">KDI 경제교육 모든 콘텐츠를 무제한으로</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-lg">
          <div className="flex items-end gap-1 mb-6">
            <span className="text-4xl font-bold text-foreground">₩9,900</span>
            <span className="text-muted-foreground mb-1">/월</span>
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

          <div className="space-y-3 mb-6">
            <label className="block text-sm font-semibold text-foreground mb-2">결제 방식 선택</label>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod('toss')}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                  paymentMethod === 'toss'
                    ? 'bg-primary text-primary-foreground border-2 border-primary'
                    : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
                }`}
              >
                💳 토스 페이
              </button>
              <button
                onClick={() => setPaymentMethod('kakao')}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                  paymentMethod === 'kakao'
                    ? 'bg-primary text-primary-foreground border-2 border-primary'
                    : 'bg-card border-2 border-border text-foreground hover:border-primary/50'
                }`}
              >
                👜 카카오 페이 (준비 중)
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

          <button
            onClick={handleCheckout}
            disabled={loading || paymentMethod === 'bank'}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl text-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {paymentMethod === 'bank' 
              ? "계좌이체 안내 보기" 
              : loading 
              ? "처리 중..." 
              : paymentMethod === 'kakao'
              ? "카카오페이 준비 중"
              : "지금 구독하기"}
          </button>

          {paymentMethod === 'bank' && (
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
            언제든 취소 가능 · 카드 결제 안전 보장
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
