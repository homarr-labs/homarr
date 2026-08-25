import type { JSX } from "react";

import type { stringOrTranslation } from "@homarr/translation";

import type { inferSearchInteractionDefinition, SearchInteraction } from "./interaction";

export type RemoteSearchSource =
  | "apps"
  | "boards"
  | "integrations"
  | "users"
  | "groups"
  | "search-engines"
  | "integration-search"
  | "media";

export type SearchGroupSource =
  | { kind: "local" }
  | { kind: "remote"; source: RemoteSearchSource }
  | { kind: "fallback" };

type CommonSearchGroup<TOption extends object, TOptionProps extends object> = {
  // key path is used to define the path to a unique key in the option object
  keyPath: keyof TOption;
  title: stringOrTranslation;
  source?: SearchGroupSource;
  Component: (option: TOption) => JSX.Element;
  useInteraction: (option: TOption, query: string) => inferSearchInteractionDefinition<SearchInteraction>;
} & TOptionProps;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchGroup<TOption extends object = any> =
  | CommonSearchGroup<TOption, { filter: (query: string, option: TOption) => boolean; options: TOption[] }>
  | CommonSearchGroup<
      TOption,
      {
        filter: (query: string, option: TOption) => boolean;
        sort?: (query: string, options: [TOption, TOption]) => number;
        useOptions: (query: string) => TOption[];
      }
    >
  | CommonSearchGroup<
      TOption,
      { useQueryOptions: (query: string) => { data: TOption[] | undefined; isLoading: boolean; isError: boolean } }
    >;

export const createGroup = <TOption extends object>(group: SearchGroup<TOption>) => group;
