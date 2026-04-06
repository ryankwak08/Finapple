import { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.5, THRESHOLD + 20));
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
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
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 4 || refreshing;

  return (
    <div
      ref={containerRef}
      className="relative min-h-[calc(100dvh-5rem)] overflow-x-clip overflow-y-auto"
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
