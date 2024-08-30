import type { ReactNode } from "react";

import type { inferSearchInteractionDefinition } from "./interaction";

export interface CreateChildrenOptionsProps<TParentOptions extends Record<string, unknown>> {
  detailComponent: ({ options }: { options: TParentOptions }) => ReactNode;
  actions: ChildrenAction<TParentOptions>[];
}

interface ChildrenAction<TParentOptions extends Record<string, unknown>> {
  component: (option: TParentOptions) => JSX.Element;
  interaction: (option: TParentOptions, query: string) => inferSearchInteractionDefinition<"link" | "javaScript">;
}

export const createChildrenOptions = <TParentOptions extends Record<string, unknown>>(
  props: CreateChildrenOptionsProps<TParentOptions>,
) => {
  return (option: TParentOptions) => ({
    option,
    ...props,
  });
};
