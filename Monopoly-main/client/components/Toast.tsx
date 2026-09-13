"use client";

export function Toast({
  message,
  variant = "error",
}: {
  message: string | null;
  variant?: "error" | "info";
}) {
  if (!message) return null;
  const info = variant === "info";
  return (
    <div
      className={`fixed left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-100 shadow-stall backdrop-blur-md animate-banner-in ${
        info ? "top-16 border-jade/40 bg-night/90" : "top-4 border-crimson/40 bg-night/90"
      }`}
      role="alert"
      aria-live={info ? "polite" : "assertive"}
    >
      <span
        className={`grid h-5 w-5 place-items-center rounded-full text-white ${
          info ? "bg-jade" : "bg-crimson"
        }`}
      >
        {info ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 8l4 8 3-6 3 3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 8v5M12 16.5v.5" />
          </svg>
        )}
      </span>
      {message}
    </div>
  );
}
