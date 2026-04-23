import { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { isNativePlatform } from '@/lib/runtimePlatform';

const THRESHOLD = 72;
const supportsNativePullToRefresh = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  return isNativePlatform() && navigator.maxTouchPoints > 0;
};

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);
  const enablePullToRefresh = supportsNativePullToRefresh();

  const handleTouchStart = useCallback((e) => {
    if (!enablePullToRefresh) return;
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, [enablePullToRefresh]);

  const handleTouchMove = useCallback((e) => {
    if (!enablePullToRefresh) return;
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.5, THRESHOLD + 20));
    }
  }, [enablePullToRefresh, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!enablePullToRefresh) return;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }, [enablePullToRefresh, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = enablePullToRefresh && (pullDistance > 4 || refreshing);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-full overflow-x-hidden ${enablePullToRefresh ? 'min-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-y-contain' : ''}`}
      style={enablePullToRefresh ? { touchAction: 'pan-y' } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center pointer-events-none overflow-hidden transition-all duration-200"
        style={{ height: showIndicator ? `${refreshing ? THRESHOLD : pullDistance}px` : 0 }}
      >
        <div
          className={`w-9 h-9 rounded-full bg-card border border-border shadow flex items-center justify-center transition-transform duration-200`}
          style={{ transform: `scale(${0.5 + progress * 0.5})`, opacity: progress }}
        >
          <Loader2
            className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
