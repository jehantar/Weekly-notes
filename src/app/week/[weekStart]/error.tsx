"use client";

export default function WeekError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-lg font-medium">Something went wrong</h2>
        <button
          onClick={reset}
          className="px-4 py-2 transition-colors"
          style={{ backgroundColor: 'var(--accent-purple)', color: '#fff' }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
