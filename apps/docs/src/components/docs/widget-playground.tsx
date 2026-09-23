"use client";

import { lazy, Suspense, useState } from "react";

const Playground = lazy(() => import("./widget-playground-client"));

export function WidgetPlayground() {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <Suspense fallback={<output>Loading widget playground…</output>}>
        <Playground />
      </Suspense>
    );
  }
  return (
    <button type="button" className="rounded-lg border px-4 py-2 font-medium" onClick={() => setOpen(true)}>
      Open widget playground
    </button>
  );
}
