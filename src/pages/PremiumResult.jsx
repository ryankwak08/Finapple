import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { confirmTossPayment, PREMIUM_MONTHLY_PRICE } from '@/api/paymentClient';

const contentByStatus = {
  success: {
    title: '결제 승인을 확인하고 있어요',
    description: '결제가 완료되면 프리미엄 권한을 바로 반영합니다.',
    tone: 'success',
  },
  fail: {
    title: '결제가 완료되지 않았어요',
    description: '결제 과정에서 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    tone: 'error',
  },
  cancel: {
    title: '결제가 취소되었어요',
    description: '원하실 때 다시 프리미엄 구독을 진행할 수 있습니다.',
    tone: 'error',
  },
};

export default function PremiumResult({ status = 'success' }) {
  const location = useLocation();
  const [isUpdating, setIsUpdating] = useState(status === 'success');
  const [updateError, setUpdateError] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (status !== 'success') return;

    let isMounted = true;

    const activatePremium = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const paymentKey = params.get('paymentKey');
        const orderId = params.get('orderId');
        const amount = Number(params.get('amount'));
        const provider = params.get('provider');

        if (provider === 'kcp') {
          setIsDone(true);
          return;
        }

        if (provider !== 'toss') {
          throw new Error('지원하지 않는 결제 공급자입니다.');
        }

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 확인에 필요한 정보가 누락되었습니다.');
        }

        if (amount !== PREMIUM_MONTHLY_PRICE) {
          throw new Error('결제 금액이 예상 값과 다릅니다. 다시 시도해주세요.');
        }

        await confirmTossPayment({ paymentKey, orderId, amount });
        if (!isMounted) return;
        setIsDone(true);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to activate premium:', error);
        setUpdateError(error.message || '결제 승인 또는 프리미엄 권한 반영에 실패했습니다.');
      } finally {
        if (isMounted) {
          setIsUpdating(false);
        }
      }
    };

    activatePremium();

    return () => {
      isMounted = false;
    };
  }, [location.search, status]);

  const content = contentByStatus[status] || contentByStatus.fail;
  const params = new URLSearchParams(location.search);
  const provider = params.get('provider');
  const orderId = params.get('orderId');

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-sm">
          <div className="mb-5 flex justify-center">
            {content.tone === 'success' ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <AlertCircle className="h-8 w-8 text-rose-600" />
              </div>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground">{content.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content.description}</p>
          </div>

          {(provider || orderId) && (
            <div className="mt-5 rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              {provider ? <p>결제 수단: {provider}</p> : null}
              {orderId ? <p>주문 번호: {orderId}</p> : null}
            </div>
          )}

          {status === 'success' && (
            <div className="mt-5 rounded-2xl border border-border px-4 py-3 text-sm">
              {isUpdating ? (
                <div className="flex items-center gap-2 text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>결제를 승인하고 프리미엄 권한을 반영하는 중입니다.</span>
                </div>
              ) : updateError ? (
                <p className="text-amber-700">{updateError}</p>
              ) : isDone ? (
                <p className="text-emerald-700">결제 승인이 완료되었고, 계정에 프리미엄 권한이 반영되었습니다.</p>
              ) : (
                <p className="text-foreground">처리 결과를 확인해주세요.</p>
              )}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Link
              to="/profile"
              className="block w-full rounded-2xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
            >
              프로필로 이동
            </Link>
            <Link
              to="/"
              className="block w-full rounded-2xl border border-border py-3 text-center text-sm font-semibold text-foreground"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
