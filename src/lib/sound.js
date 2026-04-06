const SOUND_EFFECTS_KEY = 'finapple_sound_effects';

let audioContext = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
};

export const getSoundEffectsEnabled = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.localStorage.getItem(SOUND_EFFECTS_KEY) !== 'false';
};

export const setSoundEffectsEnabled = (enabled) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SOUND_EFFECTS_KEY, enabled ? 'true' : 'false');
};

export const primeSoundEffects = async () => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    await context.resume();
  }
};

const playTone = async (frequency, duration, type = 'sine', volume = 0.11, delay = 0) => {
  const context = getAudioContext();
  if (!context || !getSoundEffectsEnabled()) {
    return;
  }

  await primeSoundEffects();

  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filterNode = context.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  filterNode.type = 'lowpass';
  filterNode.frequency.setValueAtTime(Math.max(frequency * 3, 1200), startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

export const playCorrectSound = async () => {
  await playTone(659.25, 0.08, 'triangle', 0.14);
  await playTone(880, 0.1, 'triangle', 0.16, 0.05);
  await playTone(1174.66, 0.24, 'triangle', 0.18, 0.1);
};

export const playWrongSound = async () => {
  await playTone(340, 0.08, 'sawtooth', 0.13);
  await playTone(230, 0.11, 'sawtooth', 0.145, 0.05);
  await playTone(146.83, 0.28, 'square', 0.16, 0.11);
};

export const playSuccessSound = async () => {
  await playTone(523.25, 0.08, 'triangle', 0.12);
  await playTone(659.25, 0.1, 'triangle', 0.14, 0.04);
  await playTone(783.99, 0.12, 'triangle', 0.16, 0.08);
  await playTone(1046.5, 0.18, 'triangle', 0.19, 0.14);
  await playTone(1318.51, 0.22, 'triangle', 0.2, 0.22);
  await playTone(1567.98, 0.34, 'triangle', 0.22, 0.31);
  await playTone(2093, 0.55, 'sine', 0.18, 0.43);
  await playTone(1046.5, 0.5, 'triangle', 0.12, 0.46);
};

export const playClickSound = async () => {
  await playTone(840, 0.04, 'square', 0.12);
  await playTone(1180, 0.06, 'triangle', 0.1, 0.015);
};
