import { parseAppHrefWithVariables } from "./base";

export const parseAppHrefWithVariablesClient = <TInput extends string | null>(url: TInput): TInput => {
  if (typeof window === "undefined") return url;
  return parseAppHrefWithVariables(url, window.location.href);
};
