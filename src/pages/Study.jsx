import { lifeStudyTopics } from '../lib/studyData';
import TopicCard from '../components/study/TopicCard';
import useProgress from '../lib/useProgress';
import PullToRefresh from '../components/PullToRefresh';
import { Star, Flame, Snowflake } from 'lucide-react';
import PremiumBadge from '@/components/PremiumBadge';

export default function Study() {
  const { progress, loading, user, isPremium, getStreakStatus } = useProgress();
  const streakStatus = getStreakStatus();
  const displayName =
    user?.user_metadata?.nickname?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    '학습자';

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800));
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">생활 금융 가이드</h1>
          {!loading && progress && (
            <div className="flex items-center gap-1.5 bg-accent/15 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[13px] font-bold text-accent-foreground">{progress.xp || 0} XP</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-[14px]">
          사회초년생이 실제로 자주 부딪히는 돈 문제를 먼저 정리해뒀어요
        </p>
      </div>

      {/* Greeting */}
      {!loading && user && (
        <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/10 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] text-foreground">
                <span className="font-bold">{displayName}</span>님, 환영합니다! 👋
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                오늘 하나만 읽어도 다음 선택이 훨씬 쉬워져요
              </p>
            </div>
            {isPremium && <PremiumBadge compact />}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[12px] font-semibold text-foreground">현재 스트릭</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{streakStatus.streakCount}일</p>
              <p className="text-[11px] text-muted-foreground">최고 {streakStatus.bestStreak}일</p>
            </div>
            <div className="rounded-xl bg-background/80 border border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-sky-500" />
                <span className="text-[12px] font-semibold text-foreground">Freezer</span>
              </div>
              <p className="mt-1 text-[20px] font-extrabold text-foreground">{streakStatus.streakFreezers}개</p>
              <p className="text-[11px] text-muted-foreground">
                {isPremium ? '하루 놓쳐도 스트릭을 지켜줘요' : '프리미엄에서 이용 가능'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Topics */}
      <div className="space-y-4">
        {lifeStudyTopics.map((topic, i) => (
          <TopicCard key={topic.id} topic={topic} index={i} />
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}
