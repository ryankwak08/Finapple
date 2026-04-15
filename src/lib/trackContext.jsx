import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage } from '@/lib/safeStorage';

const TRACK_STORAGE_KEY = 'finapple:active-track';

export const TRACKS = {
  YOUTH: 'youth',
  START: 'start',
  ONE: 'one',
};

const TRACK_META = {
  [TRACKS.YOUTH]: {
    key: TRACKS.YOUTH,
    brand: 'Finapple Youth',
    labelKo: '청소년 금융학습',
    labelEn: 'Teen Learning',
    taglineKo: '청소년기 금융학습 전용 트랙',
    taglineEn: 'Teen financial learning track',
  },
  [TRACKS.START]: {
    key: TRACKS.START,
    brand: 'Finapple Start',
    labelKo: '자립준비청년',
    labelEn: 'Youth Independence',
    taglineKo: '자립준비청년 맞춤 청년기 금융 트랙',
    taglineEn: 'Young adult finance track for youth independence',
  },
  [TRACKS.ONE]: {
    key: TRACKS.ONE,
    brand: 'Finapple One',
    labelKo: '다문화 · 외국인 노동자',
    labelEn: 'Multicultural · Migrant Workers',
    taglineKo: '다문화·외국인 노동자 맞춤 금융 트랙',
    taglineEn: 'Financial support track for multicultural and migrant workers',
  },
};

const TrackContext = createContext({
  activeTrack: TRACKS.YOUTH,
  setActiveTrack: () => {},
  toggleTrack: () => {},
  trackMeta: TRACK_META[TRACKS.YOUTH],
  tracks: [TRACK_META[TRACKS.YOUTH], TRACK_META[TRACKS.START], TRACK_META[TRACKS.ONE]],
});

const normalizeTrack = (value) => {
  if (value === TRACKS.YOUTH) return TRACKS.YOUTH;
  if (value === TRACKS.ONE) return TRACKS.ONE;
  if (value === TRACKS.START) return TRACKS.START;
  return TRACKS.YOUTH;
};

export function TrackProvider({ children }) {
  const [activeTrack, setActiveTrackState] = useState(() => {
    const stored = safeStorage.getItem(TRACK_STORAGE_KEY);
    return normalizeTrack(stored);
  });

  const setActiveTrack = useCallback((nextTrack) => {
    setActiveTrackState(normalizeTrack(nextTrack));
  }, []);

  const toggleTrack = useCallback(() => {
    setActiveTrackState((current) => {
      if (current === TRACKS.YOUTH) return TRACKS.START;
      if (current === TRACKS.START) return TRACKS.ONE;
      return TRACKS.YOUTH;
    });
  }, []);

  useEffect(() => {
    safeStorage.setItem(TRACK_STORAGE_KEY, activeTrack);
    document.documentElement.setAttribute('data-track', activeTrack);
  }, [activeTrack]);

  const value = useMemo(() => ({
    activeTrack,
    setActiveTrack,
    toggleTrack,
    trackMeta: TRACK_META[activeTrack],
    tracks: [TRACK_META[TRACKS.YOUTH], TRACK_META[TRACKS.START], TRACK_META[TRACKS.ONE]],
  }), [activeTrack, setActiveTrack, toggleTrack]);

  return (
    <TrackContext.Provider value={value}>
      {children}
    </TrackContext.Provider>
  );
}

export function useTrack() {
  return useContext(TrackContext);
}

export function getTrackDisplayName(trackKey, locale = 'ko') {
  const normalized = normalizeTrack(trackKey);
  const track = TRACK_META[normalized];
  return locale === 'en' ? track.labelEn : track.labelKo;
}
