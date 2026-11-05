export default function PublicLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading page</span>
      <div className="skeleton h-[320px] w-full rounded-3xl sm:h-[380px]" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="surface p-4">
            <div className="skeleton h-11 w-11 rounded-2xl" />
            <div className="skeleton mt-3 h-3 w-20" />
            <div className="skeleton mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-6">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-11/12" />
          <div className="skeleton mt-2 h-4 w-4/5" />
          <div className="mt-6 flex gap-3">
            <div className="skeleton h-12 w-40 rounded-2xl" />
            <div className="skeleton h-12 w-40 rounded-2xl" />
          </div>
        </div>
        <div className="skeleton h-56 rounded-3xl" />
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="skeleton h-48 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
