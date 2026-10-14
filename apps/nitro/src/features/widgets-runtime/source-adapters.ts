import { fileURLToPath } from "node:url";
import { normalizePath } from "vite";
import type { Plugin } from "vite";

const sourceRoot = normalizePath(fileURLToPath(new URL("../../../../../packages/widgets/src/", import.meta.url)));

const replacements: ReadonlyMap<string, string> = new Map([
  ["@homarr/api/client", fileURLToPath(new URL("./native-client.ts", import.meta.url))],
  ["@homarr/api/query-cache", fileURLToPath(new URL("./query-state.ts", import.meta.url))],
  ["@trpc/react-query", fileURLToPath(new URL("./query-key.ts", import.meta.url))],
]);

const sourceWeatherRenderer = `${sourceRoot}weather/component.tsx`;
const nativeWeatherRenderer = fileURLToPath(new URL("./views/weather.tsx", import.meta.url));

export function nativeWidgetSourceAdapters(): Plugin {
  return {
    name: "homarr-native-widget-source-adapters",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!importer || !normalizePath(importer).startsWith(sourceRoot)) return null;
      const replacement = replacements.get(source);
      if (replacement) return replacement;
      if (!source.startsWith(".")) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      return resolved && normalizePath(resolved.id) === sourceWeatherRenderer ? nativeWeatherRenderer : null;
    },
  };
}
