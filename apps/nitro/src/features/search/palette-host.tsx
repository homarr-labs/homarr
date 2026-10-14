import { useHotkeys } from "@mantine/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  consumePendingMediaRequestSearch,
  consumePendingSpotlightOpen,
  mediaRequestSearchEvent,
  spotlightOpenEvent,
} from "../../../../../packages/spotlight/src/open";
import type { OpenMediaRequestSearchOptions, SpotlightOpenIntent } from "../../../../../packages/spotlight/src/open";
import { runtimeSearchModes } from "../../source-ui/search";
import { searchQueryKey } from "./contracts";
import type { SearchPaletteControls } from "./contracts";
import { SearchContent } from "./search-content";
import type { SearchContentProps } from "./search-content";

export interface SearchPaletteHostProps extends Omit<
  SearchContentProps,
  "opened" | "onClose" | "openIntentRevision" | "initialMode" | "initialQuery" | "integrationIds" | "controlsRef"
> {
  shortcut?: string | null;
  onOpenChange?(opened: boolean): void;
}

interface PaletteIntent extends SpotlightOpenIntent {
  integrationIds?: string[];
  revision: number;
}

export function SearchPaletteHost(props: SearchPaletteHostProps) {
  return <ScopedSearchPaletteHost key={props.session.scope} {...props} />;
}

function ScopedSearchPaletteHost({ shortcut = "mod + K", onOpenChange, ...props }: SearchPaletteHostProps) {
  const [intent, setIntent] = useState<PaletteIntent | null>(null);
  const revision = useRef(0);
  const queryClient = useQueryClient();
  const controlsRef = useRef<SearchPaletteControls | null>(null);
  const open = useCallback(
    (options: SpotlightOpenIntent, integrationIds?: string[]) => {
      if (!props.session.isCurrent()) return;
      if (controlsRef.current && !controlsRef.current.canReplace()) return;
      revision.current += 1;
      void queryClient.cancelQueries({ queryKey: searchQueryKey(props.session.scope) });
      setIntent({ ...options, integrationIds, revision: revision.current });
      onOpenChange?.(true);
    },
    [props.session, queryClient, onOpenChange],
  );

  const close = useCallback(() => {
    revision.current += 1;
    void queryClient.cancelQueries({ queryKey: searchQueryKey(props.session.scope) });
    setIntent(null);
    onOpenChange?.(false);
  }, [props.session.scope, queryClient, onOpenChange]);

  useHotkeys(
    shortcut
      ? [
          [
            shortcut,
            () => {
              if (intent) controlsRef.current?.requestClose();
              else open({ mode: "search" });
            },
          ],
        ]
      : [],
  );

  useLayoutEffect(
    () => () => {
      revision.current += 1;
      void queryClient.cancelQueries({ queryKey: searchQueryKey(props.session.scope) });
    },
    [props.session.scope, queryClient],
  );

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const pending = consumePendingSpotlightOpen();
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
      const options = isOpenIntent(detail) ? detail : pending;
      if (!options) return;
      const media = options.mode === "media" ? consumePendingMediaRequestSearch() : null;
      open(options, media?.integrationIds);
    };
    const handleMedia = (event: Event) => {
      const pending = consumePendingMediaRequestSearch();
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
      const options = isMediaIntent(detail) ? detail : pending;
      if (options) open({ mode: "media", query: options.query }, options.integrationIds);
    };
    window.addEventListener(spotlightOpenEvent, handleOpen);
    window.addEventListener(mediaRequestSearchEvent, handleMedia);
    const pending = consumePendingSpotlightOpen();
    const media = consumePendingMediaRequestSearch();
    if (pending?.mode === "media" || (!pending && media))
      open({ mode: "media", query: media?.query ?? pending?.query }, media?.integrationIds);
    else if (pending) open(pending);
    return () => {
      window.removeEventListener(spotlightOpenEvent, handleOpen);
      window.removeEventListener(mediaRequestSearchEvent, handleMedia);
    };
  }, [open]);

  if (!intent) return null;
  return (
    <SearchContent
      key={intent.revision}
      {...props}
      initialMode={intent.mode}
      initialQuery={intent.query}
      integrationIds={intent.integrationIds}
      openIntentRevision={intent.revision}
      onClose={close}
      controlsRef={controlsRef}
    />
  );
}

function isOpenIntent(value: unknown): value is SpotlightOpenIntent {
  return (
    typeof value === "object" &&
    value !== null &&
    "mode" in value &&
    runtimeSearchModes.some((entry) => entry.mode === value.mode) &&
    (!("query" in value) || value.query === undefined || typeof value.query === "string")
  );
}

function isMediaIntent(value: unknown): value is OpenMediaRequestSearchOptions {
  return (
    typeof value === "object" &&
    value !== null &&
    (!("query" in value) || value.query === undefined || typeof value.query === "string") &&
    (!("integrationIds" in value) ||
      value.integrationIds === undefined ||
      (Array.isArray(value.integrationIds) && value.integrationIds.every((id: unknown) => typeof id === "string")))
  );
}
