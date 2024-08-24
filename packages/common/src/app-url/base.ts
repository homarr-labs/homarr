import * as tldts from "tldts";

const safeParseTldts = (url: string) => {
  try {
    return tldts.parse(url);
  } catch {
    return null;
  }
};

export const parseAppHrefWithVariables = <TInput extends string | null>(url: TInput, currentHref: string): TInput => {
  if (!url || url.length === 0) return url;

  const tldtsResult = safeParseTldts(currentHref);

  const urlObject = new URL(currentHref);

  return url
    .replaceAll("[homarr_base]", `${urlObject.protocol}//${urlObject.hostname}`)
    .replaceAll("[homarr_hostname]", tldtsResult?.hostname ?? "")
    .replaceAll("[homarr_domain]", tldtsResult?.domain ?? "")
    .replaceAll("[homarr_protocol]", urlObject.protocol.replace(":", "")) as TInput;
};
