import { useState } from "react";
import { Skeleton, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { useI18n } from "@homarr/translation/standalone/client";

import { SourceAppSearchOption } from "../../source-ui/apps/search";
import { useAppsFeature } from "./context";
import type { ManagedApp } from "./context";
import { AppsRequestError } from "./feedback";

export function AppSearch({ onSelect }: { readonly onSelect: (app: ManagedApp) => void }) {
  const feature = useAppsFeature();
  const tApp = useI18n("app");
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 250);
  const permitted =
    feature.principal.kind === "authenticated" &&
    (feature.principal.permissions.includes("app-modify-all") ||
      feature.principal.permissions.includes("board-modify-all"));
  const result = useQuery(
    feature.query.app.search.queryOptions({
      input: { query: debouncedQuery, limit: 10 },
      enabled: permitted,
      retry: false,
    }),
  );
  if (!permitted)
    return (
      <Text>
        {feature.principal.kind === "anonymous" ? feature.unavailable.authentication : feature.unavailable.permission}
      </Text>
    );
  return (
    <Stack>
      <TextInput label={tApp("search")} value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      {result.isError ? (
        <AppsRequestError
          error={result.error}
          retry={() => {
            void result.refetch();
          }}
        />
      ) : result.isPending ? (
        <Skeleton height={80} />
      ) : result.data.length === 0 ? (
        <Text>{tApp("action.select.noResults")}</Text>
      ) : (
        result.data.map((app) => (
          <UnstyledButton
            key={app.id}
            aria-label={tApp("action.select.action", { app: app.name })}
            onClick={() => onSelect(app)}
          >
            <SourceAppSearchOption app={app} />
          </UnstyledButton>
        ))
      )}
    </Stack>
  );
}
