import { useEffect } from 'react';
import { Lock, Check, Star, Play, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getLocalizedQuizMeta, getLocalizedQuizUnit, getQuizUnitsCatalog } from '../../lib/quizCatalog';
import { getLessonChunkForQuiz } from '@/lib/studyData';
import { prefetchAiQuiz } from '@/api/quizClient';
import { prefetchTranslatedContent } from '@/api/contentClient';
import { useLanguage } from '@/lib/i18n';
import { getQuizStarCount } from '@/lib/quizStars';

function QuizNode({ quiz, status, locked, onSelect, position }) {
  const { isEnglish } = useLanguage();
  const { completed, score, total } = status;
  const stars = getQuizStarCount(score, total);
  const localizedQuiz = isEnglish ? { ...quiz, ...getLocalizedQuizMeta(quiz.id, quiz) } : quiz;
  const isLeft = position % 2 === 0;

  const lessonChunk = getLessonChunkForQuiz(quiz.studyTopicId, quiz.id);

  const prefetchQuizResources = () => {
    if (locked) {
      return;
    }

    prefetchAiQuiz(quiz.id, { locale: isEnglish ? 'en' : 'ko' });

    if (isEnglish && lessonChunk) {
      prefetchTranslatedContent('lessonChunk', lessonChunk, 'en');
    }
  };

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className="flex flex-col items-center">
        <button
          onClick={() => !locked && onSelect(quiz.id, quiz.studyTopicId)}
          onMouseEnter={prefetchQuizResources}
          onFocus={prefetchQuizResources}
          onTouchStart={prefetchQuizResources}
          disabled={locked}
          className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-all duration-200 active:scale-[0.95] sm:h-16 sm:w-16 ${
            locked
              ? 'bg-muted border-2 border-border cursor-not-allowed opacity-60'
              : completed
                ? 'bg-primary border-2 border-primary/50 shadow-primary/30'
                : 'bg-card border-2 border-primary/40 shadow-primary/10 active:shadow-primary/30'
          }`}
        >
          {locked ? (
            <Lock className="w-5 h-5 text-muted-foreground" />
          ) : completed ? (
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          ) : (
            <Play className="w-5 h-5 text-primary fill-primary" />
          )}
          {completed && (
            <div className="absolute left-1/2 -top-3 flex -translate-x-1/2 rounded-full bg-background/95 px-1 py-0.5 shadow-sm">
              {[1, 2, 3].map((i) => (
                <Star key={i} className={`w-3 h-3 ${i <= stars ? 'text-accent fill-accent' : 'text-muted-foreground/20 fill-muted-foreground/10'}`} />
              ))}
            </div>
          )}
          {score !== null && !locked && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-1.5 py-0 text-[9px] font-bold text-primary whitespace-nowrap">
              {score}/{total}
            </div>
          )}
        </button>
      </div>

      <div className={`flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
        <p className={`text-[13px] font-bold ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {localizedQuiz.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{localizedQuiz.subtitle}</p>
      </div>
    </div>
  );
}

function GlossaryNode({ unitId, locked, completed, position, course }) {
  const navigate = useNavigate();
  const { isEnglish } = useLanguage();
  const isLeft = position % 2 === 0;
  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className="flex flex-col items-center">
        <button
          onClick={() => !locked && navigate(`/glossary-quiz/${unitId}?course=${course}`)}
          disabled={locked}
          className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-md transition-all duration-200 active:scale-[0.95] sm:h-16 sm:w-16 ${
            locked
              ? 'bg-muted border-2 border-border cursor-not-allowed opacity-60'
              : completed
                ? 'bg-accent/80 border-2 border-accent/50 shadow-accent/30'
                : 'bg-card border-2 border-accent/50 shadow-accent/10'
          }`}
        >
          {locked ? (
            <Lock className="w-5 h-5 text-muted-foreground" />
          ) : completed ? (
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          ) : (
            <BookOpen className="w-5 h-5 text-accent" />
          )}
        </button>
      </div>
      <div className={`flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
        <p className={`text-[13px] font-bold ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {isEnglish ? 'Memorize 10 key terms' : '시사 용어 10개 외우기'}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{isEnglish ? 'Pass with 9 or more correct · +100 XP' : '9개 이상 맞춰야 통과 · +100 XP'}</p>
      </div>
    </div>
  );
}

