export default function VenueLoading() {
  return (
    <div className="space-y-5 md:space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-44 animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/6" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-white/6" />
    </div>
  );
}
