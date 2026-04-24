import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Premium() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  return (
    <div className="min-h-[100dvh] bg-background px-5 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        <button onClick={handleGoBack} className="mb-6 inline-flex items-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>
        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-primary">Free launch</p>
        <h1 className="mt-2 text-2xl font-extrabold text-foreground">현재 버전은 무료로 제공돼요</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Google Play 출시 버전에서는 유료 구독과 인앱 상품을 운영하지 않습니다. 모든 학습 기능은 별도 결제 없이 이용할 수 있어요.
        </p>
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
          프리미엄 결제, 인앱 상품, 유료 코인팩은 이번 출시 범위에서 제외했습니다. 나중에 정책과 상품 구성이 확정되면 다시 켤 수 있습니다.
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
        >
          학습하러 가기
        </button>
      </div>
    </div>
  );
}
