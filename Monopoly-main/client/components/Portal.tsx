"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into <body> so overlays escape any ancestor that creates a
 * containing block for `position: fixed` (e.g. a card with `backdrop-filter`).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
