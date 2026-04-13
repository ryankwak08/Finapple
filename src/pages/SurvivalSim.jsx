import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Coins, Heart, Shield, Wallet } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import useProgress from '@/lib/useProgress';
import {
  COIN_PACK_AMOUNT,
  SURVIVAL_COIN_PACK_PRICE,
  createSurvivalCoinPackOrderId,
  createTossSurvivalCoinCheckoutSession,
  confirmTossSurvivalCoinPayment,
} from '@/api/paymentClient';

const TOTAL_TURNS = 8;
const TURN_WAIT_MS = 45 * 1000;
const CONTINUE_COST_COINS = 10;
const CONTINUE_CASH_BOOST = 220000;
const COIN_CASH_TOPUP_COST = 10;
const COIN_CASH_TOPUP_AMOUNT = 100000;
const LOAN_PRINCIPAL = 160000;
const LOAN_INSTALLMENT = 90000;
const LOAN_MAX_ACTIVE_PAYMENTS = 2;
const FAIL_STRESS_THRESHOLD = 90;
const DEFAULT_START_CASH = 240000;

const BEST_KEY = 'finapple:survival:best:v5';
const GAME_KEY = 'finapple:survival:state:v5';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const EMPLOYMENT_PLANS = [
  {
    key: 'part-time',
    emoji: '🛵',
    name: '편한 알바',
    nameEn: 'Easy Part-time',
    moneyPerClick: 30,
    stressAfterWork: 8,
    description: '클릭당 수입은 적지만 업무 강도가 낮음.',
    descriptionEn: 'Lower income per tap, lighter workload stress.',
  },
  {
    key: 'office',
    emoji: '💼',
    name: '사무직',
    nameEn: 'Office Job',
    moneyPerClick: 55,
    stressAfterWork: 10,
    description: '수입과 강도의 밸런스형.',
    descriptionEn: 'Balanced option between income and stress.',
  },
  {
    key: 'high-intensity',
    emoji: '🔥',
    name: '고강도 업무',
    nameEn: 'High-intensity Work',
    moneyPerClick: 90,
    stressAfterWork: 12,
    description: '클릭 수익이 큰 대신 스트레스 급상승.',
    descriptionEn: 'Highest tap income with heavy stress load.',
  },
];

