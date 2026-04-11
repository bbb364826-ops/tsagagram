export function PostSkeleton() {
  return (
    <div className="border-b animate-pulse" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-9 h-9 rounded-full" style={{ background: "var(--gray-light)" }} />
        <div className="flex-1">
          <div className="h-3 w-28 rounded mb-1" style={{ background: "var(--gray-light)" }} />
          <div className="h-2 w-20 rounded" style={{ background: "var(--gray-light)" }} />
        </div>
      </div>
      <div className="w-full aspect-square" style={{ background: "var(--gray-light)" }} />
      <div className="px-3 py-3 flex flex-col gap-2">
        <div className="h-3 w-24 rounded" style={{ background: "var(--gray-light)" }} />
        <div className="h-3 w-full rounded" style={{ background: "var(--gray-light)" }} />
        <div className="h-3 w-3/4 rounded" style={{ background: "var(--gray-light)" }} />
      </div>
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex gap-4 px-3 pb-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 animate-pulse">
          <div className="w-16 h-16 rounded-full" style={{ background: "var(--gray-light)" }} />
          <div className="h-2 w-12 rounded" style={{ background: "var(--gray-light)" }} />
        </div>
      ))}
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--gray-light)" }} />
      <div className="flex-1">
        <div className="h-3 w-32 rounded mb-2" style={{ background: "var(--gray-light)" }} />
        <div className="h-2 w-24 rounded" style={{ background: "var(--gray-light)" }} />
      </div>
    </div>
  );
}
