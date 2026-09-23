"use client";

import { useId, useState } from "react";
import { MantineProvider } from "@mantine/core";
import { createCustomJsxBindings, createCustomJsxComponents } from "@homarr/custom-widgets/jsx";
import { CustomJsxRenderer } from "@homarr/custom-widgets/runtime";
import { useColorMode } from "@/hooks/use-color-mode";
import { widgetPlaygroundData, widgetPlaygroundTemplate } from "./widget-playground-example";
/* oxlint-disable import/no-unassigned-import -- Embedded widget components require Mantine styles. */
import "@mantine/core/styles.layer.css";
/* oxlint-enable import/no-unassigned-import */

const registry = createCustomJsxComponents({ TablerIcon: () => null, copyLabels: { copy: "Copy", copied: "Copied" } });
const components = Object.fromEntries(
  ["Stack", "Group", "Text", "TextInput", "Progress", "Badge", "Card"].map((name) => {
    const component = registry[name];
    if (!component) throw new Error(`Missing playground component: ${name}`);
    return [name, component];
  }),
);
const initialData = JSON.stringify(widgetPlaygroundData, null, 2);
const messages = {
  noTemplate: "Enter a JSX expression to preview.",
  templateWarnings: (count: number) => `${count} template warnings`,
  bindingTypeConflict: (name: string, first: string, second: string) =>
    `Input ${name} cannot use both ${first} and ${second}.`,
};

export default function WidgetPlaygroundClient() {
  const id = useId();
  const { colorMode } = useColorMode();
  const [template, setTemplate] = useState(widgetPlaygroundTemplate);
  const [json, setJson] = useState(initialData);
  const [revision, setRevision] = useState(0);
  let data: unknown;
  let error: string | undefined;
  try {
    data = JSON.parse(json);
  } catch {
    error = "Enter valid JSON to update the preview.";
  }

  return (
    <div className="not-prose my-6 space-y-4 rounded-xl border p-4">
      <p className="text-sm text-fd-muted-foreground">
        Uses Homarr’s safe JSX renderer with sample data. This example supports Stack, Group, Text, TextInput, Progress,
        Badge, and Card. Edits stay in this page. Configured widget queries and actions do not run.
      </p>
      <label className="block space-y-2" htmlFor={`${id}-jsx`}>
        <span className="font-medium">JSX template</span>
        <textarea
          id={`${id}-jsx`}
          className="block w-full rounded-lg border bg-fd-background p-3 font-mono text-sm"
          rows={9}
          value={template}
          maxLength={50000}
          spellCheck={false}
          onChange={(event) => setTemplate(event.target.value)}
        />
      </label>
      <label className="block space-y-2" htmlFor={`${id}-data`}>
        <span className="font-medium">Sample response data</span>
        <textarea
          id={`${id}-data`}
          className="block w-full rounded-lg border bg-fd-background p-3 font-mono text-sm"
          rows={6}
          value={json}
          maxLength={20000}
          spellCheck={false}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-error`}
          onChange={(event) => setJson(event.target.value)}
        />
      </label>
      <output id={`${id}-error`} className="block text-sm text-red-600">
        {error}
      </output>
      <button
        type="button"
        className="rounded-lg border px-3 py-2 text-sm"
        onClick={() => {
          setTemplate(widgetPlaygroundTemplate);
          setJson(initialData);
          setRevision((value) => value + 1);
        }}
      >
        Reset example
      </button>
      <section className="rounded-lg border p-4" aria-label="Widget preview">
        {!error && (
          <MantineProvider forceColorScheme={colorMode}>
            <CustomJsxRenderer
              key={revision}
              template={template}
              data={data}
              components={components}
              createBindings={createCustomJsxBindings}
              messages={messages}
            />
          </MantineProvider>
        )}
      </section>
    </div>
  );
}
