import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Coins, Heart, LoaderCircle, Shield, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import useProgress from '@/lib/useProgress';
import { useAuth } from '@/lib/AuthContext';
import {
  COIN_PACK_AMOUNT,
  SURVIVAL_COIN_PACK_PRICE,
  createSurvivalCoinPackOrderId,
  createTossSurvivalCoinCheckoutSession,
  confirmTossSurvivalCoinPayment,
} from '@/api/paymentClient';
import { isNativeIOSApp } from '@/lib/runtimePlatform';
import {
  canUseRevenueCat,
  getRevenueCatSurvivalCoinPack,
  purchaseRevenueCatSurvivalCoinPack,
} from '@/services/revenueCatService';

const TOTAL_TURNS = 8;
const TURN_WAIT_MS = 45 * 1000;
const INACTIVITY_RESET_MS = 10 * 60 * 1000;
const EMPLOYMENT_TURN = 2;
const CROSSROAD_TURNS = new Set([0, 1, 4, 6, 7]);
const ALLOWANCE_OPEN_AT_TURNS = new Set([4, 6]);
const CONTINUE_COST_COINS = 10;
const CONTINUE_CASH_BOOST = 220000;
const COIN_CASH_TOPUP_COST = 10;
const COIN_CASH_TOPUP_AMOUNT = 100000;
const LOAN_PRINCIPAL = 160000;
const LOAN_INSTALLMENT = 90000;
const LOAN_MAX_ACTIVE_PAYMENTS = 2;
const FAIL_STRESS_THRESHOLD = 90;
const DEFAULT_START_CASH = 240000;
const AGE_BY_TURN = [18, 20, 23, 27, 34, 43, 54, 64, 71];

const BEST_KEY = 'finapple:survival:best:v6';
const GAME_KEY = 'finapple:survival:state:v6';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const EMPLOYMENT_PLANS = [
  {
    key: 'part-time',
    emoji: '🛵',
    name: '편한 알바',
    nameEn: 'Easy Part-time',
    moneyPerClick: 120,
    stressAfterWork: 8,
    description: '클릭당 수입은 적지만 업무 강도가 낮음.',
    descriptionEn: 'Lower income per tap, lighter workload stress.',
  },
  {
    key: 'office',
    emoji: '💼',
    name: '사무직',
    nameEn: 'Office Job',
    moneyPerClick: 170,
    stressAfterWork: 10,
    description: '수입과 강도의 밸런스형.',
    descriptionEn: 'Balanced option between income and stress.',
  },
  {
    key: 'high-intensity',
    emoji: '🔥',
    name: '고강도 업무',
    nameEn: 'High-intensity Work',
    moneyPerClick: 230,
    stressAfterWork: 12,
    description: '클릭 수익이 큰 대신 스트레스 급상승.',
    descriptionEn: 'Highest tap income with heavy stress load.',
  },
];

const EARLY_WORK_EMPLOYMENT_PLANS = [
  {
    key: 'service-cashier',
    emoji: '🧾',
    name: '매장 캐셔',
    nameEn: 'Store Cashier',
    moneyPerClick: 85,
    stressAfterWork: 8,
    description: '진입은 빠르지만 초반 소득은 낮은 편.',
    descriptionEn: 'Fast entry, but lower early income.',
  },
  {
    key: 'delivery-helper',
    emoji: '🛵',
    name: '배달 보조',
    nameEn: 'Delivery Helper',
    moneyPerClick: 105,
    stressAfterWork: 10,
    description: '수입은 조금 높지만 피로도 상승.',
    descriptionEn: 'Slightly better pay, higher fatigue.',
  },
  {
    key: 'factory-assistant',
    emoji: '🏭',
    name: '생산 보조',
    nameEn: 'Factory Assistant',
    moneyPerClick: 120,
    stressAfterWork: 12,
    description: '초반 최고 수입이지만 체력 소모 큼.',
    descriptionEn: 'Highest early pay, but physically demanding.',
  },
];