const EVENTS = [
  {
    id: 'rent',
    title: '월세+관리비 청구',
    titleEn: 'Rent + Utility Bill',
    body: '고정비가 한 번에 빠진다. 이번 달 체력 체크 시작.',
    bodyEn: 'Fixed costs hit all at once. Monthly stamina check begins.',
    lesson: '고정비를 먼저 확보하면 파산 확률이 크게 줄어요.',
    lessonEn: 'Prioritizing fixed costs reduces bankruptcy risk.',
    choices: [
      {
        label: '고정비 먼저 처리',
        labelEn: 'Pay fixed costs first',
        base: { cash: -145000, stress: -1, joy: -1, credit: 3 },
        variance: { cash: 28000, stress: 3, joy: 2, credit: 1 },
      },
      {
        label: '카드로 밀고 현금 보존',
        labelEn: 'Charge card, preserve cash',
        base: { cash: -90000, stress: 2, joy: 1, credit: -8 },
        variance: { cash: 30000, stress: 3, joy: 3, credit: 3 },
      },
    ],
  },
  {
    id: 'food',
    title: '점심비 선택',
    titleEn: 'Lunch Budget Choice',
    body: '도시락 루트 vs 프리미엄 런치. 소액 반복의 함정이 숨어있다.',
    bodyEn: 'Lunchbox route vs premium lunch. Repeating small costs add up.',
    lesson: '식비는 빈도가 핵심이에요. 단가보다 횟수를 먼저 보세요.',
    lessonEn: 'Frequency beats ticket size in meal budgets.',
    choices: [
      {
        label: '도시락 챌린지',
        labelEn: 'Lunchbox challenge',
        base: { cash: 12000, stress: 2, joy: -2, credit: 1 },
        variance: { cash: 15000, stress: 2, joy: 3, credit: 1 },
      },
      {
        label: '매일 프리미엄 런치',
        labelEn: 'Premium lunch every day',
        base: { cash: -56000, stress: -2, joy: 5, credit: 0 },
        variance: { cash: 26000, stress: 3, joy: 3, credit: 1 },
      },
    ],
  },
  {
    id: 'phone',
    title: '신형 폰 유혹',
    titleEn: 'New Phone Temptation',
    body: '업그레이드 유혹이 강하다. 통장과 감정의 줄다리기.',
    bodyEn: 'Upgrade temptation is strong. Wallet vs emotion tug-of-war.',
    lesson: '할부는 즉시 부담을 줄이지만 신용 여력은 깎아요.',
    lessonEn: 'Installments reduce immediate pain but drain credit capacity.',
    choices: [
      {
        label: '배터리 교체로 버티기',
        labelEn: 'Replace battery and hold',
        base: { cash: -110000, stress: -1, joy: 0, credit: 4 },
        variance: { cash: 35000, stress: 3, joy: 2, credit: 2 },
      },
      {
        label: '할부로 기기변경',
        labelEn: 'Upgrade on installment',
        base: { cash: -250000, stress: 3, joy: 8, credit: -12 },
        variance: { cash: 70000, stress: 3, joy: 4, credit: 3 },
      },
    ],
  },
  {
    id: 'sub',
    title: '구독 폭탄 점검',
    titleEn: 'Subscription Bomb Check',
    body: '안 쓰는 결제가 누적됐다. 정리하느냐 미루느냐.',
    bodyEn: 'Unused subscriptions accumulated. Clean up or postpone?',
    lesson: '정기결제 정리는 현금흐름 개선의 가장 빠른 방법이에요.',
    lessonEn: 'Subscription cleanup is the fastest cashflow fix.',
    choices: [
      {
        label: '바로 해지하고 정리',
        labelEn: 'Cancel now and clean up',
        base: { cash: 45000, stress: -2, joy: -1, credit: 2 },
        variance: { cash: 22000, stress: 2, joy: 2, credit: 1 },
      },
      {
        label: '다음 달의 나에게 미루기',
        labelEn: 'Delay to next-month me',
        base: { cash: -65000, stress: 2, joy: 1, credit: -2 },
        variance: { cash: 26000, stress: 2, joy: 2, credit: 1 },
      },
    ],
  },
  {
    id: 'weekend',
    title: '주말 플렉스 제안',
    titleEn: 'Weekend Flex Plan',
    body: '여행/호텔/식사 패키지 제안. 이번 달 최대 변수.',
    bodyEn: 'Travel/hotel/dining package proposal. Biggest monthly variable.',
    lesson: '경험소비도 예산 상한선 없으면 빠르게 위험해져요.',
    lessonEn: 'Experience spending becomes dangerous without a hard cap.',
    choices: [
      {
        label: '저예산 타협안 선택',
        labelEn: 'Choose a budget compromise',
        base: { cash: -90000, stress: -1, joy: 5, credit: 1 },
        variance: { cash: 30000, stress: 3, joy: 3, credit: 1 },
      },
      {
        label: '풀패키지로 플렉스',
        labelEn: 'Go full package flex',
        base: { cash: -340000, stress: 1, joy: 11, credit: -9 },
        variance: { cash: 85000, stress: 4, joy: 4, credit: 3 },
      },
    ],
  },
  {
    id: 'medical',
    title: '예상 못한 병원비',
    titleEn: 'Unexpected Medical Bill',
    body: '갑작스런 의료비가 발생했다. 현금흐름 내구성 테스트.',
    bodyEn: 'A surprise medical bill appears. Cashflow durability test.',
    lesson: '비상금은 투자수익보다 생존확률을 높이는 장치예요.',
    lessonEn: 'Emergency funds boost survival odds more than returns.',
    choices: [
      {
        label: '현금으로 즉시 처리',
        labelEn: 'Pay in cash now',
        base: { cash: -140000, stress: 1, joy: -2, credit: 2 },
        variance: { cash: 35000, stress: 2, joy: 2, credit: 1 },
      },
      {
        label: '리볼빙으로 버티기',
        labelEn: 'Survive via revolving credit',
        base: { cash: -35000, stress: 4, joy: -1, credit: -12 },
        variance: { cash: 12000, stress: 3, joy: 2, credit: 2 },
      },
    ],
  },
  {
    id: 'scam',
    title: '고수익 투자 DM',
    titleEn: 'High-Return Investment DM',
    body: '“일주일 2배 보장” 메시지. 직감은 이미 경고중.',
    bodyEn: '“Double in a week guaranteed” DM. Your instincts are warning you.',
    lesson: '비정상 고수익 약속은 대부분 사기 신호예요.',
    lessonEn: 'Abnormal high-return promises are usually scam signals.',
    choices: [
      {
        label: '차단 + 신고',
        labelEn: 'Block + report',
        base: { cash: 0, stress: -1, joy: 0, credit: 5 },
        variance: { cash: 8000, stress: 2, joy: 1, credit: 2 },
      },
      {
        label: '소액 테스트 투자',
        labelEn: 'Try a small test investment',
        base: { cash: -110000, stress: 5, joy: -2, credit: -8 },
        variance: { cash: 50000, stress: 3, joy: 3, credit: 3 },
      },
    ],
  },
  {
    id: 'settle',
    title: '월말 정산',
    titleEn: 'Month-End Settlement',
    body: '한 달 최종 정산. 이제 생존 결과가 결정된다.',
    bodyEn: 'Final month-end settlement. Survival outcome is decided now.',
    lesson: '월말 결산 습관이 다음 달 실수를 줄여줘요.',
    lessonEn: 'Month-end review reduces next-month mistakes.',
    choices: [
      {
        label: '가계부 리뷰 + 다음달 예산',
        labelEn: 'Review ledger + plan next budget',
        base: { cash: 35000, stress: -2, joy: 1, credit: 4 },
        variance: { cash: 18000, stress: 2, joy: 1, credit: 1 },
      },
      {
        label: '정산 미루고 쇼핑',
        labelEn: 'Delay review and go shopping',
        base: { cash: -150000, stress: -1, joy: 4, credit: -5 },
        variance: { cash: 35000, stress: 3, joy: 2, credit: 2 },
      },
    ],
  },
];

function baseGame() {
  return {
    phase: 'playing',
    turn: 0,
    day: 1,
    cash: DEFAULT_START_CASH,
    stress: 30,
    joy: 18,
    credit: 60,
    coinBalance: 0,
    coinPurchasedPacks: 0,
    usedBailout: false,
    quizBuff: {
      level: 0,
      bonusCash: 0,
      stressRelief: 0,
      bonusCoins: 0,
      note: '',
    },
    loan: {
      activePayments: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
    },
    logs: [],
    lessons: [],
    nextTurnAt: null,
    employment: null,
    waitingWork: {
      clicks: 0,
      earned: 0,
    },
    startBuffApplied: false,
    result: null,
    failReason: '',
    xpAwarded: 0,
    xpAwardedDone: false,
    updatedAt: Date.now(),
  };
}

function parseJsonSafely(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadBestRecord() {
  if (typeof window === 'undefined') return null;
  return parseJsonSafely(window.localStorage.getItem(BEST_KEY));
}

function saveBestRecord(best) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // noop
  }
}

function loadGameState() {
  if (typeof window === 'undefined') return null;
  const parsed = parseJsonSafely(window.localStorage.getItem(GAME_KEY));
  if (!parsed || typeof parsed !== 'object') return null;
  const savedEmployment = parsed.employment?.key
    ? EMPLOYMENT_PLANS.find((entry) => entry.key === parsed.employment.key) || null
    : null;
  return {
    ...baseGame(),
    ...parsed,
    employment: savedEmployment,
    waitingWork: {
      ...baseGame().waitingWork,
      ...(parsed.waitingWork || {}),
    },
    loan: {
      ...baseGame().loan,
      ...(parsed.loan || {}),
    },
  };
}

function saveGameState(game) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GAME_KEY, JSON.stringify({ ...game, updatedAt: Date.now() }));
  } catch {
    // noop
  }
}

function isFailed(state) {
  return state.cash <= 0 || state.joy <= 0 || state.stress >= FAIL_STRESS_THRESHOLD;
}

