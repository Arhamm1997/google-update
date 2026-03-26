'use client';

import { useState, useEffect } from 'react';

export default function RefreshTicker() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [nextIn, setNextIn] = useState(300);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsAgo(elapsed);
      setNextIn(Math.max(0, 300 - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = ((300 - nextIn) / 300) * 100;

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      {/* mini progress arc */}
      <span className="relative w-3 h-3 flex-shrink-0">
        <svg viewBox="0 0 12 12" className="w-3 h-3 -rotate-90">
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <circle
            cx="6" cy="6" r="4.5"
            fill="none"
            stroke="rgba(66,133,244,0.5)"
            strokeWidth="1.5"
            strokeDasharray={`${2 * Math.PI * 4.5}`}
            strokeDashoffset={`${2 * Math.PI * 4.5 * (1 - pct / 100)}`}
            strokeLinecap="round"
          />
        </svg>
      </span>
      {nextIn > 0 ? `refreshes in ${nextIn}s` : 'refreshing…'}
    </span>
  );
}
