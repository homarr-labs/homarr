import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const root = process.env.ROOT;
if (!root) throw new Error("ROOT required");
const require = createRequire(`${root}/package.json`);
const { build } = require("esbuild");
const scratch = import.meta.dirname;
globalThis.__cw = { counts: {}, publish: {}, queries: 0 };
const bump = (name) =>
  `(globalThis.__cw.counts[${JSON.stringify(name)}] = (globalThis.__cw.counts[${JSON.stringify(name)}] ?? 0) + 1);`;
const instrument = process.env.COUNTS === "1";
const outputDirectory = resolve(process.env.OUTPUT ?? `${scratch}/../output/runtime`);
await mkdir(outputDirectory, { recursive: true });
const output = `${outputDirectory}/generated-${process.env.LABEL ?? "run"}.mjs`;
await build({
  stdin: {
    contents: (await readFile(`${scratch}/${process.env.FIXTURE ?? "fixture.tsx"}`, "utf8")).replaceAll(
      "__ROOT__",
      root,
    ),
    resolveDir: root,
    sourcefile: `${scratch}/fixture.tsx`,
    loader: "tsx",
  },
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  logLevel: "error",
  plugins: [
    {
      name: "fixture-ports",
      setup(build) {
        build.onResolve(
          { filter: /^@homarr\/(common|translation\/client|api\/client|modals|notifications)$/ },
          (args) => ({ path: args.path, namespace: "ports" }),
        );
        build.onLoad({ filter: /.*/, namespace: "ports" }, (args) => {
          if (args.path === "@homarr/common")
            return {
              contents:
                'export const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);',
            };
          if (args.path === "@homarr/translation/client")
            return {
              contents:
                'const translations = new Map(); export function useI18n(namespace) { if (!translations.has(namespace)) translations.set(namespace, (key, values) => key === "templateWarnings" ? `${values.count} warnings` : key); return translations.get(namespace); }',
            };
          if (args.path === "@homarr/modals")
            return {
              contents:
                "export const useConfirmModal = () => { const version = (globalThis.__cw.modalVersion ?? 0) + 1; globalThis.__cw.modalVersion = version; return {openConfirmModal: options => {globalThis.__cw.confirmVersion = version; globalThis.__cw.confirmExpectedVersion = globalThis.__cw.modalVersion; options.onConfirm();}}; };",
            };
          if (args.path === "@homarr/notifications")
            return {
              contents:
                "export const showErrorNotification = () => {}; export const showSuccessNotification = () => {};",
            };
          return {
            contents:
              'const query = async () => { globalThis.__cw.queries++; return { ok: true, status: 200, data: { value: "query result" } }; }; const mutate = query; const invalidate = async () => {}; const utils = { widget: { customApi: { getData: { invalidate } } } }; export const clientApi = { useUtils: () => utils }; export const fetchApi = { widget: { customApi: { queryRequest: {query}, executeAction: {mutate}, refresh: {mutate} } }, customWidget: { previewQuery: {query}, previewAction: {mutate}, previewRefresh: {mutate} } };',
          };
        });
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith("@homarr/custom-widgets")) return { path: require.resolve(args.path) };
          return { path: require.resolve(args.path), external: !args.path.endsWith(".json") };
        });
        build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
          if (!args.path.startsWith(`${root}/packages/`)) return;
          let contents = await readFile(args.path, "utf8");
          if (process.env.REF)
            contents = execFileSync("git", ["show", `${process.env.REF}:${args.path.slice(root.length + 1)}`], {
              cwd: root,
              encoding: "utf8",
            });
          if (args.path.endsWith("/widget-definition-context.tsx"))
            contents = contents.replace(
              "export function WidgetDefinitionProvider(props: WidgetDefinitionProviderProps) {",
              'export function WidgetDefinitionProvider(props: WidgetDefinitionProviderProps) { globalThis.__cw.publish[props.itemId ?? "preview"] = props.setQueryState;',
            );
          if (instrument) {
            if (args.path.endsWith("/bindings.ts"))
              contents = contents.replace(
                "if (++nodes > CUSTOM_JSX_DATA_LIMITS.nodes) {",
                `${bump("sanitizeVisits")}if (++nodes > CUSTOM_JSX_DATA_LIMITS.nodes) {`,
              );
            const insertions = [
              [
                "/interpreter-parser.ts",
                "export function parseCustomJsxTemplate(template: string): AstNode {",
                "parses",
              ],
              ["/interpreter.tsx", "public render(root: AstNode): SafeJsxRenderResult {", "evaluations"],
              ["/interpreter.tsx", "private emitterContext(): JsxEmitterContext {", "emitterContexts"],
              ["/interpreter.tsx", "this.context = {", "evaluationContexts"],
              ["/bindings.ts", "export function createCustomJsxBindings(apiData: unknown) {", "bindings"],
              ["/custom-jsx-renderer.tsx", "const inputScopeId = useId();", "rendererRenders"],
              ["/runtime-components.tsx", "const detachedScopeId = useId();", "boundWrappers"],
              ["/custom-jsx-display.tsx", 'const t = useI18n("widget.customApi.customJsx");', "displayRenders"],
              ["/refresh-button.tsx", "const runtime = useCustomWidgetRuntime();", "refreshRenders"],
              ["/sub-fetch.tsx", "export function SubFetch(props: SubFetchProps) {", "subFetchRenders"],
              ["/actions.tsx", "export function ActionButton(props: ActionButtonProps) {", "actionRenders"],
              ["/actions.tsx", "export function ToggleSwitch(props: ToggleSwitchProps) {", "toggleRenders"],
              ["/jsx-icon-adapter.tsx", "function SafeTablerIcon(props: Record<string, unknown>) {", "iconRenders"],
            ];
            for (const [suffix, needle, counter] of insertions)
              if (args.path.endsWith(suffix)) {
                if (counter === "evaluationContexts") contents = contents.replace(needle, `${bump(counter)}${needle}`);
                else contents = contents.replace(needle, `${needle}${bump(counter)}`);
              }
            if (args.path.endsWith("/interpreter.tsx")) {
              for (const needle of [
                "return runInterpreterCallback(callback, args, depth, {",
                "return callCollectionMethod(receiver, method, args, depth, {",
              ])
                contents = contents.replace(needle, `${bump("helperContexts")}${needle}`);
            }
          }
          return { contents, loader: args.path.endsWith("x") ? "tsx" : "ts" };
        });
      },
    },
  ],
});
if (process.env.BUILD_ONLY !== "1") {
  const result = await import(pathToFileURL(output).href);
  await result.run();
}
