"use client";

import { IconArrowUpRight, IconSearch, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface DirectoryItem {
  description?: string;
  title: string;
  url: string;
}

interface DirectoryGridProps {
  items: DirectoryItem[];
  label: string;
}

export function DirectoryGrid({ items, label }: DirectoryGridProps) {
  const [query, setQuery] = useState("");
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return items;

    return items.filter(({ description, title }) =>
      `${title} ${description ?? ""}`.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [items, query]);

  return (
    <nav className="not-prose my-8" aria-label={label}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-sm text-fd-muted-foreground" aria-live="polite">
          {visibleItems.length} of {items.length} {label}
        </p>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Filter {label}</span>
          <IconSearch
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fd-muted-foreground"
            size={17}
          />
          <input
            className="h-10 w-full rounded-md border bg-fd-background pl-9 pr-9 text-sm text-fd-foreground outline-none placeholder:text-fd-muted-foreground focus-visible:ring-2 focus-visible:ring-fd-ring"
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${label}`}
          />
          {query && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
              onClick={() => setQuery("")}
              aria-label={`Clear ${label} filter`}
            >
              <IconX aria-hidden="true" size={16} />
            </button>
          )}
        </label>
      </div>

      {visibleItems.length > 0 ? (
        <ul className="m-0 grid list-none gap-px border bg-fd-border p-0 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <li key={item.url} className="m-0 bg-fd-background p-0">
              <Link
                href={item.url}
                className="group flex h-full min-h-24 items-start justify-between gap-4 p-4 text-fd-foreground hover:bg-fd-muted/60 hover:no-underline"
              >
                <span className="min-w-0">
                  <strong className="block text-sm font-semibold">{item.title}</strong>
                  {item.description && (
                    <span className="mt-1.5 line-clamp-3 text-sm leading-5 text-fd-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
                <IconArrowUpRight
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-fd-muted-foreground group-hover:text-fd-primary"
                  size={17}
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-fd-muted-foreground">
          No guides match “{query}”.
        </div>
      )}
    </nav>
  );
}