export default function QuizRoadmap({ isPremium, isQuizCompleted, getQuizScore, onQuizSelect, course = 'youth' }) {
  const { isEnglish } = useLanguage();
  const quizUnitsCatalog = getQuizUnitsCatalog(course).map((unit) => getLocalizedQuizUnit(unit, isEnglish));

  useEffect(() => {
    const quizIdsToWarm = quizUnitsCatalog
      .flatMap((unit) => {
        return unit.quizzes
          .filter((quiz) => !isQuizCompleted(quiz.id))
          .map((quiz) => quiz.id);
      })
      .slice(0, 3);

    quizIdsToWarm.forEach((quizId, index) => {
      window.setTimeout(() => {
        prefetchAiQuiz(quizId, { locale: isEnglish ? 'en' : 'ko' });
        if (isEnglish) {
          const quiz = quizUnitsCatalog
            .flatMap((unit) => unit.quizzes)
            .find((item) => item.id === quizId);
          const lessonChunk = getLessonChunkForQuiz(quiz?.studyTopicId, quizId);
          if (lessonChunk) {
            prefetchTranslatedContent('lessonChunk', lessonChunk, 'en');
          }
        }
      }, index * 250);
    });
  }, [isEnglish, isQuizCompleted, quizUnitsCatalog]);

  let globalIndex = 0;

  return (
    <div className="relative pb-8">
      {quizUnitsCatalog.map((unit, ui) => {
        return (
          <div key={unit.id} className="mb-2">
            <div className={`mb-6 flex items-start gap-3 px-1 ${ui > 0 ? 'mt-8' : ''}`}>
              <div className="w-1 h-10 rounded-full bg-primary" />
              <div className="text-2xl">{unit.icon}</div>
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-foreground">{unit.title}</p>
                <p className="text-[11px] text-muted-foreground">{unit.subtitle}</p>
                <p className="text-[10px] text-primary mt-0.5">{isEnglish ? 'Read the lesson and jump straight into the quiz.' : '학습 조각을 읽고 바로 퀴즈로 넘어가요'}</p>
                {!isPremium ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {isEnglish
                      ? 'Free users can complete 1 quiz per unit. Premium unlocks all quizzes in each unit.'
                      : '무료 사용자는 유닛당 1개 퀴즈만 완료할 수 있어요. 프리미엄은 유닛 내 모든 퀴즈를 완료할 수 있어요.'}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="relative pl-1 pr-1 sm:pl-2 sm:pr-2">
              {unit.quizzes.map((quiz) => {
                const completed = isQuizCompleted(quiz.id);
                const scoreDetails = getQuizScore(quiz.id);
                const nodeIndex = globalIndex++;

                return (
                  <div key={quiz.id} className="relative">
                    <div className="absolute left-[27px] top-14 z-0 h-8 w-0.5 bg-border sm:left-[31px] sm:top-16" />
                    <div className="relative z-10 py-1 mb-8">
                      <QuizNode
                        quiz={{ ...quiz, studyTopicId: unit.studyTopicId }}
                        status={{ completed, score: scoreDetails?.score ?? null, total: scoreDetails?.total ?? 5 }}
                        locked={false}
                        onSelect={onQuizSelect}
                        position={nodeIndex}
                      />
                    </div>
                  </div>
                );
              })}

              {(() => {
                const glossaryId = `${unit.id}-glossary`;
                const glossaryDone = isQuizCompleted(glossaryId);
                const nodeIndex = globalIndex++;
                return (
                  <div className="relative">
                    {!glossaryDone && (
                      <div className="absolute left-[27px] top-14 z-0 h-8 w-0.5 bg-border sm:left-[31px] sm:top-16" />
                    )}
                    <div className="relative z-10 py-1 mb-8">
                      <GlossaryNode
                        unitId={unit.id}
                        locked={false}
                        completed={glossaryDone}
                        position={nodeIndex}
                        course={course}
                      />
                    </div>
                  </div>
                );
              })()}

              {unit.quizzes.every((q) => isQuizCompleted(q.id)) && isQuizCompleted(`${unit.id}-glossary`) && (
                <div className="flex items-center gap-2 bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20 mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => <Star key={i} className="w-4 h-4 text-accent fill-accent" />)}
                  </div>
                  <p className="text-[13px] font-bold text-primary">{isEnglish ? 'Unit complete!' : '단원 완료!'}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
