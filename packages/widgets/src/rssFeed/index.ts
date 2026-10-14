import { createWidgetDefinition } from "../definition";
import { definition as canonicalDefinition } from "./definition";

/**
 * Feed must conform to one of the following standards:
 * - https://www.rssboard.org/rss-specification (https://web.resource.org/rss/1.0/spec)
 * - https://datatracker.ietf.org/doc/html/rfc5023
 * - https://www.jsonfeed.org/version/1.1/
 */
export const { definition, componentLoader } = createWidgetDefinition("rssFeed", canonicalDefinition).withDynamicImport(
  () => import("./component"),
);
