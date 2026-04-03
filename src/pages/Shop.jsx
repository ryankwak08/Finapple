import { useState, useEffect } from 'react';
import { ShoppingBag, Zap, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProgress from '../lib/useProgress';


const ITEMS = [
  {
    id: 'chupa-chups-1',
    name: '츄파춥스 교환권',
    description: '편의점에서 츄파춥스 1개로 교환 가능한 기프트 교환권',
    emoji: '🍭',
    price: 5000,
    stock: 99,
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const { progress, reload } = useProgress();
  const [purchasing, setPurchasing] = useState(null);
  const [purchased, setPurchased] = useState([]);
  const [error, setError] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    setCheckingPremium(false);
  }, []);

  const xp = progress?.xp || 0;

  const handleBuy = async (item) => {
    if (xp < item.price) {
      setError(`XP가 부족합니다. ${item.price.toLocaleString()} XP가 필요해요.`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setPurchasing(item.id);
    try {
      const newXp = xp - item.price;
      const updated = { ...progress, xp: newXp };
      localStorage.setItem('finapple_progress', JSON.stringify(updated));
      await reload();
      setPurchased(prev => [...prev, item.id]);
    } catch (e) {
      setError('구매 중 오류가 발생했습니다.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setPurchasing(null);
    }
  };



  return (
    <div className="px-5 pt-4 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h1 className="text-[22px] font-extrabold text-foreground">XP 상점</h1>
      </div>
      <p className="text-muted-foreground text-[13px] mb-5">퀴즈로 쌓은 XP로 기프트 교환권을 구매하세요!</p>

      {/* XP Balance */}
      <div className="bg-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium">보유 XP</p>
          <p className="text-[20px] font-extrabold text-primary">{xp.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-[13px] rounded-xl px-4 py-3 mb-4 font-medium">
          {error}
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {ITEMS.map(item => {
          const canAfford = xp >= item.price;
          const isBought = purchased.includes(item.id);
          const isBuying = purchasing === item.id;

          return (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-[15px]">{item.name}</p>
                <p className="text-muted-foreground text-[12px] mt-0.5 leading-tight">{item.description}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-extrabold text-[13px]">{item.price.toLocaleString()} XP</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {isBought ? (
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                    <span className="text-[10px] text-green-600 font-semibold">구매완료</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || isBuying}
                    className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                      canAfford
                        ? 'bg-primary text-primary-foreground active:scale-95'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {isBuying ? '처리중...' : '구매'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 bg-muted/50 rounded-2xl px-4 py-3">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          📌 교환권 구매 후 관리자에게 문의하면 실물 상품으로 교환해 드립니다.<br/>
          퀴즈를 통과할 때마다 XP를 획득할 수 있어요!
        </p>
      </div>
    </div>
  );
}