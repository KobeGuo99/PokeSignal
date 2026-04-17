export default function NotFoundPage() {
  return (
    <div className="panel mx-auto max-w-2xl rounded-[32px] p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-700">Not found</p>
      <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight">
        That card page does not exist.
      </h1>
      <p className="mt-3 text-slate-600">
        Try returning to the dashboard and selecting a card from the ranked list.
      </p>
    </div>
  );
}