const EVENTS = [
  {
    id: 'school-choice',
    title: '고등학교 진학 선택',
    titleEn: 'High School Path Choice',
    body: '초반 선택이 평생 소득과 신용 습관의 시작점이 됩니다.',
    bodyEn: 'Early choices shape lifetime income and credit habits.',
    lesson: '초기 학습 투자와 습관 형성이 장기 소득에 큰 영향을 줍니다.',
    lessonEn: 'Early education and habits strongly impact long-term income.',
    choices: [
      {
        id: 'school-path',
        label: '성실하게 학교 다니기',
        labelEn: 'Attend school diligently',
        base: { cash: -90000, stress: 2, joy: -1, credit: 8 },
        variance: { cash: 25000, stress: 2, joy: 2, credit: 2 },
      },
      {
        id: 'early-work-path',
        label: '학교 건너뛰고 바로 돈벌기',
        labelEn: 'Skip school and earn now',
        base: { cash: 45000, stress: 1, joy: 2, credit: -10 },
        variance: { cash: 30000, stress: 3, joy: 3, credit: 3 },
      },
    ],
  },
  {
    id: 'school-habit',
    title: '학교생활 습관 만들기',
    titleEn: 'Build School Habits',
    body: '기초 금융 습관을 만들지, 즉흥 소비를 늘릴지 결정하는 구간입니다.',
    bodyEn: 'Choose between building financial habits or impulsive spending.',
    lesson: '소액 반복 소비 관리가 장기 자금관리의 핵심입니다.',
    lessonEn: 'Managing recurring small spending is key to long-term cash control.',
    choices: [
      {
        label: '가계부 습관 들이기',
        labelEn: 'Start a budget journal',
        base: { cash: 25000, stress: 1, joy: -1, credit: 5 },
        variance: { cash: 22000, stress: 2, joy: 2, credit: 2 },
      },
      {
        label: '충동구매 습관 유지',
        labelEn: 'Keep impulse buying',
        base: { cash: -75000, stress: 2, joy: 2, credit: -6 },
        variance: { cash: 26000, stress: 3, joy: 3, credit: 2 },
      },
    ],
  },
  {
    id: 'first-job',
    title: '첫 취업 시작',
    titleEn: 'Start First Job',
    body: '이 턴에서 직업을 고르고, 이후 연타 소득의 기본 단가가 결정됩니다.',
    bodyEn: 'Choose your job this turn. It sets your tap-income base later.',
    lesson: '소득원 선택은 신용관리와 부채상환 속도를 좌우합니다.',
    lessonEn: 'Income source choice affects credit management and debt speed.',
    choices: [
      {
        label: '안정형 경력 선택',
        labelEn: 'Choose stable career path',
        base: { cash: 70000, stress: 1, joy: 0, credit: 4 },
        variance: { cash: 30000, stress: 2, joy: 2, credit: 2 },
      },
      {
        label: '고수익 고강도 도전',
        labelEn: 'Take high-pay intense route',
        base: { cash: 120000, stress: 4, joy: 1, credit: -2 },
        variance: { cash: 50000, stress: 3, joy: 3, credit: 3 },
      },
    ],
  },
  {
    id: 'independence',
    title: '독립 생활 시작',
    titleEn: 'Start Independent Living',
    body: '월세와 생활비가 본격적으로 발생합니다. 현금흐름을 지키세요.',
    bodyEn: 'Rent and living costs kick in. Protect your cash flow.',
    lesson: '독립 초기에는 고정비를 먼저 통제해야 생존 확률이 올라갑니다.',
    lessonEn: 'In early independence, controlling fixed costs increases survival odds.',
    choices: [
      {
        label: '고정비 먼저 정리',
        labelEn: 'Control fixed costs first',
        base: { cash: -120000, stress: -1, joy: -1, credit: 3 },
        variance: { cash: 35000, stress: 2, joy: 2, credit: 2 },
      },
      {
        label: '카드로 버티기',
        labelEn: 'Survive with card spending',
        base: { cash: -60000, stress: 2, joy: 1, credit: -8 },
        variance: { cash: 30000, stress: 3, joy: 2, credit: 2 },
      },
    ],
  },
  {
    id: 'allowance',
    title: '부모님께 용돈 요청',
    titleEn: 'Ask Parents for Allowance',
    body: '연타 이벤트! 버튼을 많이 누를수록 용돈이 늘어나지만, 과하면 스트레스가 쌓입니다.',
    bodyEn: 'Tap event! More taps earn more allowance, but too much raises stress.',
    lesson: '소득을 늘려도 감정비용(스트레스)을 함께 관리해야 합니다.',
    lessonEn: 'Even with higher income, emotional costs (stress) must be managed.',
    choices: [
      {
        label: '정중하게 요청하기',
        labelEn: 'Ask politely',
        base: { cash: 55000, stress: 0, joy: 1, credit: 2 },
        variance: { cash: 25000, stress: 2, joy: 2, credit: 1 },
      },
      {
        label: '연타로 용돈 조르기',
        labelEn: 'Tap-spam allowance request',
        base: { cash: 15000, stress: 1, joy: 3, credit: -2 },
        variance: { cash: 15000, stress: 2, joy: 2, credit: 2 },
        tapEvent: {
          cashPerTap: 180,
          maxTaps: 100,
          stressPer10: 1,
        },
      },
    ],
  },
  {
    id: 'loan-credit',
    title: '신용카드/대출 관리',
    titleEn: 'Credit Card / Loan Management',
    body: '이 시점부터 신용 점수가 낮으면 패널티가 커집니다.',
    bodyEn: 'From here, low credit causes heavier penalties.',
    lesson: '신용 점수는 이자, 수수료, 대출 여력에 직접 연결됩니다.',
    lessonEn: 'Credit score directly impacts fees, interest, and loan capacity.',
    choices: [
      {
        label: '상환 우선 전략',
        labelEn: 'Repayment-first strategy',
        base: { cash: -100000, stress: 1, joy: -1, credit: 8 },
        variance: { cash: 30000, stress: 2, joy: 2, credit: 2 },
      },
      {
        label: '리볼빙으로 버티기',
        labelEn: 'Rely on revolving credit',
        base: { cash: -35000, stress: 4, joy: 0, credit: -12 },
        variance: { cash: 18000, stress: 3, joy: 2, credit: 3 },
      },
    ],
  },
  {
    id: 'retirement-prep',
    title: '퇴직 준비와 연금 설계',
    titleEn: 'Retirement Prep & Pension Plan',
    body: '퇴직 직전, 현금흐름과 연금 선택으로 노후 안정성이 갈립니다.',
    bodyEn: 'Right before retirement, cashflow and pension choices define stability.',
    lesson: '노후 준비는 늦을수록 비용이 급격히 커집니다.',
    lessonEn: 'The later retirement prep starts, the higher the cost.',
    choices: [
      {
        label: '지출 줄이고 연금 준비',
        labelEn: 'Cut spending and prep pension',
        base: { cash: 80000, stress: 1, joy: -1, credit: 5 },
        variance: { cash: 26000, stress: 2, joy: 2, credit: 2 },
      },
      {
        label: '퇴직 전 소비 확장',
        labelEn: 'Expand spending before retirement',
        base: { cash: -180000, stress: 2, joy: 4, credit: -8 },
        variance: { cash: 50000, stress: 3, joy: 3, credit: 3 },
      },
    ],
  },
  {
    id: 'retirement',
    title: '퇴직과 연금 수령',
    titleEn: 'Retirement and Pension Claim',
    body: '마지막 선택입니다. 연금 수령 방식에 따라 안정성이 달라집니다.',
    bodyEn: 'Final choice. Pension strategy changes retirement stability.',
    lesson: '연금은 단순 수령이 아니라 현금흐름 설계입니다.',
    lessonEn: 'Pension is not just claiming money, it is cashflow design.',
    choices: [
      {
        label: '연금 즉시 수령 + 생활비 관리',
        labelEn: 'Claim pension now + manage expenses',
        base: { cash: 260000, stress: -3, joy: 3, credit: 4 },
        variance: { cash: 45000, stress: 2, joy: 2, credit: 1 },
      },
      {
        label: '연금 일부 미루고 투자 확대',
        labelEn: 'Delay part of pension and invest more',
        base: { cash: 120000, stress: 2, joy: 2, credit: -5 },
        variance: { cash: 80000, stress: 4, joy: 3, credit: 3 },
      },
    ],
  },
];

