"use client";

import type { WidgetKind } from "@homarr/definitions";
import { widgetCatalogIcons } from "@homarr/ui/widget-icons";
import { IconSearch, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

export interface DirectoryIntegration {
  iconUrl: string;
  name: string;
}

export interface DirectoryItem {
  description?: string;
  iconUrl?: string;
  supportedIntegrations?: readonly DirectoryIntegration[];
  title: string;
  url: string;
  widgetKind?: WidgetKind;
}

interface DirectoryGridProps {
  items: DirectoryItem[];
  label: string;
}

export function DirectoryGrid({ items, label }: DirectoryGridProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clearFilter = () => {
    setQuery("");
    inputRef.current?.focus();
  };
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
            ref={inputRef}
            type="search"
            inputMode="search"
            aria-label={`Filter ${label}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${label}`}
          />
          {query && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground"
              onClick={clearFilter}
              aria-label={`Clear ${label} filter`}
            >
              <IconX aria-hidden="true" size={16} />
            </button>
          )}
        </label>
      </div>

      {visibleItems.length > 0 ? (
        <ul className="m-0 grid list-none gap-px border bg-fd-border p-0 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const WidgetIcon = item.widgetKind ? widgetCatalogIcons[item.widgetKind] : undefined;
            const integrations = item.supportedIntegrations ?? [];
            const visibleIntegrations = integrations.slice(0, 6);
            const remainingIntegrations = integrations.length - visibleIntegrations.length;
            const supportedIntegrationNames = integrations.map((integration) => integration.name).join(", ");

            return (
              <li key={item.url} className="m-0 bg-fd-background p-0">
                <Link
                  href={item.url}
                  className="group flex h-full min-h-24 items-start gap-3 p-4 text-fd-foreground hover:bg-fd-muted/60 hover:no-underline"
                >
                  {(WidgetIcon || item.iconUrl) && (
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md border bg-fd-card p-1.5"
                      aria-hidden="true"
                    >
                      {WidgetIcon ? (
                        <WidgetIcon aria-hidden="true" className="size-6 text-fd-primary" stroke={1.8} />
                      ) : (
                        <img
                          src={item.iconUrl}
                          alt=""
                          width={28}
                          height={28}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-contain"
                        />
                      )}
                    </span>
                  )}
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold">{item.title}</strong>
                    {item.description && (
                      <span className="mt-1.5 line-clamp-3 text-sm leading-5 text-fd-muted-foreground">
                        {item.description}
                      </span>
                    )}
                    {visibleIntegrations.length > 0 && (
                      <span className="mt-3 flex items-center gap-2 text-xs text-fd-muted-foreground">
                        <span className="shrink-0" aria-hidden="true">
                          Supports
                        </span>
                        <span
                          className="flex min-w-0 flex-wrap items-center gap-1"
                          role="img"
                          aria-label={supportedIntegrationNames}
                        >
                          {visibleIntegrations.map((integration) => (
                            <span
                              key={integration.name}
                              className="flex size-6 items-center justify-center rounded border bg-fd-card p-1"
                              title={integration.name}
                            >
                              <img
                                src={integration.iconUrl}
                                alt=""
                                width={16}
                                height={16}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-contain"
                              />
                            </span>
                          ))}
                          {remainingIntegrations > 0 && (
                            <span className="px-1 font-medium text-fd-muted-foreground">+{remainingIntegrations}</span>
                          )}
                        </span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-fd-muted-foreground">
          <p>No guides match “{query}”. Try a service name or a feature, such as calendar or storage.</p>
          <button type="button" className="mt-3 text-fd-primary underline underline-offset-4" onClick={clearFilter}>
            Clear filter
          </button>
        </div>
      )}
    </nav>
  );
}
