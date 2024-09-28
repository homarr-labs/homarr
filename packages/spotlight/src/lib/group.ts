import type { UseTRPCQueryResult } from "@trpc/react-query/shared";

import type { stringOrTranslation } from "@homarr/translation";

import type { inferSearchInteractionDefinition, inferSearchInteractionOptions, SearchInteraction } from "./interaction";

type CommonSearchGroup<TOption extends Record<string, unknown>, TOptionProps extends Record<string, unknown>> = {
  // key path is used to define the path to a unique key in the option object
  keyPath: keyof TOption;
  title: stringOrTranslation;
  component: (option: TOption) => JSX.Element;
  useInteraction: (option: TOption, query: string) => inferSearchInteractionDefinition<SearchInteraction>;
  onKeyDown?: (
    event: KeyboardEvent,
    options: TOption[],
    query: string,
    actions: {
      setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
    },
  ) => void;
} & TOptionProps;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SearchGroup<TOption extends Record<string, unknown> = any> =
  | CommonSearchGroup<TOption, { filter: (query: string, option: TOption) => boolean; options: TOption[] }>
  | CommonSearchGroup<
      TOption,
      {
        filter: (query: string, option: TOption) => boolean;
        sort?: (query: string, options: [TOption, TOption]) => number;
        useOptions: () => TOption[];
      }
    >
  | CommonSearchGroup<TOption, { useQueryOptions: (query: string) => UseTRPCQueryResult<TOption[], unknown> }>;

export const createGroup = <TOption extends Record<string, unknown>>(group: SearchGroup<TOption>) => group;
