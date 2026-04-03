import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/services/authService';
import { getIsPremium } from '@/lib/premium';

const TODAY = () => new Date().toISOString().split('T')[0];

const shouldResetHearts = (lastReset) => {
  if (!lastReset) return true;
  try {
    return lastReset !== TODAY();
  } catch {
    return true;
  }
};

export default function useProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadProgress = useCallback(async () => {
    try {
      const me = await getCurrentUser().catch(() => null);
      setUser(me);
      const premiumUser = getIsPremium(me);

      const savedProgress = JSON.parse(localStorage.getItem('finapple_progress') || 'null');
      if (savedProgress && savedProgress.user_email === me?.email) {
        let p = savedProgress;
        if (premiumUser) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          localStorage.setItem('finapple_progress', JSON.stringify(p));
        } else if (shouldResetHearts(p.hearts_last_reset)) {
          p = { ...p, hearts: 5, hearts_last_reset: TODAY() };
          localStorage.setItem('finapple_progress', JSON.stringify(p));
        }
        setProgress(p);
      } else {
        const newProgress = {
          user_email: me?.email || 'guest',
          xp: 0,
          hearts: 5,
          hearts_last_reset: TODAY(),
          completed_quizzes: [],
          quiz_scores: {},
        };
        setProgress(newProgress);
        localStorage.setItem('finapple_progress', JSON.stringify(newProgress));
      }
    } catch (e) {
      console.error('Failed to load progress', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const loseHeart = useCallback(async () => {
    if (getIsPremium(user)) return progress?.hearts ?? 5;
    if (!progress || progress.hearts <= 0) return 0;
    const newHearts = progress.hearts - 1;
    // Optimistic update
    setProgress(prev => ({ ...prev, hearts: newHearts }));
    // Save local progress
    const updated = { ...progress, hearts: newHearts };
    localStorage.setItem('finapple_progress', JSON.stringify(updated));
    // Asynchronous 서버 sync slot: 추후 API로 연동
    // TODO: 서버가 있다면 여기에서 업데이트 호출
    return newHearts;
  }, [progress]);

  const completeQuiz = useCallback(async (quizId, score, xpReward) => {
    if (!progress) return;
    const completed = progress.completed_quizzes || [];
    const scores = progress.quiz_scores || {};
    const isNew = !completed.includes(quizId);
    const bestScore = Math.max(scores[quizId] || 0, score);
    
    const updates = {
      completed_quizzes: isNew ? [...completed, quizId] : completed,
      quiz_scores: { ...scores, [quizId]: bestScore },
      xp: isNew ? (progress.xp || 0) + xpReward : progress.xp
    };

    // Optimistic update
    const oldProgress = progress;
    setProgress(prev => ({ ...prev, ...updates }));
    // Save local progress
    const updated = { ...progress, ...updates };
    localStorage.setItem('finapple_progress', JSON.stringify(updated));
    // Asynchronous 서버 sync slot: 추후 API로 연동
    // TODO: 서버가 있다면 여기에서 업데이트 호출
  }, [progress]);

  const isUnitLocked = useCallback((unitId) => {
    if (unitId === 'unit1') return false;
    if (!progress) return true;
    const completed = progress.completed_quizzes || [];
    if (unitId === 'unit2') {
      return !['unit1-quiz1', 'unit1-quiz2', 'unit1-quiz3', 'unit1-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit3') {
      return !['unit2-quiz1', 'unit2-quiz2', 'unit2-quiz3', 'unit2-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit4') {
      return !['unit3-quiz1', 'unit3-quiz2', 'unit3-quiz3', 'unit3-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit5') {
      return !['unit4-quiz1', 'unit4-quiz2', 'unit4-quiz3', 'unit4-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit6') {
      return !['unit5-quiz1', 'unit5-quiz2', 'unit5-quiz3', 'unit5-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit7') {
      return !['unit6-quiz1', 'unit6-quiz2', 'unit6-quiz3', 'unit6-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit8') {
      return !['unit7-quiz1', 'unit7-quiz2', 'unit7-quiz3', 'unit7-glossary'].every(q => completed.includes(q));
    }
    if (unitId === 'unit9') {
      return !['unit8-quiz1', 'unit8-quiz2', 'unit8-quiz3', 'unit8-glossary'].every(q => completed.includes(q));
    }
    return true;
  }, [progress]);

  const isQuizCompleted = useCallback((quizId) => {
    return (progress?.completed_quizzes || []).includes(quizId);
  }, [progress]);

  const getQuizScore = useCallback((quizId) => {
    return (progress?.quiz_scores || {})[quizId] || null;
  }, [progress]);

  return {
    progress,
    loading,
    user,
    isPremium: getIsPremium(user),
    loseHeart,
    completeQuiz,
    isUnitLocked,
    isQuizCompleted,
    getQuizScore,
    reload: loadProgress
  };
}
