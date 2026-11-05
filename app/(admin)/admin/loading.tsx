export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading admin page</span>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-2 h-8 w-40" />
          <div className="skeleton mt-2 h-4 w-64 max-w-full" />
        </div>
        <div className="skeleton h-11 w-36 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="surface p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface p-5">
          <div className="skeleton h-5 w-36" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((item) => (
              <div key={item} className="skeleton h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="surface p-5">
          <div className="skeleton h-5 w-32" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
