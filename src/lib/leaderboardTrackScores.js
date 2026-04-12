import { safeStorage } from '@/lib/safeStorage';
import { TRACKS } from '@/lib/trackContext';

const STORAGE_KEY = 'finapple:leaderboard-track-scores:v1';

const clampInt = (value) => Math.max(0, Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0);

const getIdentity = (user) => user?.id || user?.email || 'guest';

const getStorageMap = () => {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistStorageMap = (map) => {
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(map));
};

const buildBucketKey = ({ user, seasonKey }) => `${getIdentity(user)}::${seasonKey || 'default'}`;

const normalizeTrackScores = ({ youth, start, one, totalScore, preferredTrack = TRACKS.YOUTH }) => {
  let nextYouth = clampInt(youth);
  let nextStart = clampInt(start);
  let nextOne = clampInt(one);
  const targetTotal = clampInt(totalScore);

  const currentSum = nextYouth + nextStart + nextOne;
  if (currentSum !== targetTotal) {
    const diff = targetTotal - currentSum;
    if (preferredTrack === TRACKS.ONE) {
      nextOne += diff;
    } else if (preferredTrack === TRACKS.START) {
      nextStart += diff;
    } else {
      nextYouth += diff;
    }
  }

  if (nextYouth < 0) {
    nextStart += nextYouth;
    nextYouth = 0;
  }

  if (nextStart < 0) {
    nextOne += nextStart;
    nextStart = 0;
  }

  if (nextOne < 0) {
    nextStart += nextOne;
    nextOne = 0;
  }

  if (nextOne < 0) {
    nextYouth += nextOne;
    nextOne = 0;
  }

  nextYouth = Math.max(0, nextYouth);
  nextStart = Math.max(0, nextStart);
  nextOne = Math.max(0, nextOne);

  return {
    youth: nextYouth,
    start: nextStart,
    one: nextOne,
    total: targetTotal,
  };
};

export function allocateTrackLeaderboardScores({ user, seasonKey, totalScore, activeTrack }) {
  const preferredTrack = activeTrack === TRACKS.ONE ? TRACKS.ONE : activeTrack === TRACKS.START ? TRACKS.START : TRACKS.YOUTH;
  const key = buildBucketKey({ user, seasonKey });
  const map = getStorageMap();
  const bucket = map[key] || { youth: 0, start: 0, one: 0, lastTotal: 0 };

  const lastTotal = clampInt(bucket.lastTotal);
  const nextTotal = clampInt(totalScore);
  const delta = nextTotal - lastTotal;

  let nextYouth = clampInt(bucket.youth);
  let nextStart = clampInt(bucket.start);
  let nextOne = clampInt(bucket.one);

  if (delta !== 0) {
    if (preferredTrack === TRACKS.ONE) {
      nextOne += delta;
    } else if (preferredTrack === TRACKS.START) {
      nextStart += delta;
    } else {
      nextYouth += delta;
    }
  }

  const normalized = normalizeTrackScores({
    youth: nextYouth,
    start: nextStart,
    one: nextOne,
    totalScore: nextTotal,
    preferredTrack,
  });

  map[key] = {
    youth: normalized.youth,
    start: normalized.start,
    one: normalized.one,
    lastTotal: nextTotal,
  };
  persistStorageMap(map);

  return {
    youth: normalized.youth,
    start: normalized.start,
    one: normalized.one,
  };
}

export function readTrackLeaderboardScores({ user, seasonKey, totalScore, activeTrack }) {
  const preferredTrack = activeTrack === TRACKS.ONE ? TRACKS.ONE : activeTrack === TRACKS.START ? TRACKS.START : TRACKS.YOUTH;
  const key = buildBucketKey({ user, seasonKey });
  const map = getStorageMap();
  const bucket = map[key];

  if (!bucket) {
    if (preferredTrack === TRACKS.ONE) {
      return { youth: 0, start: 0, one: clampInt(totalScore) };
    }
    if (preferredTrack === TRACKS.START) {
      return { youth: 0, start: clampInt(totalScore), one: 0 };
    }
    return { youth: clampInt(totalScore), start: 0, one: 0 };
  }

  const normalized = normalizeTrackScores({
    youth: bucket.youth,
    start: bucket.start,
    one: bucket.one,
    totalScore,
    preferredTrack,
  });

  return {
    youth: normalized.youth,
    start: normalized.start,
    one: normalized.one,
  };
}

export function getEntryTrackScores(entry) {
  const total = clampInt(entry?.score || 0);
  const youth = clampInt(entry?.score_youth);
  const start = clampInt(entry?.score_start);
  const one = clampInt(entry?.score_one);

  const normalized = normalizeTrackScores({
    youth,
    start,
    one,
    totalScore: total,
    preferredTrack: TRACKS.YOUTH,
  });

  return {
    youth: normalized.youth,
    start: normalized.start,
    one: normalized.one,
  };
}