const PASSIVE_TURN_EFFECTS = {
  3: {
    title: '초년생 적응기',
    titleEn: 'Early Career Adjustment',
    body: '월급은 들어오지만 지출도 빠르게 늘어나는 시기입니다.',
    bodyEn: 'Salary comes in, but expenses rise quickly too.',
    base: { cash: -60000, stress: 2, joy: -1, credit: 1 },
    variance: { cash: 25000, stress: 2, joy: 2, credit: 1 },
  },
  5: {
    title: '가정·주거비 상승기',
    titleEn: 'Family & Housing Cost Surge',
    body: '생활비가 커집니다. 현금흐름을 놓치면 바로 흔들립니다.',
    bodyEn: 'Living costs grow. Lose cashflow control and stability drops fast.',
    base: { cash: -90000, stress: 3, joy: -1, credit: -1 },
    variance: { cash: 30000, stress: 2, joy: 2, credit: 2 },
  },
};

function baseGame() {
  return {
    phase: 'playing',
    turn: 0,
    age: AGE_BY_TURN[0],
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
    educationPath: 'school',
    employmentUnlockTurn: EMPLOYMENT_TURN,
    waitingWork: {
      clicks: 0,
      earned: 0,
    },
    allowanceOpen: false,
    allowanceTapCount: 0,
    allowanceOpenedTurns: [],
    tapCombo: 0,
    tapMultiplier: 1,
    lastTapAt: 0,
    totalTapIncome: 0,
    startBuffApplied: false,
    result: null,
    failReason: '',
    xpAwarded: 0,
    xpAwardedDone: false,
    updatedAt: Date.now(),
    lastInteractionAt: Date.now(),
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
    educationPath: parsed.educationPath || 'school',
    employmentUnlockTurn: Number.isInteger(parsed.employmentUnlockTurn) ? parsed.employmentUnlockTurn : EMPLOYMENT_TURN,
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
  const navigate = useNavigate();
  const location = useLocation();
  const { isEnglish } = useLanguage();
  const { user } = useAuth();
  const { awardXp, getProgressSummary } = useProgress();
  const [best, setBest] = useState(loadBestRecord);
  const [game, setGame] = useState(() => {
    const loaded = loadGameState();
    return loaded || baseGame();
  });
  const [nowTs, setNowTs] = useState(Date.now());
  const [coinCheckoutLoading, setCoinCheckoutLoading] = useState(false);
  const [iosCoinPackage, setIosCoinPackage] = useState(null);
  const [iosCoinError, setIosCoinError] = useState('');
  const nativeIOS = isNativeIOSApp();
  const revenueCatEnabled = canUseRevenueCat();
  const notifiedRef = useRef(false);
  const turnNotifyTimerRef = useRef(null);
  const notifiedTurnRef = useRef(-1);

  const crossroadEventByTurn = useMemo(() => ({
    0: EVENTS[0],
    1: EVENTS[1],
    4: EVENTS[5],
    6: EVENTS[6],
    7: EVENTS[7],
  }), []);
  const currentEvent = crossroadEventByTurn[game.turn] || EVENTS[0];
  const isCrossroadTurn = CROSSROAD_TURNS.has(game.turn);
  const passiveEffect = PASSIVE_TURN_EFFECTS[game.turn] || null;
  const progress = Math.round((game.turn / TOTAL_TURNS) * 100);
  const progressSummary = getProgressSummary?.() || { completedCount: 0 };
  const availableEmploymentPlans = game.educationPath === 'early-work' ? EARLY_WORK_EMPLOYMENT_PLANS : EMPLOYMENT_PLANS;

  useEffect(() => {
    if (!nativeIOS) {
      setIosCoinPackage(null);
      setIosCoinError('');
      return;
    }

    let cancelled = false;

    const loadCoinPack = async () => {
      if (!revenueCatEnabled) {
        if (!cancelled) {
          setIosCoinPackage(null);
          setIosCoinError('Apple Developer Program 가입 후 App Store Connect와 RevenueCat에 코인팩 상품을 연결하면 여기서 인앱결제를 사용할 수 있어요.');
        }
        return;
      }

      try {
        const paywall = await getRevenueCatSurvivalCoinPack(user);
        if (cancelled) {
          return;
        }

        if (!paywall?.selectedPackage) {
          setIosCoinPackage(null);
          setIosCoinError('RevenueCat에서 생존 코인팩 offering/package를 아직 찾지 못했어요.');
          return;
        }

        setIosCoinPackage(paywall.selectedPackage);
        setIosCoinError('');
      } catch (error) {
        if (!cancelled) {
          setIosCoinPackage(null);
          setIosCoinError(error.message || 'iOS 코인팩 상품을 불러오지 못했습니다.');
        }
      }
    };

    void loadCoinPack();

    return () => {
      cancelled = true;
    };
  }, [nativeIOS, revenueCatEnabled, user]);

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
          body: isEnglish ? 'Come back and continue your life finance run.' : '돌아와서 인생 금융 런을 이어가세요.',
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
        body: isEnglish ? 'Come back and continue your life finance run.' : '돌아와서 인생 금융 런을 이어가세요.',
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

  useEffect(() => {
    const markInteraction = () => {
      setGame((prev) => {
        const now = Date.now();
        if (now - (prev.lastInteractionAt || 0) < 300) {
          return prev;
        }
        return { ...prev, lastInteractionAt: now };
      });
    };

    window.addEventListener('touchstart', markInteraction, { passive: true });
    window.addEventListener('pointerdown', markInteraction);
    window.addEventListener('keydown', markInteraction);

    return () => {
      window.removeEventListener('touchstart', markInteraction);
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, []);

  useEffect(() => {
    if (!['playing', 'waiting', 'bailout'].includes(game.phase)) {
      return;
    }

    const lastInteractionAt = game.lastInteractionAt || Date.now();
    if (nowTs - lastInteractionAt < INACTIVITY_RESET_MS) {
      return;
    }

    setGame((prev) => {
      if (!['playing', 'waiting', 'bailout'].includes(prev.phase)) {
        return prev;
      }
      const inactiveMs = Date.now() - (prev.lastInteractionAt || Date.now());
      if (inactiveMs < INACTIVITY_RESET_MS) {
        return prev;
      }
      return baseGame();
    });
  }, [game.lastInteractionAt, game.phase, nowTs]);

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
      if (prev.turn !== prev.employmentUnlockTurn) return prev;
      const allowedPlans = prev.educationPath === 'early-work' ? EARLY_WORK_EMPLOYMENT_PLANS : EMPLOYMENT_PLANS;
      if (!allowedPlans.some((entry) => entry.key === plan.key)) return prev;

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
      if (prev.turn === prev.employmentUnlockTurn && !prev.employment) return prev;

      const rolledRaw = rollChoice(choice);
      const rolled = {
        cash: rolledRaw.cash < 0 ? Math.round(rolledRaw.cash * 0.75) : rolledRaw.cash,
        stress: rolledRaw.stress > 0 ? Math.round(rolledRaw.stress * 0.7) : Math.round(rolledRaw.stress * 1.6),
        joy: rolledRaw.joy < 0 ? Math.round(rolledRaw.joy * 0.7) : rolledRaw.joy,
        credit: rolledRaw.credit,
      };
      const nextTurn = prev.turn + 1;
      const nextAge = AGE_BY_TURN[nextTurn] || prev.age + 5;

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
        age: nextAge,
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

      if (currentEvent.id === 'school-choice') {
        if (choice.id === 'early-work-path') {
          next.educationPath = 'early-work';
          next.employmentUnlockTurn = Math.min(prev.turn + 1, TOTAL_TURNS - 1);
        } else {
          next.educationPath = 'school';
          next.employmentUnlockTurn = EMPLOYMENT_TURN;
        }
      }

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
        allowanceOpen: ALLOWANCE_OPEN_AT_TURNS.has(nextTurn) && !prev.allowanceOpenedTurns.includes(nextTurn),
        allowanceTapCount: 0,
        allowanceOpenedTurns: ALLOWANCE_OPEN_AT_TURNS.has(nextTurn) && !prev.allowanceOpenedTurns.includes(nextTurn)
          ? [...prev.allowanceOpenedTurns, nextTurn]
          : prev.allowanceOpenedTurns,
        nextTurnAt: Date.now() + TURN_WAIT_MS,
      };
    });
  };

  const advancePassiveTurn = () => {
    setGame((prev) => {
      if (prev.phase !== 'playing' || isCrossroadTurn || prev.turn === prev.employmentUnlockTurn) return prev;
      const effect = PASSIVE_TURN_EFFECTS[prev.turn];
      if (!effect) return prev;

      const rolledRaw = {
        cash: effect.base.cash + randInt(-effect.variance.cash, effect.variance.cash),
        stress: effect.base.stress + randInt(-effect.variance.stress, effect.variance.stress),
        joy: effect.base.joy + randInt(-effect.variance.joy, effect.variance.joy),
        credit: effect.base.credit + randInt(-effect.variance.credit, effect.variance.credit),
      };

      const nextTurn = prev.turn + 1;
      const nextAge = AGE_BY_TURN[nextTurn] || prev.age + 5;
      const nextLoan = { ...prev.loan };
      let nextCash = prev.cash + rolledRaw.cash;
      let nextStress = clamp(prev.stress + rolledRaw.stress + 1, 0, 100);
      let nextJoy = clamp(prev.joy + rolledRaw.joy, 0, 100);
      let nextCredit = clamp(prev.credit + rolledRaw.credit, 0, 100);
      let loanNote = '';

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

      const next = {
        ...prev,
        turn: nextTurn,
        age: nextAge,
        cash: nextCash,
        stress: nextStress,
        joy: nextJoy,
        credit: nextCredit,
        loan: nextLoan,
        logs: [
          {
            turn: nextTurn,
            title: isEnglish ? effect.titleEn : effect.title,
            delta: `${signed(rolledRaw.cash)}원${loanNote}`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };

      if (isFailed(next)) {
        if (!prev.usedBailout) return { ...next, phase: 'bailout' };
        return finalize(next, false);
      }

      if (nextTurn >= TOTAL_TURNS) return finalize(next, true);

      return {
        ...next,
        phase: 'waiting',
        waitingWork: { clicks: 0, earned: 0 },
        allowanceOpen: ALLOWANCE_OPEN_AT_TURNS.has(nextTurn) && !prev.allowanceOpenedTurns.includes(nextTurn),
        allowanceTapCount: 0,
        allowanceOpenedTurns: ALLOWANCE_OPEN_AT_TURNS.has(nextTurn) && !prev.allowanceOpenedTurns.includes(nextTurn)
          ? [...prev.allowanceOpenedTurns, nextTurn]
          : prev.allowanceOpenedTurns,
        nextTurnAt: Date.now() + TURN_WAIT_MS,
      };
    });
  };

  const clickWorkIcon = () => {
    setGame((prev) => {
      if (prev.phase !== 'waiting' || !prev.employment) return prev;
      const now = Date.now();
      const continuedCombo = now - (prev.lastTapAt || 0) <= 700;
      const nextCombo = continuedCombo ? clamp(prev.tapCombo + 1, 1, 25) : 1;
      const nextMultiplier = Math.min(2, Number((1 + (nextCombo - 1) * 0.04).toFixed(2)));
      const earned = Math.round(prev.employment.moneyPerClick * nextMultiplier);
      const stressGain = nextCombo % 12 === 0 ? 1 : 0;
      return {
        ...prev,
        cash: prev.cash + earned,
        stress: clamp(prev.stress + stressGain, 0, 100),
        waitingWork: {
          clicks: prev.waitingWork.clicks + 1,
          earned: prev.waitingWork.earned + earned,
        },
        tapCombo: nextCombo,
        tapMultiplier: nextMultiplier,
        lastTapAt: now,
        totalTapIncome: prev.totalTapIncome + earned,
      };
    });
  };

  const tapAllowanceDuringWait = () => {
    setGame((prev) => {
      if (prev.phase !== 'waiting' || !prev.allowanceOpen) return prev;
      return {
        ...prev,
        allowanceTapCount: clamp((prev.allowanceTapCount || 0) + 1, 0, 100),
      };
    });
  };

  const claimAllowance = () => {
    setGame((prev) => {
      if (prev.phase !== 'waiting' || !prev.allowanceOpen) return prev;
      const taps = Math.min(prev.allowanceTapCount || 0, 100);
      const cashGain = 20000 + taps * 200;
      const stressGain = Math.floor(taps / 15);
      return {
        ...prev,
        allowanceOpen: false,
        allowanceTapCount: 0,
        cash: prev.cash + cashGain,
        stress: clamp(prev.stress + stressGain, 0, 100),
        logs: [
          {
            turn: prev.turn,
            title: isEnglish ? 'Allowance chance claimed' : '용돈 찬스 획득',
            delta: isEnglish
              ? `+${cashGain.toLocaleString()} KRW (${taps} taps)`
              : `+${cashGain.toLocaleString()}원 (${taps}연타)`,
          },
          ...prev.logs,
        ].slice(0, 6),
      };
    });
  };

  const buyCoinPack = async () => {
    if (coinCheckoutLoading) return;

    setCoinCheckoutLoading(true);
    try {
      if (nativeIOS) {
        if (!revenueCatEnabled) {
          throw new Error('Apple Developer Program 가입 후 App Store Connect와 RevenueCat 설정을 연결해야 iOS 코인팩 인앱결제가 동작합니다.');
        }

        const selectedPackage = iosCoinPackage || (await getRevenueCatSurvivalCoinPack(user))?.selectedPackage;
        const result = await purchaseRevenueCatSurvivalCoinPack({ user, aPackage: selectedPackage });
        if (result?.userCancelled) {
          return;
        }

        setGame((prev) => ({
          ...prev,
          coinBalance: prev.coinBalance + COIN_PACK_AMOUNT,
          coinPurchasedPacks: prev.coinPurchasedPacks + 1,
          logs: [
            {
              turn: prev.turn,
              title: isEnglish ? 'Coin pack purchased' : '코인팩 구매',
              delta: `${COIN_PACK_AMOUNT}${isEnglish ? ' coins' : '코인'} / ${selectedPackage?.product?.priceString || SURVIVAL_COIN_PACK_PRICE.toLocaleString() + '원'}`,
            },
            ...prev.logs,
          ].slice(0, 6),
        }));
        return;
      }

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
      if (error?.userCancelled) {
        return;
      }

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

  const startNewGameNow = () => {
    const confirmed = window.confirm(
      isEnglish
        ? 'Start a new game now? Current progress will be reset.'
        : '지금 새 게임을 시작할까요? 현재 진행은 초기화됩니다.'
    );
    if (!confirmed) return;
    setGame(baseGame());
  };

  const loanDisabled = game.phase !== 'playing' || game.loan.activePayments >= LOAN_MAX_ACTIVE_PAYMENTS;
  const isEmployed = Boolean(game.employment);
  const canContinueWithCoins = game.coinBalance >= CONTINUE_COST_COINS && game.coinPurchasedPacks >= 1;
  const currentFailReason = failureReason(game, isEnglish);
  const returnTo = location.state?.returnTo && !String(location.state.returnTo).startsWith('/survival')
    ? location.state.returnTo
    : '/quiz';

  return (
    <div className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-b from-[#fdf7ee] via-[#f6f4ff] to-[#eef7ff] px-4 pb-8 pt-6 sm:px-6">
      <FloatingBackground />

	      <section className="relative z-10 mx-auto max-w-4xl">
	          <header className="flex flex-wrap items-center justify-between gap-3">
	            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80">{isEnglish ? 'Life Finance Run' : '인생 금융 런'}</p>
              <h2 className="mt-1 text-[24px] font-extrabold text-foreground">
                {isEnglish
                  ? `Age ${game.age} · Turn ${Math.min(game.turn + 1, TOTAL_TURNS)}/${TOTAL_TURNS}`
                  : `${game.age}세 · ${Math.min(game.turn + 1, TOTAL_TURNS)}/${TOTAL_TURNS}턴`}
              </h2>
	            </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="rounded-full border border-border bg-card/90 px-3 py-1.5 text-[12px] font-bold text-foreground"
                >
                  {isEnglish ? 'Enable turn notifications' : '턴 알림 켜기'}
                </button>
                <button
                  type="button"
                  onClick={startNewGameNow}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-bold text-amber-700"
                >
                  {isEnglish ? 'New Game' : '새 게임 시작'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(returnTo)}
                  className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-[12px] font-bold text-rose-700"
                >
                  {isEnglish ? 'Exit Game' : '게임 나가기'}
                </button>
              </div>
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

	          <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3">
            <p className="text-[12px] font-semibold text-foreground">
              {isEnglish
                ? `Simple rules: 1) Tap to earn cash 2) Keep credit 40+ to avoid fees 3) Loans give cash now but auto-repay over the next 2 turns.`
                : `핵심 규칙 3개: 1) 연타로 소득 2) 신용 40 이상 유지 3) 대출은 지금 돈을 주지만 다음 2턴 자동상환.`}
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
                ? `Employment opens on turn ${game.employmentUnlockTurn + 1}. After hiring, tap income stays active.`
                : `취업은 ${game.employmentUnlockTurn + 1}턴에서 열립니다. 취업 후에는 연타 소득이 계속 적용됩니다.`}
            </p>
		            {isEmployed ? (
		              <p className="mt-2 text-[12px] text-muted-foreground">
                {isEnglish
                  ? `${game.employment.emoji} ${game.employment.nameEn} · +${game.employment.moneyPerClick} KRW per tap · stress +${game.employment.stressAfterWork} after work`
                  : `${game.employment.emoji} ${game.employment.name} · 클릭당 +${game.employment.moneyPerClick}원 · 근무 후 스트레스 +${game.employment.stressAfterWork}`}
              </p>
		            ) : game.turn === game.employmentUnlockTurn ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {availableEmploymentPlans.map((plan) => (
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
		            ) : (
              <p className="mt-2 text-[12px] text-muted-foreground">
                {isEnglish
                  ? `Employment selection unlocks on turn ${game.employmentUnlockTurn + 1}.`
                  : `취업 선택은 ${game.employmentUnlockTurn + 1}턴에서 열립니다.`}
              </p>
		            )}
	          </div>

          <TapIncomePanel
            isEnglish={isEnglish}
            enabled={isEmployed && game.phase === 'waiting'}
            moneyPerClick={game.employment?.moneyPerClick || 0}
            combo={game.tapCombo}
            multiplier={game.tapMultiplier}
            earned={game.totalTapIncome}
            onTap={clickWorkIcon}
          />

          {game.phase === 'waiting' && game.allowanceOpen ? (
            <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-[12px] font-bold text-amber-900">
                {isEnglish ? 'Allowance path opened: tap and claim.' : '용돈 길이 열렸어요: 연타 후 수령하세요.'}
              </p>
              <p className="mt-1 text-[12px] text-amber-800/80">
                {isEnglish
                  ? `Taps ${game.allowanceTapCount} · reward = 20,000 + taps x 200 KRW (max 100 taps)`
                  : `연타 ${game.allowanceTapCount}회 · 보상 = 2만원 + 연타x200원 (최대 100회)`}
              </p>
              <button
                type="button"
                onClick={tapAllowanceDuringWait}
                disabled={game.allowanceTapCount >= 100}
                className={`mt-2 h-14 w-full rounded-2xl border-2 text-[16px] font-extrabold active:scale-[0.98] ${
                  game.allowanceTapCount >= 100
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-amber-500 bg-amber-500 text-white'
                }`}
              >
                {game.allowanceTapCount >= 100
                  ? (isEnglish ? 'MAX TAP REACHED (100)' : '연타 최대치 도달 (100)')
                  : (isEnglish ? 'TAP FOR ALLOWANCE' : '용돈 조르기 연타')}
              </button>
              <button
                type="button"
                onClick={claimAllowance}
                className="mt-2 h-11 w-full rounded-xl border border-amber-400 bg-white text-[14px] font-bold text-amber-800"
              >
                {isEnglish ? 'Claim allowance now' : '지금 용돈 수령하기'}
              </button>
            </div>
          ) : null}

          {game.phase === 'playing' && isCrossroadTurn ? (
            <PlayScene
              event={currentEvent}
              isEnglish={isEnglish}
              onChoose={applyChoice}
              workerEmoji={game.employment?.emoji || '🧑‍💼'}
              choicesLocked={game.turn === game.employmentUnlockTurn && !game.employment}
            />
          ) : null}

          {game.phase === 'playing' && !isCrossroadTurn && game.turn !== game.employmentUnlockTurn && passiveEffect ? (
            <PassiveScene
              isEnglish={isEnglish}
              effect={passiveEffect}
              onAdvance={advancePassiveTurn}
            />
          ) : null}

	          {game.phase === 'waiting' ? (
	            <WorkScene
	              isEnglish={isEnglish}
	              countdown={countdown}
	              totalSeconds={Math.floor(TURN_WAIT_MS / 1000)}
	              workerEmoji={game.employment?.emoji || '🧑‍💼'}
	              clickCount={game.waitingWork.clicks}
	              earned={game.waitingWork.earned}
	            />
	          ) : null}

          {game.phase === 'bailout' ? (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50/95 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-600">{isEnglish ? 'Emergency Continue' : '긴급 이어가기'}</p>
              <h3 className="mt-1 text-[22px] font-extrabold text-rose-700">
                {isEnglish ? 'You failed. One continue is available with coins.' : '패배 발생. 코인으로 1회 이어가기 가능.'}
              </h3>
              <p className="mt-1 text-[13px] font-semibold text-rose-700">
                {isEnglish ? `Defeat reason: ${currentFailReason}` : `패배 이유: ${currentFailReason}`}
              </p>
              <p className="mt-1 text-[13px] text-rose-700/80">
                {nativeIOS
                  ? (iosCoinPackage?.product?.priceString
                    ? (isEnglish
                      ? `Coin pack product: ${COIN_PACK_AMOUNT} coins / ${iosCoinPackage.product.priceString}`
                      : `코인팩 상품: ${COIN_PACK_AMOUNT}코인 / ${iosCoinPackage.product.priceString}`)
                    : (isEnglish
                      ? 'Coin pack will use iOS in-app purchase once App Store Connect and RevenueCat are configured.'
                      : 'Apple Developer Program 가입 후 App Store Connect와 RevenueCat을 연결하면 iOS 인앱결제로 코인팩을 판매할 수 있어요.'))
                  : isEnglish
                  ? `Coin pack product: ${COIN_PACK_AMOUNT} coins / ${SURVIVAL_COIN_PACK_PRICE.toLocaleString()} KRW`
                  : `코인팩 상품: ${COIN_PACK_AMOUNT}코인 / ${SURVIVAL_COIN_PACK_PRICE.toLocaleString()}원`}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={buyCoinPack}
                  disabled={coinCheckoutLoading || (nativeIOS && (!revenueCatEnabled || !iosCoinPackage))}
                  className="rounded-2xl border border-rose-300 bg-white px-4 py-3 text-left transition-colors hover:border-rose-500 disabled:opacity-60"
                >
                  <p className="flex items-center gap-2 text-[14px] font-extrabold text-foreground">
                    {coinCheckoutLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {isEnglish ? 'Buy coin pack (10)' : '코인팩 구매 (10코인)'}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {nativeIOS
                      ? coinCheckoutLoading
                        ? (isEnglish ? 'Opening in-app purchase...' : '인앱결제 여는 중...')
                        : iosCoinPackage?.product?.priceString || (isEnglish ? 'iOS IAP setup required' : 'iOS 인앱결제 설정 필요')
                      : coinCheckoutLoading
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
              {nativeIOS && iosCoinError ? (
                <p className="mt-2 text-[12px] text-rose-700/80">{iosCoinError}</p>
              ) : null}
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
                  ? (isEnglish ? 'Life Journey Success!' : '인생 경제 여정 성공!')
                  : (isEnglish ? 'Life Journey Failed' : '인생 경제 여정 실패')}
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

function PlayScene({
  event,
  isEnglish,
  onChoose,
  workerEmoji,
  choicesLocked,
}) {
  return (
    <div className="relative mt-5 min-h-[340px] rounded-3xl border border-white/60 bg-white/35 p-4 backdrop-blur-sm">
      <div className="mt-2 flex justify-center">
        <div className="character-float text-[42px]">{workerEmoji}</div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-[20px] font-extrabold text-foreground">{isEnglish ? event.titleEn : event.title}</p>
        <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{isEnglish ? event.bodyEn : event.body}</p>
      </div>

      {choicesLocked ? (
        <p className="mt-4 text-center text-[12px] font-bold text-amber-700">
          {isEnglish ? 'Choose employment first in this turn to proceed.' : '이번 턴은 먼저 취업을 선택해야 진행됩니다.'}
        </p>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {event.choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={() => onChoose(choice)}
            disabled={choicesLocked}
            className={`rounded-2xl border border-border/70 bg-card/90 px-4 py-3 text-left transition-all ${
              choicesLocked
                ? 'cursor-not-allowed opacity-55'
                : 'hover:-translate-y-0.5 hover:border-primary/40'
            }`}
          >
            <p className="text-[14px] font-extrabold text-foreground">{isEnglish ? choice.labelEn : choice.label}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{hint(choice, isEnglish)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function PassiveScene({ isEnglish, effect, onAdvance }) {
  return (
    <div className="relative mt-5 min-h-[280px] rounded-3xl border border-white/60 bg-white/35 p-4 backdrop-blur-sm">
      <div className="mt-2 text-center">
        <p className="text-[20px] font-extrabold text-foreground">{isEnglish ? effect.titleEn : effect.title}</p>
        <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          {isEnglish ? effect.bodyEn : effect.body}
        </p>
      </div>
      <button
        type="button"
        onClick={onAdvance}
        className="mt-6 h-14 w-full rounded-2xl border-2 border-primary bg-primary text-[16px] font-extrabold text-primary-foreground active:scale-[0.98]"
      >
        {isEnglish ? 'Continue Life' : '인생 계속 진행하기'}
      </button>
    </div>
  );
}

function WorkScene({
  isEnglish,
  countdown,
  totalSeconds,
  workerEmoji,
  clickCount,
  earned,
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
          {isEnglish ? 'Income report for this cooldown' : '이번 대기시간 연타 리포트'}
        </p>
        <div className="mt-2 text-center text-[12px] text-muted-foreground">
          <p>{isEnglish ? `Taps: ${clickCount}` : `연타 수: ${clickCount}`}</p>
          <p>{isEnglish ? `Earned: +${earned.toLocaleString()} KRW` : `획득: +${earned.toLocaleString()}원`}</p>
        </div>
      </div>
    </div>
  );
}

function TapIncomePanel({
  isEnglish,
  enabled,
  moneyPerClick,
  combo,
  multiplier,
  earned,
  onTap,
}) {
  return (
    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
      <p className="text-[12px] font-bold text-emerald-900">
        {isEnglish
          ? `Tap Income: +${moneyPerClick} KRW base per tap`
          : `연타 소득: 탭 1회 기본 +${moneyPerClick.toLocaleString()}원`}
      </p>
      <p className="mt-1 text-[12px] text-emerald-800/80">
        {isEnglish
          ? `Combo x${multiplier.toFixed(2)} (${combo} hits) · Total +${earned.toLocaleString()} KRW`
          : `콤보 x${multiplier.toFixed(2)} (${combo}연타) · 누적 +${earned.toLocaleString()}원`}
      </p>
      <button
        type="button"
        onClick={onTap}
        disabled={!enabled}
        className={`mt-2 h-16 w-full rounded-2xl text-[18px] font-extrabold transition-transform active:scale-[0.98] ${
          enabled
            ? 'border-2 border-emerald-500 bg-emerald-500 text-white'
            : 'border-2 border-border bg-muted text-muted-foreground'
        }`}
      >
        {isEnglish ? 'TAP TO EARN CASH' : '연타해서 소득 올리기'}
      </button>
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
