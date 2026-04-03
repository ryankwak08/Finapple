import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Check, X, Star, Heart } from 'lucide-react';
import { allGlossaryTerms } from '../lib/allGlossaryTerms';
import useProgress from '../lib/useProgress';
import HeartDisplay from '../components/quiz/HeartDisplay';

const PASS_THRESHOLD = 9;
const QUIZ_SIZE = 10;

function pickTerms(unitId) {
  // Shuffle with unit-seeded offset so each unit gets different terms
  const unitOffsets = { unit1: 0, unit2: 50, unit3: 100, unit4: 150, unit5: 200, unit6: 250 };
  const offset = unitOffsets[unitId] ?? 0;
  // Take a slice then shuffle deterministically
  const pool = [...allGlossaryTerms];
  // Fisher-Yates with a seed based on offset
  let seed = offset * 31 + 7;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUIZ_SIZE);
}

function maskTerm(definition, term) {
  // Remove the term and common short forms from definition
  const base = term.split('(')[0].trim(); // e.g. "기준금리" from "기준금리(Base Rate)"
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return definition.replace(new RegExp(escaped, 'g'), '___');
}

function makeQuestion(terms, index) {
  const correct = terms[index];
  // Pick 3 wrong answers from other terms
  const others = terms.filter((_, i) => i !== index);
  const wrongs = [];
  const used = new Set();
  while (wrongs.length < 3 && wrongs.length < others.length) {
    const idx = Math.floor(Math.random() * others.length);
    if (!used.has(idx)) { used.add(idx); wrongs.push(others[idx]); }
  }
  // Options are term NAMES, not definitions
  const optionTerms = [correct, ...wrongs];
  for (let i = optionTerms.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionTerms[i], optionTerms[j]] = [optionTerms[j], optionTerms[i]];
  }
  const answerIdx = optionTerms.findIndex(t => t.id === correct.id);
  // Mask the term in the definition
  const maskedDef = maskTerm(correct.definition, correct.term);
  return { definition: maskedDef, correctTerm: correct.term, options: optionTerms.map(t => t.term), answer: answerIdx };
}

export default function GlossaryQuizPlay() {
  const navigate = useNavigate();
  const { unitId } = useParams();
  const course = new URLSearchParams(window.location.search).get('course') || 'youth';
  const backUrl = `/quiz?course=${course}`;
  const { progress, loseHeart, completeQuiz, isQuizCompleted } = useProgress();

  const quizId = `${unitId}-glossary`;
  const [terms] = useState(() => pickTerms(unitId));
  const [questions] = useState(() => {
    const t = pickTerms(unitId);
    return t.map((_, i) => makeQuestion(t, i));
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (progress.hearts <= 0 && !finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-5xl mb-4">💔</div>
        <h2 className="text-xl font-extrabold text-foreground mb-2">하트 부족</h2>
        <p className="text-muted-foreground text-[14px] text-center mb-6">내일 다시 도전해주세요!</p>
        <Link to={backUrl} className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[14px] font-bold">돌아가기</Link>
      </div>
    );
  }

  if (finished) {
    const passed = score >= PASS_THRESHOLD;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-scale-in">
        <BookOpen className={`w-16 h-16 mb-4 ${passed ? 'text-primary' : 'text-destructive'}`} />
        <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center mb-6 ${passed ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          <span className={`text-4xl font-extrabold ${passed ? 'text-primary' : 'text-destructive'}`}>{score}</span>
          <span className="text-muted-foreground text-[13px] font-medium">/ {QUIZ_SIZE}</span>
        </div>
        <h2 className="text-xl font-extrabold text-foreground text-center mb-2">
          {passed ? '🎉 통과!' : '😢 불합격'}
        </h2>
        <p className="text-muted-foreground text-[13px] text-center mb-2">
          {score}/{QUIZ_SIZE} 정답
        </p>
        <p className="text-[13px] text-center font-medium mb-2">
          {passed ? '다음 유닛으로 진행할 수 있어요' : `${PASS_THRESHOLD}개 이상 맞춰야 통과할 수 있어요`}
        </p>
        {xpEarned > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-accent fill-accent" />
            <span className="text-[14px] font-semibold text-foreground">+{xpEarned} XP</span>
          </div>
        )}
        <Link
          to={backUrl}
          className="flex items-center justify-center gap-2 w-full max-w-xs py-4 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          퀴즈 목록으로
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const handleSelect = (idx) => {
    if (confirmed) return;
    setSelectedAnswer(idx);
  };

  const handleConfirm = async () => {
    if (selectedAnswer === null) return;
    const correct = selectedAnswer === currentQ.answer;
    setIsCorrect(correct);
    setConfirmed(true);
    if (correct) setScore(prev => prev + 1);
    else await loseHeart();
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
      setIsCorrect(false);
    } else {
      const finalScore = score;
      const passed = finalScore >= PASS_THRESHOLD;
      const isNew = !isQuizCompleted(quizId);
      const xp = (passed && isNew) ? 100 : 0;
      setXpEarned(xp);
      if (passed) await completeQuiz(quizId, finalScore, 100);
      setFinished(true);
    }
  };

  const progress_pct = ((currentIndex) / questions.length) * 100;

  return (
    <div className="px-5 pt-14 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors outline-none">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[14px] font-bold text-foreground">시사 용어 10개 외우기</span>
        </div>
        <HeartDisplay hearts={progress.hearts} />
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>{currentIndex + 1} / {questions.length}</span>
          <span>9개 이상 통과</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress_pct}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4 animate-slide-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">이 정의에 해당하는 용어는?</span>
        </div>
        <p className="text-[14px] text-foreground leading-relaxed">
          {currentQ.definition.length > 200 ? currentQ.definition.slice(0, 200) + '...' : currentQ.definition}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2.5 mb-6">
        {currentQ.options.map((opt, idx) => {
          let cls = 'bg-card border-border text-foreground';
          if (confirmed) {
            if (idx === currentQ.answer) cls = 'bg-primary/10 border-primary text-primary';
            else if (idx === selectedAnswer) cls = 'bg-destructive/10 border-destructive text-destructive';
            else cls = 'bg-muted/50 border-border/50 text-muted-foreground opacity-60';
          } else if (idx === selectedAnswer) {
            cls = 'bg-secondary border-primary text-foreground';
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={confirmed}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all duration-150 text-[13px] leading-snug ${cls} active:scale-[0.98]`}
            >
              <div className="flex items-start gap-2">
                <span className="font-bold text-[12px] mt-0.5 flex-shrink-0 opacity-60">{String.fromCharCode(9312 + idx)}</span>
                <span className="font-semibold">{opt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {!confirmed ? (
        <button
          onClick={handleConfirm}
          disabled={selectedAnswer === null}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          확인
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
        >
          {currentIndex < questions.length - 1 ? '다음 →' : '결과 보기'}
        </button>
      )}
    </div>
  );
}