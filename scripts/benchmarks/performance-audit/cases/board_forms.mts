import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { benchmarkPair } from "../lib.mts";
import type { BenchmarkContext, Side } from "../lib.mts";

const boardFile = "apps/nextjs/src/components/board/selection/board-selection-context.tsx";
const modalFile = "packages/modals/src/index.tsx";
const reducerFile = "packages/modals/src/reducer.tsx";
const appFile = "packages/modals-collection/src/apps/app-select-modal.tsx";
const passwordFile = "packages/ui/src/components/password-input/password-requirements-popover.tsx";
const gridFile = "packages/ui/src/integration-select-grid/integration-select-grid.tsx";
const widgetFile = "packages/widgets/src/widget-integration-select.tsx";

// These adapters expose actual component output without charging Mantine rendering to lookup work.
const jsx = {
  Fragment: "Fragment",
  createElement(type: unknown, props: any, ...children: any[]) {
    return { type, props: { ...props, children } };
  },
};
const translate = () => (key: string, values?: any) => `${key}:${values?.name ?? values?.count ?? ""}`;
const memo = (compute: () => unknown) => compute();
const state = (value: unknown) => [value, () => {}];
const compound = (name: string, parts: string[]) =>
  Object.assign({ name }, Object.fromEntries(parts.map((part) => [part, `${name}.${part}`])));
const nodes = (tree: any, type: unknown): any[] => {
  if (!tree) return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
};
const idRows = (count: number, prefix = "id") =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));

function boardOperation(ctx: BenchmarkContext, side: Side, items: any[], selected: Set<string>, counters?: any) {
  let current: any;
  let notification: any;
  let cleared = 0;
  let trashSounds = 0;
  let hidden = 0;
  const remove = ctx.evaluate<() => void>(side, boardFile, "removeSelectedItems", {
    React: jsx,
    Button: "Button",
    Group: "Group",
    Text: "Text",
    selectedItemIds: selected,
    board: { items },
    useCallback: (callback: unknown) => callback,
    clearSelection: () => {
      cleared++;
    },
    playTrashSound: () => {
      trashSounds++;
    },
    persistBoard: (updater: any) => {
      current = updater(current);
    },
    showSuccessNotification: (value: any) => {
      notification = value;
    },
    notifications: {
      hide: () => {
        hidden++;
      },
    },
    tCommon: translate(),
    tSelection: translate(),
    Array: {
      from(value: Set<string>) {
        const output = Array.from(value);
        if (counters) {
          counters.copiedIds += output.length;
          output.includes = (id, fromIndex) => {
            counters.linearMembershipCalls++;
            return Array.prototype.includes.call(output, id, fromIndex);
          };
        }
        return output;
      },
    },
  });
  return () => {
    current = { items };
    notification = undefined;
    cleared = 0;
    trashSounds = 0;
    hidden = 0;
    remove();
    const remaining = current.items;
    if (notification) nodes(notification.message, "Button")[0].props.onClick();
    return {
      remaining,
      restored: current.items,
      message: nodes(notification?.message, "Text")[0]?.props.children,
      cleared,
      trashSounds,
      hidden,
    };
  };
}

function passwordComponent(ctx: BenchmarkContext, side: Side, counters?: any) {
  const validationFile = "packages/validation/src/user.ts";
  let requirements = ctx.evaluate<any[]>(side, validationFile, ["regexCheck", "passwordRequirements"]);
  if (counters)
    requirements = requirements.map((requirement) => ({
      ...requirement,
      check(value: string) {
        counters.checks++;
        return requirement.check(value);
      },
    }));
  const source = ctx.source(side, passwordFile);
  const declarations = ["strengthColorMap", "useRequirements", "PasswordRequirementsPopover"];
  if (source.includes("function useStrength")) declarations.push("useStrength");
  return ctx.evaluate<any>(
    side,
    passwordFile,
    declarations,
    {
      React: jsx,
      useState: state,
      Popover: compound("Popover", ["Target", "Dropdown"]),
      Progress: "Progress",
      Text: "Text",
      PasswordRequirement: "PasswordRequirement",
      passwordRequirements: requirements,
      useI18n: () => (key: string) => {
        if (counters) counters.translations++;
        return key;
      },
    },
    { returnExpression: "PasswordRequirementsPopover" },
  );
}

