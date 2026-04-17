"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel mx-auto max-w-2xl rounded-[32px] p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-700">Error</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
        Something went wrong while loading PokeSignal
      </h1>
      <p className="mt-3 text-slate-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Retry
      </button>
    </div>
  );
}
