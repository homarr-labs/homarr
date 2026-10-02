"use client";

import { useEffect, useState } from "react";

import Search from "./search";

export function SearchPage() {
  const [query, setQuery] = useState<string>();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Search documentation</h1>
      <button type="button" className="mt-6 underline underline-offset-4" onClick={() => setOpen(true)}>
        Open search
      </button>
      {query !== undefined && <Search open={open} onOpenChange={setOpen} initialSearch={query} />}
    </main>
  );
}
