"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { staticClient } from "fumadocs-core/search/client/orama-static";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useEffect, useRef } from "react";

import { normalizeDestination, searchTrigger, track } from "@/lib/analytics";

export default function Search(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    client: staticClient(),
  });
  const { open } = props;
  const lastTracked = useRef("");

  useEffect(() => {
    if (!open) {
      lastTracked.current = "";
      return;
    }
    track("Search Opened", { trigger: searchTrigger() });
  }, [open]);

  useEffect(() => {
    if (!open || query.isLoading || !Array.isArray(query.data)) return;
    const trimmed = search.trim();
    if (!trimmed || trimmed === lastTracked.current) return;
    const timeout = setTimeout(() => {
      lastTracked.current = trimmed;
      if (!Array.isArray(query.data)) return;
      if (query.data.length === 0) {
        track("Search No Results", { query: trimmed });
        return;
      }
      track("Search Performed", { query: trimmed, result_count: query.data.length });
    }, 900);
    return () => clearTimeout(timeout);
  }, [open, search, query.data, query.isLoading]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      onSelect={(item) => {
        if (item.type === "action") return;
        const results = Array.isArray(query.data) ? query.data : [];
        track("Search Result Clicked", {
          query: search.trim(),
          result_index: Math.max(
            0,
            results.findIndex((result) => result.id === item.id),
          ),
          result_type: item.type,
          destination: normalizeDestination(item.url),
        });
      }}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput aria-label="Search documentation" />
          <SearchDialogClose />
        </SearchDialogHeader>
        {query.error ? (
          <div role="alert" className="space-y-3 px-4 py-6 text-sm">
            <p>Search could not load. Reload the page to try again, or browse the documentation.</p>
            <div className="flex gap-4">
              <button type="button" className="underline underline-offset-4" onClick={() => window.location.reload()}>
                Reload page
              </button>
              <a className="underline underline-offset-4" href="/docs/">
                Browse documentation
              </a>
            </div>
          </div>
        ) : (
          <>
            <output className="sr-only">
              {query.isLoading
                ? "Searching documentation"
                : Array.isArray(query.data)
                  ? `${query.data.length} search results`
                  : ""}
            </output>
            <SearchDialogList items={query.data !== "empty" ? query.data : null} />
          </>
        )}
      </SearchDialogContent>
    </SearchDialog>
  );
}
