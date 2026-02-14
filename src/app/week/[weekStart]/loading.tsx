export default function Loading() {
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Header skeleton */}
      <header className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-card)' }}>
        <div className="flex items-center gap-3">
          <div className="h-7 w-16 bg-gray-200 animate-pulse" />
          <div className="h-5 w-[140px] bg-gray-200 animate-pulse" />
          <div className="h-7 w-16 bg-gray-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-7 w-14 bg-gray-200 animate-pulse" />
          <div className="h-7 w-20 bg-gray-200 animate-pulse" />
        </div>
      </header>

      {/* Day cards skeleton */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          {days.map((d) => (
            <div
              key={d}
              className="flex-1 min-w-0"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
              }}
            >
              {/* Day header skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="flex items-baseline gap-2">
                  <div className="h-5 w-6 bg-gray-200 animate-pulse" />
                  <div className="h-3 w-8 bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Meetings skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="h-2.5 w-14 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="h-3 w-3/4 bg-gray-200 animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Action items skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="h-2.5 w-20 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-full shrink-0" />
                    <div className="h-3 w-2/3 bg-gray-200 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-full shrink-0" />
                    <div className="h-3 w-1/2 bg-gray-200 animate-pulse" />
                  </div>
                </div>
              </div>
              {/* Notes skeleton */}
              <div className="px-3 py-2">
                <div className="h-2.5 w-10 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-gray-200 animate-pulse" />
                  <div className="h-3 w-4/5 bg-gray-200 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
