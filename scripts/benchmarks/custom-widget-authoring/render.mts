import path from "node:path";

const root = path.resolve(process.env.ROOT ?? process.cwd());
const parent = `file://${root}/packages/custom-widgets/src/runtime/index.ts`;
const load = (specifier: string) => import(import.meta.resolve(specifier, parent));

const [React, ReactDomServer, Mantine, ReactQuery] = await Promise.all([
  load("react"),
  load("react-dom/server"),
  load("@mantine/core"),
  load("@tanstack/react-query"),
]);
const runtime = await import(`${root}/packages/custom-widgets/src/runtime/index.ts`);
const jsx = await import(`${root}/packages/custom-widgets/src/jsx/index.ts`);

const createElement = React.createElement;
const components = jsx.createCustomJsxComponents({
  TablerIcon: () => null,
  copyLabels: { copy: "Copy", copied: "Copied" },
});
const runtimeMessages = {
  requestIdRequired: "Request ID required",
  unsavedPreview: "Unsaved",
  invalidParams: "Invalid params",
  loadRequest: "Load",
  requestFailed: "Failed",
  loading: "Loading",
  retry: "Retry",
  widgetItemUnavailable: "Unavailable",
  actionsDisabledEditMode: "Disabled",
  actionSimulated: "Simulated",
  actionCompleted: "Completed",
  confirmDelete: "Confirm delete",
  toggle: "Toggle",
  refresh: "Refresh",
};
const rendererMessages = {
  noTemplate: "NO_TEMPLATE",
  templateWarnings: (count: number) => `TEMPLATE_WARNINGS(${count})`,
  bindingTypeConflict: (name: string) => `BINDING_TYPE_CONFLICT(${name})`,
};
const port = {
  query: async () => ({ ok: true, status: 200, data: null }),
  executeAction: async () => ({ ok: true, status: 200, data: null }),
  invalidate: async () => undefined,
  confirm: async () => true,
  notify: () => undefined,
};

type Widget = {
  sources: Record<string, Record<string, unknown>>;
  requests: Record<string, { kind?: string; method?: string; path: string; trigger?: string; source?: string }>;
  options?: Record<string, { default?: unknown }>;
  template: string;
};

export function renderWidget(widget: Widget, data: Record<string, unknown>, status: Record<string, unknown>) {
  const capabilities = runtime.parseRequestCapabilities(
    Object.entries(widget.requests).map(([id, request]) => ({
      id,
      kind: request.kind ?? "query",
      method: request.method ?? "GET",
      trigger: request.trigger ?? "load",
      minimumBoardPermission: "view",
    })),
  );
  const options = Object.fromEntries(
    Object.entries(widget.options ?? {}).map(([name, option]) => [name, option.default]),
  );
  const queryClient = new ReactQuery.QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = createElement(
    Mantine.MantineProvider,
    null,
    createElement(
      ReactQuery.QueryClientProvider,
      { client: queryClient },
      createElement(
        runtime.CustomWidgetRuntimeProvider,
        {
          itemId: "grader-item",
          isEditMode: false,
          requestCapabilities: capabilities,
          port,
          messages: runtimeMessages,
        },
        createElement(runtime.CustomJsxRenderer, {
          template: widget.template,
          data,
          status,
          options,
          components,
          createBindings: jsx.createCustomJsxBindings,
          messages: rendererMessages,
        }),
      ),
    ),
  );
  return ReactDomServer.renderToStaticMarkup(tree) as string;
}

export const runtimeError = (html: string) => {
  const index = html.indexOf("RUNTIME_RENDER_ERROR");
  return textContent(html.slice(index, index + 2_000)).slice(0, 240);
};

export const textContent = (html: string) =>
  html
    .replaceAll(/<style[^>]*>[\s\S]*?<\/style>/gu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&#x27;|&#39;/gu, "'")
    .replaceAll(/&quot;/gu, '"')
    .replaceAll(/&amp;/gu, "&")
    .replaceAll(/\s+/gu, " ");
