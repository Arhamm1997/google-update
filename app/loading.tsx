export default function Loading() {
  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-7">

        {/* Header skeleton */}
        <div className="flex items-start justify-between animate-pulse">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0,1,2,3].map(i => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-white/10" />
                ))}
              </div>
              <div className="h-6 w-44 bg-white/10 rounded-lg" />
            </div>
            <div className="h-3 w-64 bg-white/5 rounded ml-[3.4rem]" />
          </div>
          <div className="h-4 w-20 bg-white/5 rounded mt-1" />
        </div>

        {/* StatusBar skeleton */}
        <div className="glass-card rounded-2xl h-[60px] animate-pulse" />

        {/* NotificationSetup skeleton */}
        <div className="glass-card rounded-2xl h-[60px] animate-pulse" />

        {/* Cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="p-5 flex gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-white/5 rounded-full" />
                    <div className="h-5 w-14 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-white/5 rounded" />
                  <div className="h-3 w-1/3 bg-white/5 rounded" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white/5 mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
