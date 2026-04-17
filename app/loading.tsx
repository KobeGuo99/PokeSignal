export default function LoadingPage() {
  return (
    <div className="panel mx-auto max-w-2xl rounded-[32px] p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Loading</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Crunching the latest card signals
      </h1>
      <p className="mt-3 text-slate-600">
        Pulling snapshots, feature summaries, and recommendation data.
      </p>
    </div>
  );
}
