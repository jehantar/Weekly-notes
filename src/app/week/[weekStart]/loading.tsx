export default function Loading() {
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col h-screen">
      {/* Header skeleton */}
      <header className="border-b border-gray-300 px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
          <div className="h-5 w-[140px] bg-gray-200 animate-pulse rounded" />
          <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-8 w-8 bg-gray-200 animate-pulse rounded" />
          <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
      </header>

      {/* Grid skeleton */}
      <div className="grid grid-cols-[120px_repeat(5,1fr)] border-t border-l border-gray-300 w-full">
        {/* Header row */}
        <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500">
          Day
        </div>
        {days.map((d) => (
          <div
            key={`hdr-${d}`}
            className="border-b border-r border-gray-300 bg-gray-50 p-2"
          >
            <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}

        {/* Meetings row */}
        <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500 flex items-start">
          Key Meetings
        </div>
        {days.map((d) => (
          <div
            key={`mtg-${d}`}
            className="border-b border-r border-gray-300 p-2 min-h-[60px] space-y-2"
          >
            <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}

        {/* Action Items row */}
        <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500 flex items-start">
          Action Items
        </div>
        {days.map((d) => (
          <div
            key={`ai-${d}`}
            className="border-b border-r border-gray-300 p-2 min-h-[60px] space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-sm shrink-0" />
              <div className="h-3 w-2/3 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-sm shrink-0" />
              <div className="h-3 w-1/2 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-sm shrink-0" />
              <div className="h-3 w-3/5 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        ))}

        {/* Notes row */}
        <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500 flex items-start">
          Notes
        </div>
        {days.map((d) => (
          <div
            key={`notes-${d}`}
            className="border-b border-r border-gray-300 p-2 min-h-[60px] space-y-2"
          >
            <div className="h-3 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-4/5 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-2/3 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
