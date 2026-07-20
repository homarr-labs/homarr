// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MantineProvider } from "@mantine/core";
import { describe, expect, test, vi } from "vitest";

import { validateCustomJsxTemplate } from "../jsx/analyzer";
import { Budget, DEFAULT_BUDGETS } from "../jsx/interpreter-foundation";
import { SafeJsxError } from "../jsx/interpreter-foundation";
import { renderSafeJsx } from "../jsx/interpreter";
import { buildTrustedRecursiveList, TrustedRecursiveList } from "../jsx/recursive-list";

describe("RecursiveList", () => {
  test("renders arbitrary-depth data through the trusted template slot", () => {
    const template = `<RecursiveList data={data.chain} childrenPath="children" keyPath="name" defaultExpandedDepth={16}>
      {(node, meta) => {
        const label = node.name.toUpperCase();
        return <Text>{meta.depth}: {label}</Text>;
      }}
    </RecursiveList>`;
    expect(validateCustomJsxTemplate(template).filter(({ severity }) => severity === "error")).toEqual([]);
    const rendered = renderSafeJsx({
      template,
      components: {
        RecursiveList: TrustedRecursiveList as never,
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: { data: { chain: deepTree(8) } },
    });
    const html = renderToStaticMarkup(createElement(MantineProvider, null, rendered.node));
    expect(html).toContain("0: LEVEL-0");
    expect(html).toContain("7: LEVEL-7");
    expect(html).toContain('role="tree"');
    expect(html).toContain('role="treeitem"');
    expect(html).toContain('aria-expanded="true"');
  });

  test("contains malformed children, cycles, depth limits, and node limits", () => {
    const cycle: Record<string, unknown> = { name: "cycle" };
    cycle.children = [cycle];
    const malformed = { name: "malformed", children: "not-an-array" };
    const warnings = new Set<string>();
    const nodes = buildTrustedRecursiveList({
      data: [cycle, malformed],
      childrenPath: "children",
      keyPath: "name",
      maxDepth: 2,
      maxNodes: 20,
      warnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: (node) => String((node as { name: string }).name),
    });
    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.children?.[0]?.label).toBeTruthy();
    expect(nodes[1]?.children?.[0]?.label).toBeTruthy();
    expect([...warnings]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("RECURSIVE_LIST_CYCLE"),
        expect.stringContaining("RECURSIVE_LIST_INVALID_CHILDREN"),
      ]),
    );

    const cappedWarnings = new Set<string>();
    const capped = buildTrustedRecursiveList({
      data: Array.from({ length: 100 }, (_, index) => (index % 2 === 0 ? index : { name: `node-${index}` })),
      childrenPath: "children",
      keyPath: "name",
      maxNodes: 4,
      warnings: cappedWarnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: () => null,
    });
    expect(capped).toHaveLength(4);
    expect(countTreeNodes(capped)).toBe(4);
    expect([...cappedWarnings]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("RECURSIVE_LIST_INVALID_NODE"),
        expect.stringContaining("RECURSIVE_LIST_NODE_LIMIT"),
      ]),
    );

    const exactWarnings = new Set<string>();
    const exact = buildTrustedRecursiveList({
      data: Array.from({ length: 4 }, (_, index) => ({ name: `exact-${index}` })),
      childrenPath: "children",
      keyPath: "name",
      maxNodes: 4,
      warnings: exactWarnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: (node) => (node as { name: string }).name,
    });
    expect(exact).toHaveLength(4);
    expect([...exactWarnings].some((warning) => warning.includes("NODE_LIMIT"))).toBe(false);

    const oneRoot = buildTrustedRecursiveList({
      data: { name: "only" },
      childrenPath: "children",
      keyPath: "name",
      maxNodes: 1,
      warnings: new Set(),
      budget: new Budget(DEFAULT_BUDGETS),
      render: (node) => (node as { name: string }).name,
    });
    expect(oneRoot).toHaveLength(1);
    expect(oneRoot[0]?.label).toBe("only");

    const nestedWarnings = new Set<string>();
    const nestedCapped = buildTrustedRecursiveList({
      data: [{ name: "malformed", children: "not-an-array" }, { name: "later" }],
      childrenPath: "children",
      keyPath: "name",
      maxNodes: 2,
      warnings: nestedWarnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: (node) => (node as { name: string }).name,
    });
    expect(countTreeNodes(nestedCapped)).toBe(2);
    expect([...nestedWarnings]).toEqual(expect.arrayContaining([expect.stringContaining("RECURSIVE_LIST_NODE_LIMIT")]));

    const depthWarnings = new Set<string>();
    const depthLimited = buildTrustedRecursiveList({
      data: deepTree(8),
      childrenPath: "children",
      keyPath: "name",
      maxDepth: 2,
      warnings: depthWarnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: () => null,
    });
    expect(depthLimited[0]?.children?.[0]?.children?.[0]?.label).toBeTruthy();
    expect([...depthWarnings]).toEqual(expect.arrayContaining([expect.stringContaining("RECURSIVE_LIST_DEPTH_LIMIT")]));
  });

  test("rejects unsafe paths and invalid authored slots", () => {
    const warnings = new Set<string>();
    const invalidPath = buildTrustedRecursiveList({
      data: { name: "root" },
      childrenPath: "__proto__.children",
      keyPath: "name",
      warnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: () => null,
    });
    expect(invalidPath).toHaveLength(1);
    expect([...warnings]).toEqual(expect.arrayContaining([expect.stringContaining("RECURSIVE_LIST_INVALID_PATH")]));
    expect(
      validateCustomJsxTemplate(
        '<RecursiveList data={data.tree} childrenPath="children" keyPath="name"><Text>Unsafe</Text></RecursiveList>',
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("RECURSIVE_LIST_TEMPLATE_REQUIRED") }),
      ]),
    );
    expect(
      validateCustomJsxTemplate(
        "<RecursiveList data={data.tree} childrenPath={3} keyPath={false}>{(node) => node.name}</RecursiveList>",
      ),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("INVALID_PROP_VALUE") })]),
    );
    expect(
      validateCustomJsxTemplate(
        '<RecursiveList data={data.tree} childrenPath="children" keyPath="name" maxNodes={1.5}>{(node) => node.name}</RecursiveList>',
      ),
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("INVALID_PROP_VALUE") })]),
    );
  });

  test("uses namespaced primitive keys and stable path fallbacks", () => {
    const warnings = new Set<string>();
    const nodes = buildTrustedRecursiveList({
      data: [{ id: 1 }, { id: "1" }, { id: true }, { id: "duplicate" }, { id: "duplicate" }, {}],
      childrenPath: "children",
      keyPath: "id",
      warnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: () => null,
    });
    expect(nodes.map(({ value }) => value)).toEqual([
      "key:number:1",
      "key:string:1",
      "key:boolean:true",
      "key:string:duplicate",
      "path:4",
      "path:5",
    ]);
    expect([...warnings]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("RECURSIVE_LIST_DUPLICATE_KEY"),
        expect.stringContaining("RECURSIVE_LIST_MISSING_KEY"),
      ]),
    );
  });

  test("contains ordinary branch errors even when their text resembles a budget failure", () => {
    const warnings = new Set<string>();
    const nodes = buildTrustedRecursiveList({
      data: { name: "root" },
      childrenPath: "children",
      keyPath: "name",
      warnings,
      budget: new Budget(DEFAULT_BUDGETS),
      render: () => {
        throw new SafeJsxError("API field exceeded the operation limit yesterday");
      },
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.label).toBeTruthy();
    expect([...warnings]).toEqual(expect.arrayContaining([expect.stringContaining("RECURSIVE_LIST_BRANCH_ERROR")]));
  });

  test("diagnoses unsafe spread props and consumes unsupported bind without crashing", () => {
    const template = `<RecursiveList {...data.props} bind="tree" data={data.tree} childrenPath="children" keyPath="name">
      {(node) => <Text>{node.name}</Text>}
    </RecursiveList>`;
    const rendered = renderSafeJsx({
      template,
      components: {
        RecursiveList: TrustedRecursiveList as never,
        Text: ((props: { children?: unknown }) => createElement("span", null, props.children as never)) as never,
      },
      bindings: {
        data: {
          tree: { name: "root" },
          props: { onClick: () => undefined, href: "javascript:alert(1)" },
        },
      },
    });
    expect(rendered.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("BINDING_UNAVAILABLE"),
        expect.stringContaining("BLOCKED_CAPABILITY"),
        expect.stringContaining("INVALID_PROP_VALUE"),
      ]),
    );
  });

  test("contains a branch render error and resets it when a corrected node model arrives", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const BrokenLabel = () => {
      throw new Error("broken label");
    };
    try {
      await act(async () => {
        root.render(
          <MantineProvider>
            <TrustedRecursiveList
              nodes={[
                { value: "broken", label: <BrokenLabel /> },
                { value: "healthy", label: "Healthy sibling" },
              ]}
            />
          </MantineProvider>,
        );
      });
      expect(host.textContent).toContain("RECURSIVE_LIST_BRANCH_RENDER_ERROR");
      expect(host.textContent).toContain("Healthy sibling");

      await act(async () => {
        root.render(
          <MantineProvider>
            <TrustedRecursiveList nodes={[{ value: "recovered", label: "Recovered" }]} />
          </MantineProvider>,
        );
      });
      expect(host.textContent).toContain("Recovered");
      expect(host.textContent).not.toContain("RECURSIVE_LIST_RENDER_ERROR");
    } finally {
      await act(async () => root.unmount());
      consoleError.mockRestore();
      host.remove();
    }
  });

  test("shares the parent interpreter operation budget across every recursive callback", () => {
    const template = `<RecursiveList data={data.chain} childrenPath="children" keyPath="name" defaultExpandedDepth={16}>
      {(node) => {
        const label = node.name;
        return <Text>{label}</Text>;
      }}
    </RecursiveList>`;
    expect(() =>
      renderSafeJsx({
        template,
        components: {
          RecursiveList: TrustedRecursiveList as never,
          Text: (() => null) as never,
        },
        bindings: { data: { chain: deepTree(8) } },
        budgets: { maxOperations: 30 },
      }),
    ).toThrow("operation limit");
  });
});

function deepTree(depth: number) {
  const root: { name: string; children?: unknown[] } = { name: "level-0" };
  let current = root;
  for (let index = 1; index < depth; index += 1) {
    const child: { name: string; children?: unknown[] } = { name: `level-${index}` };
    current.children = [child];
    current = child;
  }
  return root;
}

function countTreeNodes(nodes: readonly { children?: readonly unknown[] }[]): number {
  return nodes.reduce(
    (count, node) => count + 1 + countTreeNodes((node.children ?? []) as readonly { children?: readonly unknown[] }[]),
    0,
  );
}
