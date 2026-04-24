import { useState } from 'react';
import { ShoppingBag, Zap, Snowflake, Gift } from 'lucide-react';
import useSoundEffects from '@/hooks/useSoundEffects';
import useProgress from '../lib/useProgress';
import { useLanguage } from '@/lib/i18n';
import { isFreePremiumAccessEnabled } from '@/lib/runtimePlatform';


const ITEMS = [
  {
    id: 'streak-freezer',
    name: 'Streak Freezer',
    nameEn: 'Streak Freezer',
    description: '하루 놓쳐도 연속 학습 기록을 지켜주는 아이템',
    descriptionEn: 'Protects your learning streak even if you miss a day.',
    emoji: '❄️',
    price: 1200,
    stock: 999,
    rewardType: 'streak_freezer',
    rewardValue: 1,
  },
  {
    id: 'chupa-chups-1',
    name: '츄파춥스 교환권',
    nameEn: 'Chupa Chups coupon',
    description: '편의점에서 츄파춥스 1개로 교환 가능한 기프트 교환권',
    descriptionEn: 'A gift coupon redeemable for one Chupa Chups at a convenience store.',
    emoji: '🍭',
    price: 5000,
    stock: 99,
  },
];

export default function Shop() {
  const { isEnglish } = useLanguage();
  const freePremiumAccess = isFreePremiumAccessEnabled();
  const { progress, purchaseShopItem, getInventoryCount } = useProgress();
  const { playSuccessSound } = useSoundEffects();
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const xp = progress?.xp || 0;

  const handleBuy = async (item) => {
    if (xp < item.price) {
      setError(isEnglish ? `Not enough XP. You need ${item.price.toLocaleString()} XP.` : `XP가 부족합니다. ${item.price.toLocaleString()} XP가 필요해요.`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setPurchasing(item.id);
    try {
      await purchaseShopItem(item);
      await playSuccessSound();
      setSuccess(isEnglish ? `${item.nameEn || item.name} purchased successfully!` : `${item.name} 구매 완료!`);
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError(e.message || (isEnglish ? 'Something went wrong during purchase.' : '구매 중 오류가 발생했습니다.'));
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
        <h1 className="text-[22px] font-extrabold text-foreground">{isEnglish ? 'XP Shop' : 'XP 상점'}</h1>
      </div>
      <p className="text-muted-foreground text-[13px] mb-5">{isEnglish ? 'Spend the XP you earned from quizzes on rewards.' : '퀴즈로 쌓은 XP로 기프트 교환권을 구매하세요!'}</p>

      {/* XP Balance */}
      <div className="bg-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground font-medium">{isEnglish ? 'Your XP' : '보유 XP'}</p>
          <p className="text-[20px] font-extrabold text-primary">{xp.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-[13px] rounded-xl px-4 py-3 mb-4 font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-100 text-emerald-700 text-[13px] rounded-xl px-4 py-3 mb-4 font-medium">
          {success}
        </div>
      )}

      <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
          <Snowflake className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <p className="text-[12px] text-sky-700 font-semibold">{isEnglish ? 'Freezers' : '보유 Freezer'}</p>
          <p className="text-[18px] font-extrabold text-sky-800">{isEnglish ? `${progress?.streak_freezers || 0}` : `${progress?.streak_freezers || 0}개`}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {ITEMS.map(item => {
          const canAfford = xp >= item.price;
          const isBuying = purchasing === item.id;
          const ownedCount = getInventoryCount(item.id);

          return (
            <div key={item.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-3xl flex-shrink-0">
                {item.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-[15px]">{isEnglish ? item.nameEn || item.name : item.name}</p>
                <p className="text-muted-foreground text-[12px] mt-0.5 leading-tight">{isEnglish ? item.descriptionEn || item.description : item.description}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-extrabold text-[13px]">{item.price.toLocaleString()} XP</span>
                </div>
                {ownedCount > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Gift className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-foreground">{isEnglish ? `Owned ${ownedCount}` : `보유 ${ownedCount}개`}</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
                    canAfford
                      ? 'bg-primary text-primary-foreground active:scale-95'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isBuying ? (isEnglish ? 'Buying...' : '처리중...') : (isEnglish ? 'Buy' : '구매')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 bg-muted/50 rounded-2xl px-4 py-3">
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          {isEnglish ? (
            <>
              📌 A Streak Freezer is consumed automatically when you miss a day to protect your streak.<br/>
              {freePremiumAccess ? '📌 Free launch access includes automatic streak protection.' : '📌 Premium includes 3 free Streak Freezers by default.'}<br/>
              📌 You earn XP whenever you pass a quiz!
            </>
          ) : (
            <>
              📌 Streak Freezer는 하루를 놓쳤을 때 자동으로 1개 소모되어 스트릭을 지켜줘요.<br/>
              {freePremiumAccess ? '📌 무료 출시 버전에서는 자동 스트릭 보호를 함께 이용할 수 있어요.' : '📌 프리미엄 구독 시 기본으로 3개가 지급돼요.'}<br/>
              📌 퀴즈를 통과할 때마다 XP를 획득할 수 있어요!
            </>
          )}
        </p>
      </div>
    </div>
  );
}
