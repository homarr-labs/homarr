import type { getSafeAppHref, getSafeApplicationUrl } from "../../../../../packages/common/src/url";
import type { searchEngineManageSchema } from "../../../../../packages/validation/src/search-engine";

import type { MediaResult, SearchRpcClient } from "./client";
import type { ReactNode } from "react";

export type SearchMode =
  | "search"
  | "apps"
  | "command"
  | "preferences"
  | "assistant"
  | "external"
  | "media"
  | "userGroup"
  | "bookmarks";

export type SearchDestination =
  | { path: "/manage/search-engines" }
  | { path: "/manage/search-engines/new" }
  | { path: "/manage/search-engines/edit/$id"; id: string }
  | { path: "/manage/apps/edit/$id"; id: string }
  | { path: "/manage/integrations/edit/$id"; id: string };

export type SearchAuthority = { kind: "ready" } | { kind: "held"; reason: string };

export interface SearchContextResult {
  id: string;
  name: string;
  description?: string;
  aliases?: string[];
  alwaysVisible?: boolean;
  unavailable?: boolean;
  dedupeKey?: string;
  href: string;
  newTab: boolean;
  kind: "app" | "bookmark";
}

export interface SearchSourceHelpers {
  catalogStaleTimeMs: number;
  filterCatalog<TOption>(
    options: TOption[],
    query: string,
    getSearchableValues: (option: TOption) => string[],
    limit?: number,
  ): TOption[];
  buildSearchUrl(template: string, query: string): string;
  getSafeAppHref: typeof getSafeAppHref;
  getSafeApplicationUrl: typeof getSafeApplicationUrl;
  searchEngineManageSchema: typeof searchEngineManageSchema;
  parseBangQuery(query: string): { bangToken: string; searchText: string; locked: boolean };
  matchesContext(query: string, option: SearchContextResult): boolean;
  rankContext(query: string, options: [SearchContextResult, SearchContextResult]): number;
}

export interface SearchSession {
  scope: string;
  authenticated: boolean;
  permissions: readonly string[];
  openSearchInNewTab?: boolean | null;
  ddgBangs?: boolean | null;
  isCurrent(): boolean;
}

export interface SearchNavigationLifecycle {
  readonly signal: AbortSignal;
  isCurrent(): boolean;
}

export interface SearchRuntime {
  client: SearchRpcClient;
  helpers: SearchSourceHelpers;
  authority: {
    searchEngine: SearchAuthority;
    apps: SearchAuthority;
    integrations: SearchAuthority;
    bangs: SearchAuthority;
    integrationSearch: SearchAuthority;
    mediaSearch: SearchAuthority;
    mediaRequest: SearchAuthority;
  };
  navigation:
    | { kind: "held"; reason: string }
    | {
        kind: "ready";
        go(destination: SearchDestination, lifecycle?: SearchNavigationLifecycle): void | Promise<void>;
      };
}

export type SearchBinding = { kind: "held"; reason: string } | { kind: "ready"; runtime: SearchRuntime };

export type SearchAction =
  | { kind: "link"; href: string; newTab: boolean; policy: "app" | "http" }
  | { kind: "route"; destination: SearchDestination }
  | { kind: "query"; query: string }
  | { kind: "integration"; integrationId: string; name: string; query: string }
  | { kind: "app"; id: string; name: string; href: string | null; iconUrl?: string }
  | { kind: "media"; result: MediaResult }
  | { kind: "children"; title: string; options: SearchOption[] }
  | { kind: "invoke"; run(lifecycle: SearchNavigationLifecycle): void | Promise<void>; closeOnSuccess?: boolean }
  | { kind: "mode"; mode: SearchMode; query?: string }
  | { kind: "none" };

export interface SearchOption {
  key: string;
  group: string;
  label: string;
  imageUrl?: string;
  icon?: ReactNode;
  description?: string | null;
  action: SearchAction;
  disabled?: boolean;
}

export type SearchPreferenceKey =
  | "colorScheme"
  | "locale"
  | "defaultSearchEngineId"
  | "openSearchInNewTab"
  | "ddgBangs"
  | "firstDayOfWeek"
  | "byteUnitSystem"
  | "homeBoardId"
  | "mobileHomeBoardId"
  | "pingIconsEnabled"
  | "enableRightClickOnWidgets"
  | "fullPreferencesPage";

export type SearchPreferenceValue = string | number | null;

export interface SearchPreferenceChoice {
  key: string;
  label: string;
  value: SearchPreferenceValue;
  unavailable?: string;
}

type PreferenceWriter<TValue> =
  | { kind: "held"; reason: string }
  | { kind: "ready"; setValue(value: TValue, lifecycle: SearchNavigationLifecycle): Promise<void> };

export type SearchPreference = { key: SearchPreferenceKey; label?: string; valueLabel?: string } & (
  | { kind: "boolean"; value: boolean; writer: PreferenceWriter<boolean> }
  | {
      kind: "select";
      value: SearchPreferenceValue;
      choices: SearchPreferenceChoice[];
      loading?: boolean;
      error?: string;
      writer: PreferenceWriter<SearchPreferenceValue>;
    }
  | { kind: "link"; action: SearchAction; unavailable?: string }
);

export interface SearchPaletteSources {
  pages?: SearchOption[];
  commands?: SearchOption[];
  boards?: SearchOption[];
  users?: SearchOption[];
  groups?: SearchOption[];
  directory?: {
    users?: SearchDirectoryCapability;
    groups?: SearchDirectoryCapability;
  };
  preferences?: SearchPreference[];
  assistant?:
    | { kind: "held"; reason: string }
    | { kind: "ready"; render(options: { query: string; session: SearchSession; isCurrent(): boolean }): ReactNode };
}

export const searchQueryKey = (scope: string, path?: string, input?: unknown) => {
  const key = ["search", scope, "content"];
  if (path === undefined) return key;
  return input === undefined ? [...key, path] : [...key, path, input];
};

export type SearchDirectoryCapability =
  | { kind: "held"; reason: string }
  | {
      kind: "ready";
      revision: string | number;
      search(
        input: { scope: string; query: string; limit: 8 },
        lifecycle: SearchNavigationLifecycle,
      ): Promise<SearchOption[]>;
    };

export interface SearchPaletteControls {
  requestClose(): boolean;
  canReplace(): boolean;
}

export interface SearchUnconfirmedOutcome {
  scope: string;
  action: "navigation" | "command" | "preference" | "media";
  reason: string;
}

export const searchManagementQueryKey = (scope: string, path?: string, input?: unknown) => {
  const key = ["search", scope, "management"];
  if (path === undefined) return key;
  return input === undefined ? [...key, path] : [...key, path, input];
};

export const searchRouteIntents = [
  "/manage/search-engines",
  "/manage/search-engines/new",
  "/manage/search-engines/edit/$id",
] as const;

export const searchEngineDeletionHold =
  "Deletion is unavailable until the native same-session transaction and lifecycle authority are accepted. No deletion was performed.";
