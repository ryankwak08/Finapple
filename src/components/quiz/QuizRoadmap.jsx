import { useEffect } from 'react';
import { Lock, Check, Star, Play, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { quizUnitsCatalog } from '../../lib/quizCatalog';
import { prefetchAiQuiz } from '@/api/quizClient';

function QuizNode({ quiz, status, locked, onSelect, position }) {
  const { completed, score } = status;
  const stars = score >= 5 ? 3 : score >= 4 ? 2 : score >= 3 ? 1 : 0;

  const isLeft = position % 2 === 0;

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className="flex flex-col items-center">
        <button
          onClick={() => !locked && onSelect(quiz.id)}
          onMouseEnter={() => !locked && prefetchAiQuiz(quiz.id)}
          onFocus={() => !locked && prefetchAiQuiz(quiz.id)}
          onTouchStart={() => !locked && prefetchAiQuiz(quiz.id)}
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
              {score}/5
            </div>
          )}
        </button>
      </div>

      <div className={`flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
        <p className={`text-[13px] font-bold ${locked ? 'text-muted-foreground' : 'text-foreground'}`}>
          {quiz.title}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{quiz.subtitle}</p>
      </div>
    </div>
  );
}

function GlossaryNode({ unitId, locked, completed, position, course }) {
  const navigate = useNavigate();
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
          시사 용어 10개 외우기
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">9개 이상 맞춰야 통과 · +100 XP</p>
      </div>
    </div>
  );
}

export default function QuizRoadmap({ isUnitLocked, isQuizCompleted, getQuizScore, onQuizSelect, course = 'youth' }) {
  useEffect(() => {
    const quizIdsToWarm = quizUnitsCatalog
      .flatMap((unit) => {
        if (isUnitLocked(unit.id)) {
          return [];
        }

        return unit.quizzes
          .filter((quiz) => !isQuizCompleted(quiz.id))
          .map((quiz) => quiz.id);
      })
      .slice(0, 3);

    quizIdsToWarm.forEach((quizId, index) => {
      window.setTimeout(() => {
        prefetchAiQuiz(quizId);
      }, index * 250);
    });
  }, [isQuizCompleted, isUnitLocked]);

  let globalIndex = 0;

  return (
    <div className="relative pb-8">
      {quizUnitsCatalog.map((unit, ui) => {
        const unitLocked = isUnitLocked(unit.id);

        return (
          <div key={unit.id} className="mb-2">
            <div className={`mb-6 flex items-start gap-3 px-1 ${ui > 0 ? 'mt-8' : ''}`}>
              <div className={`w-1 h-10 rounded-full ${unitLocked ? 'bg-muted' : 'bg-primary'}`} />
              <div className={`text-2xl ${unitLocked ? 'grayscale opacity-40' : ''}`}>{unit.icon}</div>
              <div className="min-w-0">
                <p className={`text-[15px] font-extrabold ${unitLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {unit.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{unit.subtitle}</p>
                {!unitLocked ? <p className="text-[10px] text-primary mt-0.5">학습 조각을 읽고 바로 퀴즈로 넘어가요</p> : null}
              </div>
              {unitLocked && <Lock className="w-4 h-4 text-muted-foreground ml-auto" />}
            </div>

            <div className="relative pl-1 pr-1 sm:pl-2 sm:pr-2">
              {unit.quizzes.map((quiz) => {
                const completed = isQuizCompleted(quiz.id);
                const score = getQuizScore(quiz.id);
                const nodeIndex = globalIndex++;

                return (
                  <div key={quiz.id} className="relative">
                    <div className="absolute left-[27px] top-14 z-0 h-8 w-0.5 bg-border sm:left-[31px] sm:top-16" />
                    <div className="relative z-10 py-1 mb-8">
                      <QuizNode
                        quiz={quiz}
                        status={{ completed, score }}
                        locked={unitLocked}
                        onSelect={onQuizSelect}
                        position={nodeIndex}
                      />
                    </div>
                  </div>
                );
              })}

              {(() => {
                const glossaryId = `${unit.id}-glossary`;
                const allRegularDone = unit.quizzes.every((q) => isQuizCompleted(q.id));
                const glossaryLocked = unitLocked || !allRegularDone;
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
                        locked={glossaryLocked}
                        completed={glossaryDone}
                        position={nodeIndex}
                        course={course}
                      />
                    </div>
                  </div>
                );
              })()}

              {!unitLocked && unit.quizzes.every((q) => isQuizCompleted(q.id)) && isQuizCompleted(`${unit.id}-glossary`) && (
                <div className="flex items-center gap-2 bg-primary/10 rounded-2xl px-4 py-3 border border-primary/20 mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((i) => <Star key={i} className="w-4 h-4 text-accent fill-accent" />)}
                  </div>
                  <p className="text-[13px] font-bold text-primary">단원 완료!</p>
                </div>
              )}

              {ui === 0 && isUnitLocked('unit2') && (
                <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-3 mb-2">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[12px] text-muted-foreground">이전 단원을 완료하면 잠금 해제</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
