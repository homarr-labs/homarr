// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JsonPreviewEditor } from "./_json-preview-editor";

const editorProps = vi.hoisted(() => vi.fn());

vi.mock("@homarr/translation/client", () => ({
  useI18n: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));
vi.mock("./_code-editor", () => ({
  CodeEditor: (props: { error?: string; onChange(value: string): void }) => {
    editorProps(props);
    return <button onClick={() => props.onChange("{invalid")}>edit</button>;
  },
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

describe("preview JSON editor", () => {
  it("surfaces invalid JSON and clears the previously rendered options", async () => {
    const onChange = vi.fn();
    await act(async () => {
      root.render(<JsonPreviewEditor id="options" label="Options" value={{ stale: true }} onChange={onChange} />);
    });
    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());

    expect(onChange).toHaveBeenCalledWith({});
    expect(editorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ error: "customWidget.workbench.builder.invalidJson" }),
    );
  });
});
