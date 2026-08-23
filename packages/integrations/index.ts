/**
 * The package root is intentionally type-only. Runtime integrations must use
 * a narrow export such as `@homarr/integrations/factory` so importing one
 * capability cannot eagerly pull every concrete integration into the graph.
 */
export type * from "./src";
