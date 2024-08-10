import { parseAppHrefWithVariables } from "./base";

export const parseAppHrefWithVariablesClient = <TInput extends string | null>(url: TInput): TInput => {
  return parseAppHrefWithVariables(url, window.location.href);
};
