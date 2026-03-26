import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full glass-card rounded-2xl p-10 text-center animate-fade-in">
        <div className="flex justify-center gap-2 mb-6">
          {['bg-google-blue','bg-google-red','bg-google-yellow','bg-google-green'].map((c, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
          ))}
        </div>

        <p className="text-5xl font-bold text-white mb-3 font-mono">404</p>
        <h1 className="text-base font-semibold text-gray-300 mb-2">Page not found</h1>
        <p className="text-sm text-gray-600 mb-8">
          This page doesn't exist. The tracker only has one page.
        </p>

        <Link
          href="/"
          className="inline-block text-sm font-semibold bg-blue-600 hover:bg-blue-500
                     text-white px-6 py-2.5 rounded-xl transition-colors"
        >
          Back to tracker
        </Link>
      </div>
    </main>
  );
}
