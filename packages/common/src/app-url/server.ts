import { headers } from "next/headers";

import { extractBaseUrlFromHeaders } from "../url";
import { parseAppHrefWithVariables } from "./base";

export const parseAppHrefWithVariablesServer = <TInput extends string | null>(url: TInput): TInput => {
  return parseAppHrefWithVariables(url, extractBaseUrlFromHeaders(headers()));
};
