import { useState } from "react";
import { MantineProvider, Select, Stack, Text } from "@mantine/core";
/* oxlint-disable import/no-unassigned-import -- Mantine component styles intentionally load for side effects. */
import "@mantine/core/styles/Badge.css";
import "@mantine/core/styles/Button.css";
import "@mantine/core/styles/Combobox.css";
import "@mantine/core/styles/Group.css";
import "@mantine/core/styles/Input.css";
import "@mantine/core/styles/Loader.css";
import "@mantine/core/styles/Pill.css";
import "@mantine/core/styles/PillsInput.css";
import "@mantine/core/styles/Popover.css";
import "@mantine/core/styles/ScrollArea.css";
import "@mantine/core/styles/Stack.css";
import "@mantine/core/styles/Text.css";
import "@mantine/core/styles/UnstyledButton.css";
/* oxlint-enable import/no-unassigned-import */

import {
  BUNDLED_CUSTOM_WIDGETS,
  CUSTOM_WIDGET_OPTIONS_EXAMPLES,
  CUSTOM_WIDGET_REQUEST_EXAMPLES,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import { ReadOnlyCustomWidgetCode } from "@homarr/custom-widgets/workbench";

import type { CanonicalCustomWidgetExampleProps, CustomWidgetCodeExampleProps } from "./custom-widget-code";

const messages: CustomWidgetEditorMessages = {
  languageJsx: "JSX",
  languageJson: "JSON",
  undo: "Undo",
  redo: "Redo",
  components: "Components",
  componentSearch: "Search components",
  componentEmpty: "No matching components",
  componentCount: (count) => `${count} components`,
  insertStarter: "Insert starter",
  format: "Format",
  copy: "Copy",
  copied: "Copied",
  schema: "Schema",
  schemaTab: "JSON Schema",
  minimalTab: "Minimal example",
  fullTab: "Full example",
  errors: (count) => `${count} errors`,
  warnings: (count) => `${count} warnings`,
  ready: "Read-only example",
  position: ({ line, column }) => `Ln ${line}, Col ${column}`,
  characters: (count, limit) => (limit ? `${count} / ${limit}` : `${count} characters`),
  diagnosticsTitle: "Diagnostics",
  diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
};

export function CanonicalCustomWidgetExampleClient({ id, label, example, height }: CanonicalCustomWidgetExampleProps) {
  const value = example === "requests" ? CUSTOM_WIDGET_REQUEST_EXAMPLES.full : CUSTOM_WIDGET_OPTIONS_EXAMPLES.full;

  return <CustomWidgetCodeExampleClient id={id} label={label} code={JSON.stringify(value, null, 2)} height={height} />;
}

export function CustomWidgetCodeExampleClient(props: CustomWidgetCodeExampleProps) {
  return (
    <MantineProvider forceColorScheme={getDocumentationColorScheme()}>
      <ReadOnlyCustomWidgetCode
        id={props.id}
        label={props.label}
        language={props.language ?? "json"}
        value={props.code}
        messages={messages}
        height={props.height}
      />
    </MantineProvider>
  );
}

export function BundledCustomWidgetGalleryClient() {
  const [selectedId, setSelectedId] = useState(BUNDLED_CUSTOM_WIDGETS[0]?.id ?? null);
  const selected = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === selectedId) ?? BUNDLED_CUSTOM_WIDGETS[0];
  if (!selected) return null;
  const manifest = { ...selected.widget, template: "__HOMARR_TEMPLATE__" };

  return (
    <MantineProvider forceColorScheme={getDocumentationColorScheme()}>
      <Stack gap="md">
        <Select
          label="Bundled widget"
          data={BUNDLED_CUSTOM_WIDGETS.map(({ id, widget }) => ({ value: id, label: widget.name }))}
          value={selected.id}
          onChange={(value) => {
            if (value) setSelectedId(value);
          }}
          allowDeselect={false}
        />
        <Text size="sm" c="dimmed">
          {selected.widget.description}
        </Text>
        <ReadOnlyCustomWidgetCode
          id={`${selected.id}-manifest`}
          label="widget.json"
          language="json"
          value={JSON.stringify(manifest, null, 2)}
          messages={messages}
          height="340px"
        />
        <ReadOnlyCustomWidgetCode
          id={`${selected.id}-template`}
          label="widget.jsx"
          language="jsx"
          value={selected.widget.template}
          messages={messages}
          height="340px"
        />
      </Stack>
    </MantineProvider>
  );
}

function getDocumentationColorScheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
