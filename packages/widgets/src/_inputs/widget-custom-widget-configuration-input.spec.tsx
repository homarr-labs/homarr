// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JsonOption } from "./widget-custom-widget-configuration-input";

vi.mock("@homarr/custom-widgets/workbench", () => ({
  CustomWidgetCodeEditor: (props: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onChange(value: string): void;
  }) => (
    <textarea
      id={props.id}
      aria-label={props.label}
      aria-invalid={Boolean(props.error)}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    />
  ),
}));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

async function renderJsonOption(identity: string, value: unknown) {
  await act(async () => {
    root.render(
      <JsonOption
        identity={identity}
        editorId="settings-json-option"
        label="Settings"
        value={value}
        onChange={vi.fn()}
      />,
    );
  });
}

function enterEditorValue(editor: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  valueSetter?.call(editor, value);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("custom widget JSON option", () => {
  it("preserves an invalid active draft until its definition or external value changes", async () => {
    await renderJsonOption("definition-a:settings", { owner: "Alice" });
    const editor = host.querySelector("textarea");
    if (!editor) throw new Error("JSON editor was not rendered");
    expect(editor?.value).toContain("Alice");

    await act(async () => enterEditorValue(editor, '{"owner":'));
    expect(editor?.value).toBe('{"owner":');

    await renderJsonOption("definition-a:settings", { owner: "Alice" });
    expect(editor?.value).toBe('{"owner":');

    await renderJsonOption("definition-b:settings", { owner: "Bob" });
    expect(editor?.value).toContain("Bob");
    expect(editor?.value).not.toContain("Alice");
  });

  it("synchronizes a valid external configuration update", async () => {
    await renderJsonOption("definition-a:settings", { page: 1 });
    const editor = host.querySelector("textarea");
    await renderJsonOption("definition-a:settings", { page: 2 });
    expect(editor?.value).toContain('"page": 2');
  });
});
