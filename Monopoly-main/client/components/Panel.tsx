"use client";

import type { ReactNode } from "react";

/** Shared "stall card" panel: floating rounded card with an iconed header. */
export function Panel({
  title,
  icon,
  action,
  children,
  bodyClass = "p-3",
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
  className?: string;
}) {
  return (
    <section className={`stall-card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3.5 py-2.5">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-100">
          {icon && <span className="text-brass [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
          {title}
        </h3>
        {action}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
