import type { MaybePromise } from "@homarr/common/types";

import type { CreateChildrenOptionsProps } from "./children";

const createSearchInteraction = <TType extends string>(type: TType) => ({
  optionsType: <TOption extends Record<string, unknown>>() => ({ type, _inferOptions: {} as TOption }),
});

// This is used to define search interactions with their options
const searchInteractions = [
  createSearchInteraction("link").optionsType<{ href: string }>(),
  createSearchInteraction("javaScript").optionsType<{ onSelect: () => MaybePromise<void> }>(),
  createSearchInteraction("mode").optionsType<{ mode: string }>(),
  createSearchInteraction("children").optionsType<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useActions: CreateChildrenOptionsProps<any>["useActions"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detailComponent: CreateChildrenOptionsProps<any>["detailComponent"];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    option: any;
  }>(),
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  createSearchInteraction("disabled").optionsType<{}>(),
] as const;

// Union of all search interactions types
export type SearchInteraction = (typeof searchInteractions)[number]["type"];

// Infer the options for the specified search interaction
export type inferSearchInteractionOptions<TInteraction extends SearchInteraction> = Extract<
  (typeof searchInteractions)[number],
  { type: TInteraction }
>["_inferOptions"];

// Infer the search interaction definition (type + options) for the specified search interaction
export type inferSearchInteractionDefinition<TInteraction extends SearchInteraction> = {
  [interactionKey in TInteraction]: { type: interactionKey } & inferSearchInteractionOptions<interactionKey>;
}[TInteraction];

// Type used for helper functions to define basic search interactions
type SearchInteractions = {
  [optionKey in SearchInteraction]: <TOption extends Record<string, unknown>>(
    callback: (option: TOption, query: string) => inferSearchInteractionOptions<optionKey>,
  ) => (option: TOption, query: string) => inferSearchInteractionDefinition<optionKey>;
};

// Helper functions to define basic search interactions
export const interaction = searchInteractions.reduce((acc, interaction) => {
  return {
    ...acc,
    [interaction.type]: <TOption extends Record<string, unknown>>(
      callback: (option: TOption, query: string) => inferSearchInteractionOptions<SearchInteraction>,
    ) => {
      return (option: TOption, query: string) => ({ type: interaction.type, ...callback(option, query) });
    },
  };
}, {} as SearchInteractions);