function gridComponent(ctx: BenchmarkContext, side: Side, kinds: any[]) {
  return ctx.evaluate<any>(side, gridFile, "IntegrationSelectGrid", {
    React: jsx,
    useMemo: memo,
    useState: state,
    useI18n: translate,
    buildSortedIntegrations: () => kinds,
    filterIntegrations: (items: any[]) => items,
    Stack: "Stack",
    Input: "Input",
    IconSearch: "IconSearch",
    ScrollArea: compound("ScrollArea", ["Autosize"]),
    SimpleGrid: "SimpleGrid",
    IntegrationCard: "IntegrationCard",
    Center: "Center",
    Text: "Text",
    selectGridCols: {},
  });
}

function widgetComponent(ctx: BenchmarkContext, side: Side, counters?: any) {
  const combobox = compound("Combobox", ["Option", "DropdownTarget", "EventsTarget", "Dropdown", "Options"]);
  const bindings: any = {
    React: jsx,
    useI18n: translate,
    Combobox: combobox,
    Group: "Group",
    CheckIcon: "CheckIcon",
    Avatar: "Avatar",
    Stack: "Stack",
    Text: "Text",
    PillsInput: compound("PillsInput", ["Field"]),
    Pill: compound("Pill", ["Group"]),
    ScrollArea: compound("ScrollArea", ["Autosize"]),
    Anchor: "Anchor",
    Link: "Link",
    IntegrationPill: "IntegrationPill",
    getIconUrl: (kind: string) => kind,
    useCombobox: () => ({
      closeDropdown: () => {
        if (counters) counters.closes++;
      },
      openDropdown() {},
      resetSelectedOption() {},
      updateSelectedOptionIndex() {},
    }),
  };
  return ctx.evaluate<any>(side, widgetFile, "WidgetIntegrationSelect", bindings);
}

function widgetOutput(component: any, data: any[], value: string[], multiple = true) {
  const changes: string[][] = [];
  const tree = component({
    data,
    value,
    label: "Integrations",
    canSelectMultiple: multiple,
    onChange: (next: string[]) => changes.push(next),
  });
  const pills = nodes(tree, "IntegrationPill");
  const options = nodes(tree, "Combobox.Option");
  const submit = tree.props.onOptionSubmit;
  submit(value[0] ?? "missing");
  submit("new-value");
  pills[0]?.props.onRemove();
  nodes(tree, "PillsInput.Field")[0].props.onKeyDown({ key: "Backspace", preventDefault() {} });
  return {
    pills: pills.map(({ props }: any) => [props.option.id, props.option.name, props.showRemoveButton]),
    options: options.map(({ props }: any) => [props.value, props.active, nodes(props.children, "CheckIcon").length]),
    changes,
  };
}