function failureReason(state, isEnglish) {
  if (state.cash <= 0) return isEnglish ? 'Out of cash (0 KRW)' : '잔고 0원';
  if (state.joy <= 0) return isEnglish ? 'Happiness reached 0' : '행복 0';
  if (state.stress >= FAIL_STRESS_THRESHOLD) {
    return isEnglish
      ? `Stress reached ${FAIL_STRESS_THRESHOLD}+`
      : `스트레스 ${FAIL_STRESS_THRESHOLD} 이상`;
  }
  return isEnglish ? 'Game over' : '게임 오버';
}

function successXp(state) {
  const base = 100;
  const cashBonus = clamp(Math.floor(state.cash / 10000), 0, 100);
  const joyBonus = clamp(state.joy * 2, 0, 60);
  const stressPenalty = clamp(Math.max(0, state.stress - 20) * 3, 0, 90);
  const coinPenalty = state.coinPurchasedPacks * 15;
  const loanPenalty = state.loan.totalBorrowed > 0 ? 20 : 0;
  return clamp(base + cashBonus + joyBonus - stressPenalty - coinPenalty - loanPenalty, 30, 300);
}

function failXp(state) {
  return clamp(8 + state.turn * 10 - state.coinPurchasedPacks * 3, 5, 80);
}

function rollChoice(choice) {
  return {
    cash: choice.base.cash + randInt(-choice.variance.cash, choice.variance.cash),
    stress: choice.base.stress + randInt(-choice.variance.stress, choice.variance.stress),
    joy: choice.base.joy + randInt(-choice.variance.joy, choice.variance.joy),
    credit: choice.base.credit + randInt(-choice.variance.credit, choice.variance.credit),
  };
}

