export default function MemberLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading member page</span>
      <div className="skeleton h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="surface p-4">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="surface p-5">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton mt-4 h-24 w-full rounded-2xl" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-3/4" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-48 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