export const cases = [
  benchmarkPair({
    id: "NBL-001",
    title: "Board batch deletion uses its existing selected-ID Set",
    files: [boardFile],
    iterations: 100,
    fixture:
      "5,000 ordered board items; 1,000 selected IDs plus one stale ID. Actual callback removes, clears, notifies, and restores captured objects through Undo.",
    metricUnits: {
      copiedIds: "IDs allocated",
      linearMembershipCalls: "Array.includes calls",
      setMembershipCalls: "Set.has calls",
      removedItems: "items",
      restoredItems: "items",
    },
    prepare(ctx) {
      const items = idRows(5000);
      const selected = new Set([...items.slice(1000, 2000).map(({ id }) => id), "stale-id"]);
      const before = boardOperation(ctx, "before", items, selected);
      const after = boardOperation(ctx, "after", items, selected);
      return {
        before,
        after,
        verify(a: any, b: any) {
          assert.deepEqual(b, a);
          assert.equal(b.remaining.length, 4000);
          assert.equal(b.restored.length, 5000);
          assert.deepEqual(b.restored.slice(-1000), items.slice(1000, 2000));
          assert.deepEqual(b.message, ["removed:1001"]);
          assert.equal(selected.size, 1001);
          for (const values of [new Set<string>(), new Set(["id-0"]), new Set(["stale-id"])]) {
            assert.deepEqual(
              boardOperation(ctx, "after", items, values)(),
              boardOperation(ctx, "before", items, values)(),
            );
          }
        },
        metrics(result: any, side) {
          const counters = { copiedIds: 0, linearMembershipCalls: 0, setMembershipCalls: 0 };
          const tracked = new Set(selected);
          tracked.has = (id) => {
            counters.setMembershipCalls++;
            return Set.prototype.has.call(tracked, id);
          };
          boardOperation(ctx, side, items, tracked, counters)();
          return {
            ...counters,
            removedItems: items.length - result.remaining.length,
            restoredItems: result.restored.length,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_forms-01",
    title: "App selector merges pending local creations using server-ID membership",
    files: [appFile],
    iterations: 100,
    fixture:
      "2,000 server apps and 300 local creations (100 already returned by the server, 200 pending invalidation); server-first and local insertion order remain authoritative.",
    metricUnits: { idReads: "ID property reads", selectableApps: "apps" },
    prepare(ctx) {
      const apps = idRows(2000);
      const createdApps = [...apps.slice(0, 100), ...idRows(200, "local")];
      const load = (side: Side, server: any[], local: any[]) =>
        ctx.evaluate<() => any[]>(
          side,
          appFile,
          "selectableApps",
          { apps: server, createdApps: local, useMemo: memo },
          { returnExpression: "selectableApps", asFunction: true },
        );
      const before = load("before", apps, createdApps);
      const after = load("after", apps, createdApps);
      return {
        before,
        after,
        verify(a, b) {
          assert.deepEqual(b, a);
          assert.deepEqual(b, [...apps, ...createdApps.slice(100)]);
          for (const [server, local] of [
            [[], createdApps],
            [apps, []],
            [apps, [createdApps[100], createdApps[100]]],
          ])
            assert.deepEqual(load("after", server, local)(), load("before", server, local)());
        },
        metrics(result: any[], side) {
          let idReads = 0;
          const tracked = (rows: any[]) =>
            rows.map((row) => ({
              get id() {
                idReads++;
                return row.id;
              },
            }));
          load(side, tracked(apps), tracked(createdApps))();
          return { idReads, selectableApps: result.length };
        },
      };
    },
  }),
  benchmarkPair({
    id: "SUI-002",
    title: "Modal provider removes its unread state ref",
    files: [modalFile],
    timing: false,
    fixture:
      "Actual ModalProvider declaration with hook inventory adapters on one empty-stack render; counts useRef allocation and state-ref writes, not mounted React latency.",
    metricUnits: { refHooks: "ref hooks", refWrites: "ref writes" },
    prepare(ctx) {
      const load = (side: Side) => () => {
        let refHooks = 0;
        let refWrites = 0;
        const Provider = ctx.evaluate<any>(side, modalFile, "ModalProvider", {
          React: jsx,
          ModalContext: { Provider: "ModalContext.Provider" },
          modalReducer() {},
          ActiveModal: "ActiveModal",
          randomId: () => "id",
          useReducer: (_reducer: any, initial: any) => [initial, () => {}],
          useCallback: (callback: any) => callback,
          useMemo: memo,
          useRef: (value: any) => {
            refHooks++;
            return {
              get current() {
                return value;
              },
              set current(next) {
                refWrites++;
                value = next;
              },
            };
          },
        });
        const tree = Provider({ children: "stable-child" });
        assert.deepEqual(Object.keys(tree.props.value).toSorted(), ["closeModal", "openModalInner"]);
        return { refHooks, refWrites, children: tree.props.children };
      };
      return {
        before: load("before"),
        after: load("after"),
        verify(a: any, b: any) {
          assert.deepEqual(b.children, a.children);
          assert.equal(a.refHooks, 1);
          assert.equal(a.refWrites, 1);
          assert.equal(b.refHooks, 0);
          assert.equal(b.refWrites, 0);
        },
        metrics(result: any) {
          return { refHooks: result.refHooks, refWrites: result.refWrites };
        },
      };
    },
  }),
  benchmarkPair({
    id: "SUI-005",
    title: "Password requirement results feed both strength and rows",
    files: [passwordFile, "packages/validation/src/user.ts"],
    iterations: 1000,
    fixture:
      "Five real validation predicates rendered for empty, partial, fully strong, Unicode, and punctuation-containing passwords; Mantine is replaced by transparent JSX output adapters.",
    metricUnits: { checks: "predicate calls", translations: "label translations" },
    prepare(ctx) {
      const passwords = ["", "short", "LongEnough", "LongEnough1!", "äÖ文1[$&", "eight888"];
      const before = passwordComponent(ctx, "before");
      const after = passwordComponent(ctx, "after");
      const render = (component: any) =>
        passwords.map((password) => {
          const tree = component({ password, children: "input" });
          return {
            rows: nodes(tree, "PasswordRequirement").map(({ props }: any) => [props.label, props.meets]),
            progress: nodes(tree, "Progress").map(({ props }: any) => [props.value, props.color]),
          };
        });
      return {
        before: () => render(before),
        after: () => render(after),
        verify(a, b) {
          assert.deepEqual(b, a);
        },
        metrics(_result, side) {
          const counters = { checks: 0, translations: 0 };
          render(passwordComponent(ctx, side, counters));
          return counters;
        },
      };
    },
  }),
  benchmarkPair({
    id: "SUI-006",
    title: "Integration grid aggregates connected counts before mapping cards",
    files: [gridFile],
    iterations: 100,
    fixture:
      "60 catalog kinds and 3,000 connected instances, with duplicate kinds and a kind absent from the visible catalog. Counts follow visible card order; initial render includes map construction.",
    metricUnits: { kindReads: "kind property reads", cards: "cards" },
    prepare(ctx) {
      const kinds = Array.from({ length: 60 }, (_, index) => ({ kind: `kind-${index}`, name: `Kind ${index}` }));
      const integrationData = Array.from({ length: 3000 }, (_, index) => ({ kind: `kind-${index % 61}` }));
      const before = gridComponent(ctx, "before", kinds);
      const after = gridComponent(ctx, "after", kinds);
      const render = (component: any, data: any[] | undefined) =>
        nodes(component({ integrationData: data, onSelect() {} }), "IntegrationCard").map(({ props }: any) => [
          props.integration.kind,
          props.connectedCount,
        ]);
      return {
        before: () => render(before, integrationData),
        after: () => render(after, integrationData),
        verify(a, b) {
          assert.deepEqual(b, a);
          assert.deepEqual(render(after, undefined), render(before, undefined));
          assert.deepEqual(render(after, []), render(before, []));
        },
        metrics(result: any[], side) {
          let kindReads = 0;
          render(
            gridComponent(ctx, side, kinds),
            integrationData.map((row) => ({
              get kind() {
                kindReads++;
                return row.kind;
              },
            })),
          );
          return { kindReads, cards: result.length };
        },
      };
    },
  }),
  benchmarkPair({
    id: "WB-004",
    title: "Widget integration picker indexes options and selected membership",
    files: [widgetFile],
    iterations: 25,
    fixture:
      "1,000 options and 150 selected IDs in reverse insertion order, one missing selection, and one duplicate option ID with a different label. Actual component handlers exercise toggles, pill removal, Backspace, and single-select closing.",
    metricUnits: { idReads: "ID property reads", closes: "dropdown close calls" },
    prepare(ctx) {
      const data = idRows(1000).map((row) => ({ ...row, name: row.id, kind: "mock", url: "http://fixture.local" }));
      data.push({ ...data[800], name: "duplicate must not replace the first pill" });
      const value = [
        ...data
          .slice(800, 950)
          .map(({ id }) => id)
          .toReversed(),
        "missing",
      ];
      const before = widgetComponent(ctx, "before");
      const after = widgetComponent(ctx, "after");
      return {
        before: () => widgetOutput(before, data, value),
        after: () => widgetOutput(after, data, value),
        verify(a: any, b: any) {
          assert.deepEqual(b, a);
          assert.equal(b.pills.length, 150);
          assert.equal(b.pills.at(-1)[1], "id-800");
          assert.deepEqual(widgetOutput(after, data, ["id-800"], false), widgetOutput(before, data, ["id-800"], false));
          assert.deepEqual(widgetOutput(after, [], []), widgetOutput(before, [], []));
        },
        metrics(_result, side) {
          let idReads = 0;
          const counters = { closes: 0 };
          const tracked = data.map((row) => ({
            ...row,
            get id() {
              idReads++;
              return row.id;
            },
          }));
          const component = widgetComponent(ctx, side, counters);
          widgetOutput(component, tracked, value);
          widgetOutput(component, tracked, ["id-800"], false);
          return { idReads, closes: counters.closes };
        },
      };
    },
  }),
  benchmarkPair({
    id: "SUI-001",
    title: "Stable modal action context avoids unrelated consumer updates",
    files: [modalFile, reducerFile],
    iterations: 5,
    fixture:
      "64 mounted memoized action-hook consumers, 10 open/close cycles, actual ModalProvider/ActiveModal/reducer/useModalAction declarations, React DOM + jsdom. Mantine Modal is a transparent host wrapper; its exit timer is suppressed. Provider and active-modal renders remain measured separately.",
    metricUnits: {
      consumerRenders: "renders",
      providerRenders: "renders",
      activeModalRenders: "renders",
      commits: "React commits",
      closed: "close callbacks",
    },
    async prepare(ctx) {
      const require = createRequire(resolve(process.env.BENCH_DEPENDENCY_ROOT ?? ctx.roots.after, "package.json"));
      const React = require("react");
      const { createRoot } = require("react-dom/client");
      const { flushSync } = require("react-dom");
      const { JSDOM } = require("jsdom");
      const dom = new JSDOM("<!doctype html><html><body></body></html>");
      const saved = new Map<string, PropertyDescriptor | undefined>();
      for (const name of ["window", "document", "navigator", "HTMLElement", "Node"]) {
        saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: dom.window[name] });
      }
      const load = (side: Side) => {
        const ModalContext = React.createContext(null);
        let consumerRenders = 0;
        let providerRenders = 0;
        let activeModalRenders = 0;
        let commits = 0;
        let closed = 0;
        let actions: any;
        let lastModalProps: any;
        let allowClose = false;
        const presentations: any[] = [];
        const reducer = ctx.evaluate<any>(
          side,
          reducerFile,
          ["getModal", "modalReducer"],
          { React, useContext: React.useContext, ModalContext },
          { returnExpression: "modalReducer" },
        );
        const Modal = (props: any) => {
          lastModalProps = props;
          presentations.push([props.title, props.trapFocus]);
          return React.createElement("div", { "data-modal": props.opened }, props.children);
        };
        const ActiveModal = ctx.evaluate<any>(side, modalFile, "ActiveModal", {
          React,
          useI18n: translate,
          useState: React.useState,
          useEffect: React.useEffect,
          useCallback: React.useCallback,
          Modal,
          translateIfNecessary: (_t: any, title: any) => title,
          getDefaultZIndex: () => 200,
          getModalPresentationClassNames: () => ({}),
          presentationClasses: {},
          setTimeout: () => 0,
        });
        const Provider = ctx.evaluate<any>(side, modalFile, "ModalProvider", {
          React,
          ModalContext,
          modalReducer: reducer,
          useReducer: React.useReducer,
          useRef: React.useRef,
          useMemo: React.useMemo,
          useCallback: React.useCallback,
          randomId: () => `modal-${providerRenders}`,
          ActiveModal: (props: any) => {
            activeModalRenders++;
            return React.createElement(ActiveModal, props);
          },
        });
        const definition = {
          options: { defaultTitle: "Fixture" },
          component: ({ actions: modalActions, innerProps }: any) => {
            if (innerProps.intercept) modalActions.setCloseInterceptor(() => allowClose);
            return React.createElement("span", null, "modal-content");
          },
        };
        const useModalAction = ctx.evaluate<any>(side, modalFile, "useModalAction", {
          useContext: React.useContext,
          ModalContext,
        });
        const Consumer = React.memo(() => {
          consumerRenders++;
          actions = { ...useModalAction(definition), closeModal: React.useContext(ModalContext).closeModal };
          return null;
        });
        const ProviderProbe = (props: any) => {
          providerRenders++;
          return Provider(props);
        };
        const children = Array.from({ length: 64 }, (_, key) => React.createElement(Consumer, { key }));
        const element = React.createElement(
          React.Profiler,
          {
            id: "modal-provider",
            onRender: () => {
              commits++;
            },
          },
          React.createElement(ProviderProbe, null, children),
        );
        return (nested = false) => {
          consumerRenders = 0;
          providerRenders = 0;
          activeModalRenders = 0;
          commits = 0;
          closed = 0;
          allowClose = false;
          presentations.length = 0;
          const container = document.createElement("div");
          document.body.append(container);
          const root = createRoot(container);
          try {
            flushSync(() => root.render(element));
            if (nested) {
              flushSync(() =>
                actions.openModal(
                  {},
                  {
                    title: "first",
                    keepMounted: true,
                    onClose: () => {
                      closed++;
                    },
                  },
                ),
              );
              flushSync(() =>
                actions.openModal(
                  { intercept: true },
                  {
                    title: "second",
                    onClose: () => {
                      closed++;
                    },
                  },
                ),
              );
              assert.deepEqual(presentations.slice(-2), [
                ["first", false],
                ["second", true],
              ]);
              flushSync(() => lastModalProps.onClose());
              assert.equal(providerRenders, 3);
              assert.equal(closed, 0);
              allowClose = true;
              flushSync(() => lastModalProps.onClose());
              assert.equal(lastModalProps.title, "first");
              assert.equal(lastModalProps.trapFocus, true);
              flushSync(() => lastModalProps.onClose());
            } else {
              for (let index = 0; index < 10; index++) {
                flushSync(() =>
                  actions.openModal(
                    {},
                    {
                      onClose: () => {
                        closed++;
                      },
                    },
                  ),
                );
                assert.equal(lastModalProps.trapFocus, true);
                flushSync(() => lastModalProps.onClose());
              }
            }
            return { consumerRenders, providerRenders, activeModalRenders, commits, closed };
          } finally {
            flushSync(() => root.unmount());
            container.remove();
          }
        };
      };
      const before = load("before");
      const after = load("after");
      return {
        before,
        after,
        verify(a: any, b: any) {
          assert.equal(a.consumerRenders, 64 * 21);
          assert.equal(b.consumerRenders, 64);
          assert.equal(a.providerRenders, 21);
          assert.equal(b.providerRenders, 21);
          assert.equal(a.activeModalRenders, 10);
          assert.equal(b.activeModalRenders, 10);
          assert.equal(a.closed, 10);
          assert.equal(b.closed, 10);
          assert.equal(a.commits, b.commits);
          const nestedBefore = before(true);
          const nestedAfter = after(true);
          assert.equal(nestedAfter.closed, 2);
          assert.equal(nestedAfter.providerRenders, 5);
          assert.deepEqual({ ...nestedAfter, consumerRenders: 0 }, { ...nestedBefore, consumerRenders: 0 });
        },
        metrics(result: any) {
          return result;
        },
        async cleanup() {
          // Flush React scheduler callbacks after synchronous root unmounts before restoring the DOM globals.
          await new Promise((done) => setImmediate(done));
          await new Promise((done) => setImmediate(done));
          dom.window.close();
          for (const [name, descriptor] of saved) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete (globalThis as any)[name];
          }
        },
      };
    },
  }),
];
