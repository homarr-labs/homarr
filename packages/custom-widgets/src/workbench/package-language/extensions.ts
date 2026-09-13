import { autocompletion } from "@codemirror/autocomplete";
import type { Completion } from "@codemirror/autocomplete";
import { forceLinting, linter } from "@codemirror/lint";
import { Prec } from "@codemirror/state";
import { hoverTooltip, keymap, ViewPlugin } from "@codemirror/view";

import type { PackageLanguageClient } from "./client";
import type { PackageLanguageCallbacks, PackageLanguageInfo } from "./types";

export function createPackageLanguageExtensions(
  client: PackageLanguageClient,
  path: string,
  callbacks: PackageLanguageCallbacks,
) {
  const report = (cause: unknown) => {
    if (cause instanceof Error && cause.name === "AbortError") return;
    callbacks.error(cause instanceof Error ? cause.message : String(cause));
  };
  return [
    ViewPlugin.define((view) => {
      let active = true;
      const unsubscribe = client.subscribe(() => {
        // A change in another file also invalidates this file's semantic diagnostics.
        queueMicrotask(() => {
          if (active) forceLinting(view);
        });
      });
      return {
        destroy() {
          active = false;
          unsubscribe();
        },
      };
    }),
    linter(
      async (view) => {
        const source = view.state.doc.toString();
        client.updateActive(path, source);
        try {
          const diagnostics = await client.request("diagnostics", { path });
          if (view.state.doc.toString() !== source) return [];
          callbacks.diagnostics(diagnostics);
          return diagnostics.map((diagnostic) => ({
            from: Math.min(diagnostic.from, source.length),
            to: Math.min(diagnostic.to, source.length),
            severity: diagnostic.severity,
            message: diagnostic.message,
            source: `TS${diagnostic.code}`,
          }));
        } catch (cause) {
          report(cause);
          return [];
        }
      },
      { delay: 450 },
    ),
    autocompletion({
      override: [
        async (context) => {
          const word = context.matchBefore(/[\w$]+/u);
          if (!context.explicit && !word && context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos) !== ".")
            return null;
          client.updateActive(path, context.state.doc.toString());
          try {
            const completions = await client.request("complete", {
              path,
              position: context.pos,
              prefix: word?.text ?? "",
            });
            if (context.aborted) return null;
            return {
              from: word?.from ?? context.pos,
              options: completions.map(
                (completion): Completion => ({
                  label: completion.name,
                  type: completionKind(completion.kind),
                  detail: completion.kind,
                  apply: (view, _completion, from, to) => {
                    const start = completion.from ?? from;
                    const insert = completion.insertText ?? completion.name;
                    view.dispatch({
                      changes: { from: start, to: completion.to ?? to, insert },
                      selection: { anchor: start + insert.length },
                    });
                  },
                  info: async () => {
                    try {
                      const info = await client.request("detail", {
                        path,
                        position: context.pos,
                        name: completion.name,
                      });
                      return infoNode(info);
                    } catch {
                      return infoNode(null);
                    }
                  },
                }),
              ),
            };
          } catch (cause) {
            report(cause);
            return null;
          }
        },
      ],
    }),
    hoverTooltip(async (view, position) => {
      const source = view.state.doc.toString();
      client.updateActive(path, source);
      try {
        const info = await client.request("hover", { path, position });
        if (!info || view.state.doc.toString() !== source) return null;
        return { pos: info.from, end: info.to, above: true, create: () => ({ dom: infoNode(info) }) };
      } catch (cause) {
        report(cause);
        return null;
      }
    }),
    Prec.high(
      keymap.of([
        {
          key: "F12",
          run(view) {
            client.updateActive(path, view.state.doc.toString());
            void client
              .request("definition", { path, position: view.state.selection.main.head })
              .then((location) => {
                if (location) callbacks.navigate(location);
              })
              .catch(report);
            return true;
          },
        },
        {
          key: "F2",
          run(view) {
            if (!callbacks.rename || view.state.readOnly) return false;
            const position = view.state.selection.main.head;
            const word = view.state.wordAt(position);
            if (!word) return false;
            callbacks.rename(position, view.state.sliceDoc(word.from, word.to));
            return true;
          },
        },
      ]),
    ),
  ];
}

function completionKind(kind: string) {
  if (["method", "function", "getter", "setter"].includes(kind)) return "function";
  if (["class", "interface", "type", "enum", "module"].includes(kind)) return "class";
  if (["property", "member variable"].includes(kind)) return "property";
  if (kind === "keyword") return "keyword";
  return "variable";
}

function infoNode(info: PackageLanguageInfo | null) {
  const node = document.createElement("div");
  node.style.cssText = "white-space:pre-wrap;padding:8px;max-width:min(560px,80vw);max-height:260px;overflow:auto";
  if (info) node.textContent = [info.signature, info.documentation].filter(Boolean).join("\n\n");
  return node;
}
