import { useEffect, useState } from 'react';
import {
  playClickSound,
  getSoundEffectsEnabled,
  playCorrectSound,
  primeSoundEffects,
  playSuccessSound,
  playWrongSound,
  setSoundEffectsEnabled,
} from '@/lib/sound';

export default function useSoundEffects() {
  const [enabled, setEnabled] = useState(() => getSoundEffectsEnabled());

  useEffect(() => {
    setSoundEffectsEnabled(enabled);
  }, [enabled]);

  return {
    enabled,
    primeSoundEffects,
    setEnabled,
    playClickSound,
    playCorrectSound,
    playWrongSound,
    playSuccessSound,
  };
}
