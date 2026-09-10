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

export default function Search(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    client: staticClient(),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
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