function signed(value) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}`;
}

export default function SurvivalSim() {
  const { isEnglish } = useLanguage();
  const { awardXp, getProgressSummary } = useProgress();
  const [best, setBest] = useState(loadBestRecord);
  const [game, setGame] = useState(() => {
    const loaded = loadGameState();
    return loaded || baseGame();
  });
  const [nowTs, setNowTs] = useState(Date.now());
  const [coinCheckoutLoading, setCoinCheckoutLoading] = useState(false);
  const notifiedRef = useRef(false);
  const turnNotifyTimerRef = useRef(null);
  const notifiedTurnRef = useRef(-1);

  const currentEvent = EVENTS[Math.min(game.turn, EVENTS.length - 1)] || EVENTS[0];
  const progress = Math.round((game.turn / TOTAL_TURNS) * 100);
  const progressSummary = getProgressSummary?.() || { completedCount: 0 };

  const quizBuff = useMemo(() => {
    const completed = Number(progressSummary.completedCount || 0);
    const level = clamp(Math.floor(completed / 3), 0, 4);
    const bonusCash = level * 25000;
    const stressRelief = level * 2;
    const bonusCoins = level >= 3 ? 3 : 0;

    const note = isEnglish
      ? `Quiz buff Lv.${level} (from ${completed} clears)`
      : `퀴즈 버프 Lv.${level} (완료 ${completed}개 기반)`;

    return { level, bonusCash, stressRelief, bonusCoins, note };
  }, [isEnglish, progressSummary.completedCount]);

  useEffect(() => {
    saveGameState(game);
  }, [game]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (turnNotifyTimerRef.current) {
      window.clearTimeout(turnNotifyTimerRef.current);
      turnNotifyTimerRef.current = null;
    }

    if (game.phase !== 'waiting' || !game.nextTurnAt) {
      return undefined;
    }

    const msLeft = Math.max(0, game.nextTurnAt - Date.now());
    turnNotifyTimerRef.current = window.setTimeout(() => {
      if (!window.Notification) {
        document.title = isEnglish ? 'Turn Ready - Finapple' : '턴 준비 완료 - Finapple';
        return;
      }

      if (Notification.permission === 'granted' && notifiedTurnRef.current !== game.turn) {
        notifiedTurnRef.current = game.turn;
        new Notification(isEnglish ? 'Next turn is ready' : '다음 턴 준비 완료', {
          body: isEnglish ? 'Come back and continue your one-month run.' : '돌아와서 한달살기를 이어가세요.',
        });
      } else if (Notification.permission !== 'granted') {
        document.title = isEnglish ? 'Turn Ready - Finapple' : '턴 준비 완료 - Finapple';
      }
    }, msLeft + 50);

    return () => {
      if (turnNotifyTimerRef.current) {
        window.clearTimeout(turnNotifyTimerRef.current);
        turnNotifyTimerRef.current = null;
      }
    };
  }, [game.nextTurnAt, game.phase, game.turn, isEnglish]);

  useEffect(() => {
    if (game.phase !== 'waiting' || !game.nextTurnAt) {
      notifiedRef.current = false;
      return;
    }

    if (nowTs < game.nextTurnAt) {
      return;
    }

    setGame((prev) => {
      if (prev.phase !== 'waiting' || !prev.nextTurnAt || Date.now() < prev.nextTurnAt) return prev;

      const stressGain = prev.employment?.stressAfterWork || 0;
      const workEarned = prev.waitingWork?.earned || 0;
      const workClicks = prev.waitingWork?.clicks || 0;
      const next = {
        ...prev,
        phase: 'playing',
        nextTurnAt: null,
        waitingWork: { clicks: 0, earned: 0 },
        stress: clamp(prev.stress + stressGain, 0, 100),
        logs: prev.employment
          ? [
              {
                turn: prev.turn,
                title: isEnglish ? 'Work shift settled' : '근무 정산 완료',
                delta: isEnglish
                  ? `+${workEarned.toLocaleString()} KRW (${workClicks} taps) · stress +${stressGain}`
                  : `+${workEarned.toLocaleString()}원 (${workClicks}회 연타) · 스트레스 +${stressGain}`,
              },
              ...prev.logs,
            ].slice(0, 6)
          : prev.logs,
      };

      if (isFailed(next)) {
        if (!prev.usedBailout) {
          return { ...next, phase: 'bailout' };
        }
        return finalize(next, false);
      }

      return next;
    });

    if (document.visibilityState === 'hidden' && !notifiedRef.current && window.Notification?.permission === 'granted') {
      notifiedRef.current = true;
      new Notification(isEnglish ? 'Next turn is ready' : '다음 턴이 열렸어요', {
        body: isEnglish ? 'Come back and continue your one-month run.' : '돌아와서 한달살기를 이어가세요.',
      });
    }
  }, [game.nextTurnAt, game.phase, isEnglish, nowTs]);

  useEffect(() => {
    if (game.phase !== 'result' || game.xpAwardedDone) return;

    if (game.xpAwarded > 0) {
      awardXp(game.xpAwarded).catch((error) => {
        console.error('Failed to award survival XP:', error);
      });
    }

    setGame((prev) => ({ ...prev, xpAwardedDone: true }));
  }, [awardXp, game.phase, game.xpAwarded, game.xpAwardedDone]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('coinCheckout');
    const provider = params.get('provider');

    if (!checkoutState || provider !== 'toss') {
      return;
    }

    if (checkoutState === 'fail') {
      window.alert(isEnglish ? 'Coin payment was cancelled or failed.' : '코인 결제가 취소되었거나 실패했습니다.');
      window.history.replaceState({}, '', '/survival');
      return;
    }

    if (checkoutState !== 'success') {
      return;
    }

    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount'));
    const processedKey = orderId ? `finapple:survival:coin-confirmed:${orderId}` : '';

    if (!paymentKey || !orderId || !amount || amount !== SURVIVAL_COIN_PACK_PRICE) {
      window.alert(isEnglish ? 'Coin payment information is incomplete.' : '코인 결제 정보가 올바르지 않습니다.');
      window.history.replaceState({}, '', '/survival');
      return;
    }

    if (processedKey && window.sessionStorage.getItem(processedKey) === 'done') {
      window.history.replaceState({}, '', '/survival');
      return;
    }

    const verifyAndGrant = async () => {
      try {
        await confirmTossSurvivalCoinPayment({ paymentKey, orderId, amount });
        if (cancelled) return;

        if (processedKey) {
          window.sessionStorage.setItem(processedKey, 'done');
        }

        setGame((prev) => ({
          ...prev,
          coinBalance: prev.coinBalance + COIN_PACK_AMOUNT,
          coinPurchasedPacks: prev.coinPurchasedPacks + 1,
          logs: [
            {
              turn: prev.turn,
              title: isEnglish ? 'Coin pack purchased' : '코인팩 구매',
              delta: `${COIN_PACK_AMOUNT}${isEnglish ? ' coins' : '코인'} / ${SURVIVAL_COIN_PACK_PRICE.toLocaleString()}원`,
            },
            ...prev.logs,
          ].slice(0, 6),
        }));
      } catch (error) {
        console.error('Survival coin payment confirm failed:', error);
        if (!cancelled) {
          window.alert(error.message || (isEnglish ? 'Coin payment confirmation failed.' : '코인 결제 승인에 실패했습니다.'));
        }
      } finally {
        if (!cancelled) {
          window.history.replaceState({}, '', '/survival');
        }
      }
    };

    void verifyAndGrant();

    return () => {
      cancelled = true;
    };
  }, [isEnglish]);

  useEffect(() => {
    if (game.startBuffApplied) return;
    if (game.turn !== 0 || game.phase !== 'playing') return;

    setGame((prev) => {
      if (prev.startBuffApplied || prev.turn !== 0 || prev.phase !== 'playing') return prev;
      return {
        ...prev,
        startBuffApplied: true,
        cash: prev.cash + quizBuff.bonusCash,
        stress: clamp(prev.stress - quizBuff.stressRelief, 0, 100),
        coinBalance: prev.coinBalance + quizBuff.bonusCoins,
        quizBuff: { ...quizBuff },
        logs: quizBuff.level > 0
          ? [
              {
                turn: 0,
                title: isEnglish ? 'Quiz benefit applied' : '퀴즈 베네핏 적용',
                delta: `${quizBuff.note} · +${quizBuff.bonusCash.toLocaleString()}원`,
              },
            ]
          : prev.logs,
      };
    });
  }, [game.phase, game.startBuffApplied, game.turn, isEnglish, quizBuff]);

  const countdown = game.phase === 'waiting' && game.nextTurnAt
    ? Math.max(0, Math.ceil((game.nextTurnAt - nowTs) / 1000))
    : 0;

  const finalize = (next, success) => {
    const xp = success ? successXp(next) : failXp(next);
    return {
      ...next,
      phase: 'result',
      result: success ? 'success' : 'fail',
      failReason: success ? '' : failureReason(next, isEnglish),
      xpAwarded: xp,
      xpAwardedDone: false,
      nextTurnAt: null,
    };
  };

  const takeEmployment = (plan) => {
    setGame((prev) => {
      if (prev.phase !== 'playing' || prev.employment) return prev;

      return {
        ...prev,
        employment: plan,
        logs: [
          {
            turn: prev.turn,
            title: isEnglish ? 'Employment accepted' : '취업 완료',
            delta: isEnglish
              ? `+${plan.moneyPerClick.toLocaleString()} KRW/tap · stress +${plan.stressAfterWork}/turn`
              : `클릭당 +${plan.moneyPerClick.toLocaleString()}원 · 근무 후 스트레스 +${plan.stressAfterWork}`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };
    });
  };

  const requestNotificationPermission = async () => {
    if (!window.Notification) return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // noop
      }
    }
  };

  const takeLoan = () => {
    setGame((prev) => {
      if (prev.phase !== 'playing') return prev;
      if (prev.loan.activePayments >= LOAN_MAX_ACTIVE_PAYMENTS) return prev;

      const next = {
        ...prev,
        cash: prev.cash + LOAN_PRINCIPAL,
        stress: clamp(prev.stress + 3, 0, 100),
        joy: clamp(prev.joy + 1, 0, 100),
        credit: clamp(prev.credit - 12, 0, 100),
        loan: {
          ...prev.loan,
          activePayments: prev.loan.activePayments + LOAN_MAX_ACTIVE_PAYMENTS,
          totalBorrowed: prev.loan.totalBorrowed + LOAN_PRINCIPAL,
        },
        logs: [
          {
            turn: prev.turn,
            title: isEnglish ? 'Lifestyle loan approved' : '생활비 대출 승인',
            delta: `+${LOAN_PRINCIPAL.toLocaleString()}원`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };

      if (isFailed(next)) {
        if (!prev.usedBailout) {
          return { ...next, phase: 'bailout' };
        }
        return finalize(next, false);
      }

      return next;
    });
  };

  const applyChoice = (choice) => {
    setGame((prev) => {
      if (prev.phase !== 'playing') return prev;

      const rolledRaw = rollChoice(choice);
      const rolled = {
        cash: rolledRaw.cash < 0 ? Math.round(rolledRaw.cash * 0.75) : rolledRaw.cash,
        stress: rolledRaw.stress > 0 ? Math.round(rolledRaw.stress * 0.7) : Math.round(rolledRaw.stress * 1.6),
        joy: rolledRaw.joy < 0 ? Math.round(rolledRaw.joy * 0.7) : rolledRaw.joy,
        credit: rolledRaw.credit,
      };
      const nextTurn = prev.turn + 1;
      const nextDay = Math.min(30, Math.round((nextTurn / TOTAL_TURNS) * 30));

      let nextCash = prev.cash + rolled.cash;
      let nextStress = clamp(prev.stress + rolled.stress, 0, 100);
      let nextJoy = clamp(prev.joy + rolled.joy, 0, 100);
      let nextCredit = clamp(prev.credit + rolled.credit, 0, 100);
      const nextLoan = { ...prev.loan };

      // If a choice is intentionally stress-relieving, grant extra relief so low-stress play is more viable.
      if (choice.base.stress <= 0) {
        nextStress = clamp(nextStress - randInt(2, 5), 0, 100);
      }

      let loanNote = '';
      nextStress = clamp(nextStress + 1, 0, 100);
      if (nextLoan.activePayments > 0) {
        nextCash -= LOAN_INSTALLMENT;
        nextStress = clamp(nextStress + 1, 0, 100);
        nextLoan.activePayments -= 1;
        nextLoan.totalRepaid += LOAN_INSTALLMENT;
        loanNote = isEnglish ? ` (loan payment -${LOAN_INSTALLMENT.toLocaleString()} KRW)` : ` (대출상환 -${LOAN_INSTALLMENT.toLocaleString()}원)`;
      }

      if (nextCredit < 40) {
        nextCash -= 18000;
        nextStress = clamp(nextStress + 2, 0, 100);
        loanNote += isEnglish ? ' + low-credit fee' : ' + 저신용 패널티';
      }

      if (Math.random() < 0.22) {
        const surpriseCost = randInt(15000, 50000);
        const surpriseStress = randInt(2, 5);
        nextCash -= surpriseCost;
        nextStress = clamp(nextStress + surpriseStress, 0, 100);
        nextJoy = clamp(nextJoy - randInt(1, 3), 0, 100);
        loanNote += isEnglish
          ? ` + surprise expense -${surpriseCost.toLocaleString()} KRW`
          : ` + 돌발지출 -${surpriseCost.toLocaleString()}원`;
      }

      const next = {
        ...prev,
        turn: nextTurn,
        day: nextDay,
        cash: nextCash,
        stress: nextStress,
        joy: nextJoy,
        credit: nextCredit,
        loan: nextLoan,
        lessons: [
          isEnglish ? currentEvent.lessonEn : currentEvent.lesson,
          ...prev.lessons,
        ].slice(0, 5),
        logs: [
          {
            turn: nextTurn,
            title: isEnglish ? (choice.labelEn || choice.label) : choice.label,
            delta: `${signed(rolled.cash)}원${loanNote}`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };

      if (isFailed(next)) {
        if (!prev.usedBailout) {
          return { ...next, phase: 'bailout' };
        }
        return finalize(next, false);
      }

      if (nextTurn >= TOTAL_TURNS) {
        return finalize(next, true);
      }

      return {
        ...next,
        phase: 'waiting',
        waitingWork: { clicks: 0, earned: 0 },
        nextTurnAt: Date.now() + TURN_WAIT_MS,
      };
    });
  };

  const clickWorkIcon = () => {
    setGame((prev) => {
      if (prev.phase !== 'waiting' || !prev.employment) return prev;
      const earned = prev.employment.moneyPerClick;
      return {
        ...prev,
        cash: prev.cash + earned,
        waitingWork: {
          clicks: prev.waitingWork.clicks + 1,
          earned: prev.waitingWork.earned + earned,
        },
      };
    });
  };

  const buyCoinPack = async () => {
    if (coinCheckoutLoading) return;

    setCoinCheckoutLoading(true);
    try {
      const response = await createTossSurvivalCoinCheckoutSession({
        orderId: createSurvivalCoinPackOrderId(),
        orderName: isEnglish ? 'Finapple Survival Coin Pack' : '파인애플 생존 코인팩',
        customerName: 'Finapple User',
      });

      if (response.success && response.url) {
        window.location.href = response.url;
        return;
      }

      throw new Error(response.error || (isEnglish ? 'Failed to create coin payment.' : '코인 결제창 생성에 실패했습니다.'));
    } catch (error) {
      console.error('Coin checkout error:', error);
      window.alert(error.message || (isEnglish ? 'Payment failed. Please retry.' : '결제 처리 중 오류가 발생했습니다.'));
    } finally {
      setCoinCheckoutLoading(false);
    }
  };

  const continueWithCoins = () => {
    setGame((prev) => {
      if (prev.phase !== 'bailout') return prev;
      if (prev.coinBalance < CONTINUE_COST_COINS) return prev;
      if (prev.coinPurchasedPacks < 1) return prev;

      const next = {
        ...prev,
        phase: 'waiting',
        usedBailout: true,
        coinBalance: prev.coinBalance - CONTINUE_COST_COINS,
        cash: prev.cash + CONTINUE_CASH_BOOST,
        stress: clamp(prev.stress - 8, 0, 100),
        joy: clamp(prev.joy + 6, 0, 100),
        waitingWork: { clicks: 0, earned: 0 },
        nextTurnAt: Date.now() + TURN_WAIT_MS,
        logs: [
          {
            turn: prev.turn,
            title: isEnglish ? 'Emergency continue used' : '긴급 이어가기 사용',
            delta: `+${CONTINUE_CASH_BOOST.toLocaleString()}원 / -${CONTINUE_COST_COINS}${isEnglish ? ' coins' : '코인'}`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };

      if (isFailed(next)) {
        return finalize(next, false);
      }

      return next;
    });
  };

  const topUpCashWithCoins = () => {
    setGame((prev) => {
      if (prev.phase === 'result') return prev;
      if (prev.coinBalance < COIN_CASH_TOPUP_COST) return prev;

      const next = {
        ...prev,
        coinBalance: prev.coinBalance - COIN_CASH_TOPUP_COST,
        cash: prev.cash + COIN_CASH_TOPUP_AMOUNT,
        logs: [
          {
            turn: prev.turn,
            title: isEnglish ? 'Coin cash top-up' : '코인 잔고 보충',
            delta: `+${COIN_CASH_TOPUP_AMOUNT.toLocaleString()}원 / -${COIN_CASH_TOPUP_COST}${isEnglish ? ' coins' : '코인'}`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };

      return next;
    });
  };

  const giveUp = () => {
    setGame((prev) => finalize(prev, false));
  };

  const restart = () => {
    const nextBest = {
      bestCash: Math.max(best?.bestCash || 0, game.cash || 0),
      bestXpReward: Math.max(best?.bestXpReward || 0, game.xpAwarded || 0),
      updatedAt: new Date().toISOString(),
    };
    setBest(nextBest);
    saveBestRecord(nextBest);
    setGame(baseGame());
  };

  const loanDisabled = game.phase !== 'playing' || game.loan.activePayments >= LOAN_MAX_ACTIVE_PAYMENTS;
  const isEmployed = Boolean(game.employment);
  const canContinueWithCoins = game.coinBalance >= CONTINUE_COST_COINS && game.coinPurchasedPacks >= 1;

  return (
    <div className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-[#fdf7ee] via-[#f6f4ff] to-[#eef7ff] px-4 pb-8 pt-6 sm:px-6">
      <FloatingBackground />

      <section className="relative z-10 mx-auto max-w-4xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80">{isEnglish ? 'One-Month Survival' : '한달 생존'}</p>
              <h2 className="mt-1 text-[24px] font-extrabold text-foreground">
                {isEnglish
                  ? `Day ${Math.max(1, game.day)}/30 · Turn ${Math.min(game.turn + 1, TOTAL_TURNS)}/${TOTAL_TURNS}`
                  : `${Math.max(1, game.day)}일차 · ${Math.min(game.turn + 1, TOTAL_TURNS)}/${TOTAL_TURNS}턴`}
              </h2>
            </div>
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-[12px] font-bold text-foreground"
            >
              {isEnglish ? 'Enable turn notifications' : '턴 알림 켜기'}
            </button>
          </header>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/60">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Hud icon={Wallet} label={isEnglish ? 'Cash' : '잔고'} value={`${game.cash.toLocaleString()}원`} tone="text-emerald-700" />
            <Hud icon={Heart} label={isEnglish ? 'Joy' : '행복'} value={`${game.joy}`} tone="text-pink-700" />
            <Hud icon={AlertTriangle} label={isEnglish ? 'Stress' : '스트레스'} value={`${game.stress}`} tone="text-amber-700" />
            <Hud icon={Shield} label={isEnglish ? 'Credit' : '신용'} value={`${game.credit}`} tone="text-sky-700" />
            <Hud icon={Coins} label={isEnglish ? 'Coins' : '코인'} value={`${game.coinBalance}`} tone="text-violet-700" />
          </div>

          <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[12px] font-semibold text-foreground">
              {isEnglish ? 'Quiz benefits linked' : '퀴즈 연동 베네핏'}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {game.quizBuff?.level > 0
                ? (isEnglish
                  ? `${game.quizBuff.note}: start +${game.quizBuff.bonusCash.toLocaleString()} KRW, stress -${game.quizBuff.stressRelief}, coins +${game.quizBuff.bonusCoins}`
                  : `${game.quizBuff.note}: 시작 자금 +${game.quizBuff.bonusCash.toLocaleString()}원, 스트레스 -${game.quizBuff.stressRelief}, 코인 +${game.quizBuff.bonusCoins}`)
                : (isEnglish
                  ? 'Clear quizzes in the quiz tab to unlock stronger starting buffs for this mode.'
                  : '퀴즈 탭에서 퀴즈를 풀수록 이 모드 시작 버프가 강해져요.')}
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3">
            <p className="text-[12px] font-semibold text-foreground">
              {isEnglish
                ? `Credit role: below 40 triggers low-credit penalty each turn. Loans create mandatory repayments over the next 2 turns.`
                : `신용 역할: 40 미만이면 매 턴 저신용 패널티 발생. 대출하면 이후 2턴 동안 의무 상환이 걸려요.`}
            </p>
            <button
              type="button"
              onClick={takeLoan}
              disabled={loanDisabled}
              className={`mt-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${loanDisabled ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
            >
              {isEnglish
                ? `Take loan +${LOAN_PRINCIPAL.toLocaleString()} KRW (repay ${LOAN_INSTALLMENT.toLocaleString()} x${LOAN_MAX_ACTIVE_PAYMENTS})`
                : `생활비 대출 +${LOAN_PRINCIPAL.toLocaleString()}원 (상환 ${LOAN_INSTALLMENT.toLocaleString()}원 x${LOAN_MAX_ACTIVE_PAYMENTS})`}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3">
            <p className="text-[12px] font-semibold text-foreground">
              {isEnglish
                ? `Coin top-up: spend ${COIN_CASH_TOPUP_COST} coins to add ${COIN_CASH_TOPUP_AMOUNT.toLocaleString()} KRW cash.`
                : `코인 보충: 코인 ${COIN_CASH_TOPUP_COST}개를 쓰면 잔고 ${COIN_CASH_TOPUP_AMOUNT.toLocaleString()}원이 충전돼요.`}
            </p>
            <button
              type="button"
              onClick={topUpCashWithCoins}
              disabled={game.phase === 'result' || game.coinBalance < COIN_CASH_TOPUP_COST}
              className={`mt-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                game.phase !== 'result' && game.coinBalance >= COIN_CASH_TOPUP_COST
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isEnglish ? 'Top up cash with 10 coins' : '코인 10개로 잔고 +10만원'}
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3">
            <p className="text-[12px] font-semibold text-foreground">
              {isEnglish
                ? 'Employment option: once hired, tap the work icon during turn cooldown to earn money.'
                : '취업 옵션: 취업하면 턴 대기 시간에 아이콘 연타로 돈을 벌 수 있어요.'}
            </p>
            {isEmployed ? (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {isEnglish
                  ? `${game.employment.emoji} ${game.employment.nameEn} · +${game.employment.moneyPerClick} KRW per tap · stress +${game.employment.stressAfterWork} after work`
                  : `${game.employment.emoji} ${game.employment.name} · 클릭당 +${game.employment.moneyPerClick}원 · 근무 후 스트레스 +${game.employment.stressAfterWork}`}
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {EMPLOYMENT_PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => takeEmployment(plan)}
                    disabled={game.phase !== 'playing'}
                    className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                      game.phase === 'playing'
                        ? 'border-border bg-white hover:border-primary/40'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="text-[13px] font-extrabold text-foreground">{plan.emoji} {isEnglish ? plan.nameEn : plan.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isEnglish
                        ? `+${plan.moneyPerClick} KRW/tap · stress +${plan.stressAfterWork}`
                        : `클릭당 +${plan.moneyPerClick}원 · 스트레스 +${plan.stressAfterWork}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {game.phase === 'playing' ? (
            <PlayScene
              event={currentEvent}
              isEnglish={isEnglish}
              onChoose={applyChoice}
              workerEmoji={game.employment?.emoji || '🧑‍💼'}
            />
          ) : null}

          {game.phase === 'waiting' ? (
            <WorkScene
              isEnglish={isEnglish}
              countdown={countdown}
              totalSeconds={Math.floor(TURN_WAIT_MS / 1000)}
              workerEmoji={game.employment?.emoji || '🧑‍💼'}
              canWork={isEmployed}
              moneyPerClick={game.employment?.moneyPerClick || 0}
              clickCount={game.waitingWork.clicks}
              earned={game.waitingWork.earned}
              onWorkClick={clickWorkIcon}
            />
          ) : null}

          {game.phase === 'bailout' ? (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50/95 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-600">{isEnglish ? 'Emergency Continue' : '긴급 이어가기'}</p>
              <h3 className="mt-1 text-[22px] font-extrabold text-rose-700">
                {isEnglish ? 'You failed. One continue is available with coins.' : '패배 발생. 코인으로 1회 이어가기 가능.'}
              </h3>
              <p className="mt-1 text-[13px] text-rose-700/80">
                {isEnglish
                  ? `Coin pack product: ${COIN_PACK_AMOUNT} coins / ${SURVIVAL_COIN_PACK_PRICE.toLocaleString()} KRW`
                  : `코인팩 상품: ${COIN_PACK_AMOUNT}코인 / ${SURVIVAL_COIN_PACK_PRICE.toLocaleString()}원`}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={buyCoinPack}
                  disabled={coinCheckoutLoading}
                  className="rounded-2xl border border-rose-300 bg-white px-4 py-3 text-left transition-colors hover:border-rose-500"
                >
                  <p className="text-[14px] font-extrabold text-foreground">{isEnglish ? 'Buy coin pack (10)' : '코인팩 구매 (10코인)'}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {coinCheckoutLoading
                      ? (isEnglish ? 'Creating Toss checkout...' : '토스 결제창 생성 중...')
                      : `${SURVIVAL_COIN_PACK_PRICE.toLocaleString()}원`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={continueWithCoins}
                  disabled={!canContinueWithCoins}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    canContinueWithCoins
                      ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-500'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <p className="text-[14px] font-extrabold">{isEnglish ? 'Continue run' : '이어가기'}</p>
                  <p className="mt-1 text-[12px]">
                    {isEnglish
                      ? `${CONTINUE_COST_COINS} coins + at least 1 purchased pack required`
                      : `${CONTINUE_COST_COINS}코인 + 코인팩 구매 이력 1회 이상 필요`}
                  </p>
                </button>
              </div>
              <button type="button" onClick={giveUp} className="mt-3 text-[12px] font-semibold text-rose-700 underline">
                {isEnglish ? 'Give up and finish run' : '포기하고 종료'}
              </button>
            </div>
          ) : null}

          {game.phase === 'result' ? (
            <div className="mt-5 rounded-3xl border border-border bg-card/95 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{isEnglish ? 'Game Result' : '게임 결과'}</p>
              <h3 className="mt-1 text-[25px] font-extrabold text-foreground">
                {game.result === 'success'
                  ? (isEnglish ? 'One-Month Survival Success!' : '한달 생존 성공!')
                  : (isEnglish ? 'One-Month Survival Failed' : '한달 생존 실패')}
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {game.result === 'success'
                  ? (isEnglish ? `Reward: +${game.xpAwarded} XP` : `보상: +${game.xpAwarded} XP`)
                  : (isEnglish ? `Defeat reason: ${game.failReason} · +${game.xpAwarded} XP` : `패배 원인: ${game.failReason} · 위로보상 +${game.xpAwarded} XP`)}
              </p>
              <ul className="mt-3 space-y-1.5">
                {(game.lessons.length ? game.lessons : [isEnglish ? 'No lesson captured.' : '기록된 학습 포인트 없음']).map((lesson) => (
                  <li key={lesson} className="text-[12px] text-foreground">• {lesson}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={restart}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground"
              >
                {isEnglish ? 'Start new run' : '새 런 시작'}
              </button>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl bg-white/70 px-3 py-2 text-[12px] text-muted-foreground">
            {isEnglish
              ? `Best record: cash ${(best?.bestCash || 0).toLocaleString()} KRW · best XP reward ${best?.bestXpReward || 0}`
              : `최고기록: 현금 ${(best?.bestCash || 0).toLocaleString()}원 · 최고 보상 XP ${best?.bestXpReward || 0}`}
          </div>
      </section>

      <style>{`
        .character-float { animation: bob 3s ease-in-out infinite; }
        .bg-orb { animation: drift 9s ease-in-out infinite; }
        .typing-bar { animation: typing 0.9s ease-in-out infinite; }
        .steam { animation: steam 2.4s ease-in-out infinite; }
        .blink-dot { animation: blink 1.2s step-end infinite; }
        @keyframes bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, -10px); } }
        @keyframes typing { 0%, 100% { opacity: 0.35; width: 28%; } 50% { opacity: 0.95; width: 52%; } }
        @keyframes steam { 0% { transform: translateY(0px); opacity: 0.1; } 50% { transform: translateY(-9px); opacity: 0.5; } 100% { transform: translateY(-14px); opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

function PlayScene({ event, isEnglish, onChoose, workerEmoji }) {
  return (
    <div className="relative mt-5 min-h-[340px] rounded-3xl border border-white/60 bg-white/35 p-4 backdrop-blur-sm">
      <div className="mt-2 flex justify-center">
        <div className="character-float text-[42px]">{workerEmoji}</div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-[20px] font-extrabold text-foreground">{isEnglish ? event.titleEn : event.title}</p>
        <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{isEnglish ? event.bodyEn : event.body}</p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {event.choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => onChoose(choice)}
            className="rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <p className="text-[14px] font-extrabold text-foreground">{isEnglish ? choice.labelEn : choice.label}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{hint(choice, isEnglish)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkScene({
  isEnglish,
  countdown,
  totalSeconds,
  workerEmoji,
  canWork,
  moneyPerClick,
  clickCount,
  earned,
  onWorkClick,
}) {
  const waitProgress = Math.round(((totalSeconds - countdown) / totalSeconds) * 100);

  return (
    <div className="mt-5 rounded-3xl border border-border bg-card/90 p-5">
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-white/70 p-4 shadow-sm">
        <div className="relative h-[170px] overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100">
          <div className="absolute left-6 right-6 bottom-5 h-10 rounded-xl bg-slate-300/70" />
          <div className="absolute left-1/2 bottom-11 flex -translate-x-1/2 items-end gap-3">
            <div className="character-float text-[44px]">{workerEmoji}</div>
            <div className="mb-2 h-14 w-16 rounded-md border border-slate-400/70 bg-slate-50 p-1.5">
              <div className="typing-bar h-1.5 rounded-full bg-emerald-500" />
              <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-slate-300" />
              <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-slate-300" />
            </div>
            <div className="mb-2 flex flex-col items-center">
              <div className="relative h-8 w-8 rounded-full border border-slate-300 bg-white">
                <div className="steam absolute left-1/2 top-0 h-3 w-1 -translate-x-1/2 rounded-full bg-slate-300/80" />
                <div className="steam absolute left-[60%] top-1 h-2.5 w-1 rounded-full bg-slate-300/70" style={{ animationDelay: '0.5s' }} />
              </div>
              <div className="mt-1 h-1.5 w-6 rounded-full bg-slate-300/80" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-[17px] font-extrabold text-foreground">
        {isEnglish ? 'Working hard between turns' : '캐릭터가 열일하는 중'}
      </p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        {isEnglish
          ? `Next turn unlocks in ${countdown}s.`
          : `${countdown}초 후 다음 턴 오픈.`}
      </p>

      <div className="mx-auto mt-3 max-w-md rounded-2xl border border-border/60 bg-white/70 p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>{isEnglish ? 'Task progress' : '업무 진행도'}</span>
          <span>{waitProgress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${waitProgress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-center gap-1 text-[12px] text-slate-500">
          <span className="blink-dot">●</span>
          <span className="blink-dot" style={{ animationDelay: '0.2s' }}>●</span>
          <span className="blink-dot" style={{ animationDelay: '0.4s' }}>●</span>
          <span className="ml-1">{isEnglish ? 'clocking in...' : '근무중...'}</span>
        </div>
      </div>

      <div className="mx-auto mt-3 max-w-md rounded-2xl border border-border/60 bg-white/80 p-3">
        <p className="text-center text-[12px] font-semibold text-foreground">
          {canWork
            ? (isEnglish ? `Tap the icon: +${moneyPerClick} KRW per tap` : `아이콘 연타: 클릭당 +${moneyPerClick}원`)
            : (isEnglish ? 'Get employed first to earn by tapping during cooldown.' : '먼저 취업해야 대기 중 연타 수익을 벌 수 있어요.')}
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onWorkClick}
            disabled={!canWork}
            className={`h-14 w-14 rounded-full border text-[26px] ${
              canWork
                ? 'border-emerald-400 bg-emerald-50 active:scale-95'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            💸
          </button>
          <div className="text-[12px] text-muted-foreground">
            <p>{isEnglish ? `Taps: ${clickCount}` : `연타 수: ${clickCount}`}</p>
            <p>{isEnglish ? `Earned: +${earned.toLocaleString()} KRW` : `획득: +${earned.toLocaleString()}원`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function hint(choice, isEnglish) {
  const b = choice.base;
  return isEnglish
    ? `base cash ${signed(b.cash)} · joy ${signed(b.joy)} · stress ${signed(b.stress)} (random variance)`
    : `기본 현금 ${signed(b.cash)} · 행복 ${signed(b.joy)} · 스트레스 ${signed(b.stress)} (랜덤 변동)`;
}

function Hud({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        {label}
      </p>
      <p className={`mt-1 text-[14px] font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function FloatingBackground() {
  return (
    <>
      <div className="bg-orb pointer-events-none absolute -left-8 top-20 h-24 w-24 rounded-full bg-pink-200/50 blur-xl" />
      <div className="bg-orb pointer-events-none absolute right-10 top-12 h-20 w-20 rounded-full bg-sky-200/50 blur-xl" style={{ animationDelay: '1s' }} />
      <div className="bg-orb pointer-events-none absolute bottom-8 left-1/3 h-28 w-28 rounded-full bg-violet-200/40 blur-xl" style={{ animationDelay: '0.7s' }} />
    </>
  );
}
