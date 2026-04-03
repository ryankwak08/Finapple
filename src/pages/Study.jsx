import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { studyTopics } from '../lib/studyData';
import TopicCard from '../components/study/TopicCard';
import useProgress from '../lib/useProgress';
import CourseSelector from '../components/CourseSelector';
import PullToRefresh from '../components/PullToRefresh';
import { Star, ChevronRight } from 'lucide-react';

export default function Study() {
  const location = useLocation();
  const { progress, loading, user } = useProgress();
  const [selectedCourse, setSelectedCourse] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') || null;
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelectedCourse(params.get('course') || null);
  }, [location.search]);

  useEffect(() => {
    const handleTabReset = (event) => {
      if (event.detail?.tabRoot !== '/') return;
      setSelectedCourse(null);
      window.history.replaceState({}, '', '/');
    };

    window.addEventListener('bottomNavReset', handleTabReset);
    return () => window.removeEventListener('bottomNavReset', handleTabReset);
  }, []);

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    window.history.replaceState({}, '', `/?course=${course}`);
  };

  const handleBack = () => {
    setSelectedCourse(null);
    window.history.replaceState({}, '', '/');
  };

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800));
  };

  if (!selectedCourse) {
    return <CourseSelector type="study" onSelect={handleSelectCourse} />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="px-5 pt-14 pb-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">청년기 편</h1>
          </div>
          {!loading && progress && (
            <div className="flex items-center gap-1.5 bg-accent/15 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[13px] font-bold text-accent-foreground">{progress.xp || 0} XP</span>
            </div>
          )}
        </div>
        <p className="text-muted-foreground text-[14px]">
          KDI 경제교육 자료를 기반으로 학습해요
        </p>
      </div>

      {/* Greeting */}
      {!loading && user && (
        <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/10 animate-slide-up">
          <p className="text-[14px] text-foreground">
            <span className="font-bold">{user.full_name || '학습자'}</span>님, 환영합니다! 👋
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            오늘도 경제 지식을 쌓아봐요
          </p>
        </div>
      )}

      {/* Topics */}
      <div className="space-y-4">
        {studyTopics.map((topic, i) => (
          <TopicCard key={topic.id} topic={topic} index={i} course={selectedCourse} />
        ))}
      </div>
    </div>
    </PullToRefresh>
  );
}
