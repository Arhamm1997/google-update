'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full glass-card rounded-2xl p-8 text-center animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center gap-2 mb-6">
          {['bg-google-blue','bg-google-red','bg-google-yellow','bg-google-green'].map((c, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-40`} />
          ))}
        </div>

        <h1 className="text-lg font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          The tracker ran into an unexpected error. This is usually a temporary
          network issue — try refreshing.
        </p>

        {/* Error detail (dev only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <pre className="text-left text-xs font-mono text-red-400 bg-red-500/10
                          border border-red-500/20 rounded-xl p-4 mb-6 overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-500
                       text-white px-5 py-2.5 rounded-xl transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-sm font-semibold bg-white/[0.07] hover:bg-white/10
                       border border-white/10 text-gray-200
                       px-5 py-2.5 rounded-xl transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
