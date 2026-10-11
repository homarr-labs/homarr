import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

import type { BenchmarkContext, Side } from "../lib.mts";
import { benchmarkPair } from "../lib.mts";

const boardMenu = "apps/nextjs/src/components/board/items/item-menu.tsx";
const boardCss = "apps/nextjs/src/components/board/items/item-content.module.css";
const canvas = "apps/nextjs/src/components/board/layout/scaled-board-canvas.tsx";
const canvasCss = "apps/nextjs/src/components/board/layout/scaled-board-canvas.module.css";
const scale = "packages/boards/src/scale.ts";
const createForm = "apps/nextjs/src/app/[locale]/manage/integrations/new/_integration-new-form.tsx";
const errorDetails =
  "apps/nextjs/src/app/[locale]/manage/integrations/_components/test-connection/integration-test-connection-error.tsx";
const pem =
  "apps/nextjs/src/app/[locale]/manage/integrations/_components/test-connection/test-connection-certificate.tsx";
const requests = "apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-requests-editor.tsx";
const tree = "packages/custom-widgets/src/workbench/response-tree.tsx";
const english = "packages/translation/src/lang/en.json";
const notification = "packages/notifications/src/index.tsx";

type Fixture = "board" | "create" | "pem" | "requests" | "tree";

function source(ctx: BenchmarkContext, side: Side, file: string, declarations: string | string[]) {
  return ctx.extract(side, file, declarations).replace(/(^|\n)(\s*)export\s+(?:default\s+)?/gu, "$1$2");
}

function fixtureSource(ctx: BenchmarkContext, side: Side, fixture: Fixture) {
  if (fixture === "board") {
    const css = ctx.source(side, boardCss).replace(/:global\(([^)]+)\)/gu, "$1");
    const canvasStyles = ctx
      .source(side, canvasCss)
      .replace(/\.viewport\b/gu, ".boardViewport")
      .replace(/\.sizer\b/gu, ".boardSizer")
      .replace(/\.canvas\b/gu, ".boardCanvas");
    return `
const itemContentClasses = { settingsButton: 'settingsButton' };
const classes = { viewport: 'boardViewport', sizer: 'boardSizer', canvas: 'boardCanvas' };
const useEditMode = () => [true];
const useModalAction = () => ({openModal() { window.editOpened = true; }});
const useOpenItemMoveModal = () => () => {};
const useItemActions = () => ({updateItemOptions() {},updateItemAdvancedOptions() {},updateItemIntegrations() {},duplicateItem() {},removeItem() {}});
const useSectionContext = () => ({integrations: [], section: {id:'section'}});
const useSettings = () => ({});
const getWidgetName = () => 'Clock';
const LazyWidgetEditModal = {};
const preloadWidgetEditModal = () => {};
const InlineConfirmMenuItem = ({onConfirm,confirmLabel,...props}) => <Menu.Item onClick={onConfirm} {...props} />;
${source(ctx, side, scale, "calculateBoardUiScale")}
${source(ctx, side, canvas, ["BoardCanvasScaleContext", "calculateBoardCanvasScale", "ScaledBoardCanvas"])}
${source(ctx, side, boardMenu, "BoardItemMenuInner")}
const item = {id:'clock',kind:'clock',options:{},advancedOptions:{title:'Kitchen clock'},integrationIds:[]};
function Fixture() {
 return <ScaledBoardCanvas logicalWidth={window.fixtureOptions.logicalWidth || 390} initialLogicalHeight={600} initialAvailableWidth={window.fixtureOptions.viewportWidth || 390} label="Fixture board">
  <div data-type="item" style={{position:'relative',width:window.fixtureOptions.itemWidth || 260,height:window.fixtureOptions.itemHeight || 180,border:'1px solid gray'}}>
   <span>Kitchen clock content</span>
   <BoardItemMenuInner item={item} definition={{}} previewDimensions={{width:260,height:180}} />
  </div>
 </ScaledBoardCanvas>;
}
window.fixtureCss = ${JSON.stringify(`${canvasStyles}\n${css}`)};`;
  }
  if (fixture === "create") {
    return `
const formSchema = {superRefine() {return this}};
const getAllSecretKindOptions = () => [[]];
const getOptionalSecretKinds = () => [];
const getIntegrationDefaultUrl = () => 'http://localhost';
const getIntegrationName = () => 'Fixture integration';
const getIconUrl = () => '';
const invariantTechnicalLabels = {url:'URL'};
const integrationDefs = {fixture:{category:['other']}};
const useZodForm = (_schema, {initialValues}) => ({values:initialValues,getInputProps(name) {return {value:initialValues[name] ?? '',onChange() {}}},onSubmit(callback) {return (event) => {event.preventDefault();callback(initialValues)}}});
const clientApi = {useUtils:() => ({integration:{invalidate:async () => {}}}), integration:{create:{useMutation:() => ({isPending:false,mutateAsync:async (_input,callbacks) => callbacks.onSuccess({error:{type:'statusCode',name:'ConnectionError',message:'Fixture connection failed',metadata:[],data:{reason:'other',statusCode:401,url:'http://localhost'}}})})}}};
const revalidatePathActionAsync = async () => {};
const AppForm = () => null;
const ApiKeySettingsLink = () => null;
const IntegrationSecretInput = () => null;
const SecretKindsSegmentedControl = () => null;
const CertificateErrorDetails = () => null;
const getMantineColor = () => 'red';
const Link = ({href,children,...props}) => <a href={href} {...props}>{children}</a>;
${source(ctx, side, notification, ["showSuccessNotification", "showErrorNotification"])}
${source(ctx, side, errorDetails, ["IntegrationTestConnectionError", "toCauseArray"])}
${source(ctx, side, createForm, "NewIntegrationForm")}
function Fixture() {return <><NewIntegrationForm kind="fixture" onSuccess={() => {}} /><Notifications /></>};`;
  }
  if (fixture === "pem") {
    return `
const createModal = (component) => ({withOptions:() => component});
const getMantineColor = () => 'green';
${source(ctx, side, pem, "PemContentModal")}
function Fixture() {return <PemContentModal actions={{closeModal() {}}} innerProps={{content:'-----BEGIN CERTIFICATE-----\\nfixture\\n-----END CERTIFICATE-----'}} />};`;
  }
  if (fixture === "requests") {
    return `
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const parseJson = (text) => JSON.parse(text);
const methods = ['GET','POST','PUT','PATCH','DELETE'];
const QueryValuesEditor = () => null;
const RequestBodyEditor = () => null;
const CustomWidgetIdentifierInput = ({onCommit,...props}) => <TextInput {...props} onChange={() => {}} />;
const LazyOnceAccordion = () => null;
${source(ctx, side, requests, "CustomWidgetRequestsEditor")}
function Fixture() {
 const [requestJson, setRequests] = useState(JSON.stringify({alpha:{path:'/alpha'},beta:{path:'/beta'},gamma:{path:'/gamma'}}));
 const form = {values:{requests:requestJson,sources:'{}',options:'{}'},errors:{},setFieldValue:(_name,value) => {window.requestJson = value;setRequests(value)}};
 return <CustomWidgetRequestsEditor form={form} onRename={() => {}} />;
}`;
  }
  return `
${source(ctx, side, tree, ["ResponseTree", "ResponseTreeNode", "createResponseTreeNode", "appendDataPath", "formatValue"])}
function Fixture() {return <ResponseTree value={{alpha:{name:'A'},beta:{name:'B'},items:[{name:'C'}]}} labels={{copyPath:'Copy path',pathCopied:'Path copied',insertPath:'Insert data path'}} onInsertDataPath={(path) => {window.insertedPath = path}} />};`;
}

async function browserPair(ctx: BenchmarkContext, fixture: Fixture, inspect: (page: any) => Promise<any>) {
  const require = createRequire(
    pathToFileURL(join(process.env.BENCH_DEPENDENCY_ROOT ?? ctx.roots.after, "package.json")),
  );
  const { build } = require("esbuild");
  const { chromium } = require("@playwright/test");
  const styles = require.resolve("@mantine/core/styles.css");
  const { readFileSync } = await import("node:fs");
  const bundles: Record<string, string> = {};
  for (const side of ["before", "after"] as const) {
    const entry = `
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createTranslator } from 'next-intl';
import { useElementSize } from '@mantine/hooks';
import { ActionIcon, Accordion, Alert, Anchor, Button, Card, Checkbox, Code, Collapse, CopyButton, Fieldset, Group, Loader, MantineProvider, Menu, SegmentedControl, Select, SimpleGrid, Stack, Switch, Text, TextInput, Tree, getTreeExpandedState, useTree, Box } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowUp, IconCheck, IconChevronDown, IconChevronRight, IconCopy, IconDotsVertical, IconExternalLink, IconInfoCircle, IconKey, IconLayoutKanban, IconPencil, IconPlus, IconSubtask, IconTrash, IconX } from '@tabler/icons-react';
const { createContext, useContext, useEffect, useMemo, useRef, useState, startTransition } = React;
const messages = ${ctx.source(side, english)};
const useI18n = (namespace) => createTranslator({locale:'en',messages,namespace});
const useSession = () => ({data:{user:{permissions:['admin']}}});
window.fixtureOptions = {};
${fixtureSource(ctx, side, fixture)}
let root;
window.mountFixture = async (options = {}) => {
 window.fixtureOptions = options;
 if (root) root.unmount();
 document.querySelector('#root').innerHTML = '';
 root = createRoot(document.querySelector('#root'));
 root.render(<MantineProvider><Fixture /></MantineProvider>);
 if (window.fixtureCss) document.querySelector('#fixture-css').textContent = window.fixtureCss;
};
`;
    const result = await build({
      stdin: { contents: entry, loader: "tsx", resolveDir: ctx.roots.after },
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "chrome120",
      write: false,
      logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    bundles[`/${side}.js`] = result.outputFiles[0].text;
  }
  const server = createServer((request, response) => {
    if (request.url === "/styles.css") {
      response.setHeader("Content-Type", "text/css");
      response.end(readFileSync(styles));
      return;
    }
    if (bundles[request.url ?? ""]) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(bundles[request.url ?? ""]);
      return;
    }
    const side = request.url?.includes("after") ? "after" : "before";
    response.end(
      `<!doctype html><link rel="stylesheet" href="/styles.css"><style id="fixture-css"></style><div id="root"></div><script src="/${side}.js"></script>`,
    );
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
    viewport: { width: 390, height: 844 },
  });
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  for (const [index, side] of (["before", "after"] as const).entries()) {
    const errors: string[] = [];
    pages[index].on("pageerror", (error: Error) => errors.push(error.message));
    await pages[index].goto(`${origin}/${side}`);
    await pages[index].waitForFunction(() => typeof (window as any).mountFixture === "function");
    (pages[index] as any).fixtureErrors = errors;
  }
  const run = async (index: number) => {
    const result = await inspect(pages[index]);
    assert.deepEqual((pages[index] as any).fixtureErrors, [], "mounted source fixture emitted browser errors");
    return result;
  };
  return {
    before: () => run(0),
    after: () => run(1),
    cleanup: async () => {
      await context.close();
      await browser.close();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

const proof: Record<string, unknown> = {};
function saveProof(id: string, before: unknown, after: unknown) {
  proof[id] = { before, after };
  writeFileSync("/tmp/homarr-performance-work/accessibility-rendered.json", JSON.stringify(proof, null, 2));
}
const mount = async (page: any, options = {}) => {
  await page.evaluate((value: unknown) => (window as any).mountFixture(value), options);
  await page.locator("#root button").first().waitFor();
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
};
const names = (page: any, selector: string) =>
  page
    .locator(selector)
    .evaluateAll((buttons: HTMLElement[]) =>
      buttons.map((button) => button.getAttribute("aria-label") ?? button.textContent?.trim() ?? ""),
    );

export const cases = [
  benchmarkPair({
    id: "MEGA-mega_design_board-01",
    title: "Mobile board settings target size",
    timing: false,
    async: true,
    files: [boardMenu, boardCss, canvas, canvasCss, scale, english],
    fixture:
      "Mounted actual settings menu and ScaledBoardCanvas with Mantine 9.6 CSS; 390px viewport at canvas scale 1, 0.5 and 0.25, constrained 128px logical item; desktop 1024px. Geometry is a usability metric, not a WCAG failure claim.",
    metricUnits: {
      mobileTargetMinWidthPx: "CSS pixels",
      mobileTargetMinHeightPx: "CSS pixels",
      constrainedTargetWidthPx: "CSS pixels",
      desktopTargetWidthPx: "CSS pixels",
      withinWidgetBounds: "boolean",
      keyboardMenuOpen: "boolean",
    },
    async prepare(ctx) {
      const pair = await browserPair(ctx, "board", async (page) => {
        const samples = [];
        for (const logicalWidth of [390, 780, 1560]) {
          await mount(page, { logicalWidth });
          const target = page.locator("[data-board-widget-settings]");
          const box = await target.boundingBox();
          const widget = await page.locator('[data-type="item"]').boundingBox();
          samples.push({ scale: 390 / logicalWidth, box, widget, name: await target.getAttribute("aria-label") });
        }
        await mount(page, { logicalWidth: 1560, itemWidth: 128, itemHeight: 128 });
        const constrained = await page.locator("[data-board-widget-settings]").boundingBox();
        const constrainedWidget = await page.locator('[data-type="item"]').boundingBox();
        await page.setViewportSize({ width: 1024, height: 768 });
        await mount(page, { logicalWidth: 1024, viewportWidth: 1024 });
        const desktop = await page.locator("[data-board-widget-settings]").boundingBox();
        await page.locator("[data-board-widget-settings]").focus();
        await page.keyboard.press("Enter");
        await page.getByRole("menu").waitFor({ state: "visible" });
        const keyboardMenuOpen = await page.getByRole("menu").isVisible();
        const aria = await page.locator("#root").ariaSnapshot();
        return { samples, constrained, constrainedWidget, desktop, keyboardMenuOpen, aria };
      });
      return {
        ...pair,
        verify(before: any, after: any) {
          saveProof("MEGA-mega_design_board-01", before, after);
          assert.equal(after.keyboardMenuOpen, true);
          assert.equal(before.keyboardMenuOpen, true);
          assert.equal(after.desktop.width, before.desktop.width);
          for (const sample of after.samples) {
            assert(sample.box.width >= 43.5);
            assert(sample.box.height > 23.5);
            assert(sample.box.y + sample.box.height <= sample.widget.y + sample.widget.height + 0.5);
            assert.equal(sample.name, "Settings for Kitchen clock");
          }
          assert(after.constrained.width >= before.constrained.width);
          assert(after.constrained.x >= after.constrainedWidget.x - 0.5);
          assert(after.constrained.y >= after.constrainedWidget.y - 0.5);
          saveProof("MEGA-mega_design_board-01", before, after);
        },
        metrics(result: any) {
          return {
            mobileTargetMinWidthPx: Math.min(...result.samples.map((sample: any) => sample.box.width)),
            mobileTargetMinHeightPx: Math.min(...result.samples.map((sample: any) => sample.box.height)),
            constrainedTargetWidthPx: result.constrained.width,
            desktopTargetWidthPx: result.desktop.width,
            withinWidgetBounds: Number(
              result.constrained.x >= result.constrainedWidget.x - 0.5 &&
                result.constrained.y >= result.constrainedWidget.y - 0.5,
            ),
            keyboardMenuOpen: Number(result.keyboardMenuOpen),
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_design_manage-01",
    title: "Focus detailed create-integration diagnostics",
    timing: false,
    async: true,
    files: [createForm, errorDetails, notification, english],
    fixture:
      "Actual NewIntegrationForm and diagnostic component mounted with mapped 401 mutation fixture, real Mantine notification. External API/form dependencies are explicit fixture bindings. Browser focus/roles are verified; screen-reader speech is unverified.",
    metricUnits: {
      detailedErrorFocused: "boolean",
      namedDiagnosticRegions: "count",
      genericNotifications: "count",
      inlineAlerts: "count",
    },
    async prepare(ctx) {
      const pair = await browserPair(ctx, "create", async (page) => {
        await mount(page);
        await page.getByRole("button", { name: "Test connection and create", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByText("Response error", { exact: true }).waitFor();
        await page.evaluate(
          () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
        );
        return {
          focused: await page.locator("#root").evaluate((root: HTMLElement) => {
            const active = document.activeElement;
            return (
              !!active &&
              root.contains(active) &&
              active.tagName === "SECTION" &&
              active.getAttribute("tabindex") === "-1"
            );
          }),
          groups: await page.getByRole("region", { name: "Response error", exact: true }).count(),
          notifications: await page.locator(".mantine-Notification-root").count(),
          inlineAlerts: await page.locator('form [role="alert"]').count(),
          active: await page.evaluate(() => ({
            role: document.activeElement?.getAttribute("role"),
            name: document.activeElement?.getAttribute("aria-label"),
          })),
          aria: await page.locator("#root").ariaSnapshot(),
        };
      });
      return {
        ...pair,
        verify(before: any, after: any) {
          assert.equal(before.focused, false);
          assert.equal(after.focused, true);
          assert.equal(after.groups, 1);
          assert.equal(before.notifications, 1);
          assert.equal(after.notifications, 1);
          assert.equal(after.inlineAlerts, before.inlineAlerts);
          saveProof("MEGA-mega_design_manage-01", before, after);
        },
        metrics(result: any) {
          return {
            detailedErrorFocused: Number(result.focused),
            namedDiagnosticRegions: result.groups,
            genericNotifications: result.notifications,
            inlineAlerts: result.inlineAlerts,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_design_manage-02",
    title: "Name PEM certificate copy and copied states",
    timing: false,
    async: true,
    files: [pem, english],
    fixture:
      "Actual PemContentModal component mounted through an explicit createModal host binding, real Mantine CopyButton and browser clipboard; keyboard Enter copy.",
    metricUnits: { namedCopyButtons: "count", namedCopiedButtons: "count", clipboardMatches: "boolean" },
    async prepare(ctx) {
      const pair = await browserPair(ctx, "pem", async (page) => {
        await mount(page);
        const target = page.locator(".mantine-ActionIcon-root");
        const beforeName = await target.getAttribute("aria-label");
        await target.focus();
        await page.keyboard.press("Enter");
        await page.locator(".tabler-icon-check").waitFor();
        const afterName = await target.getAttribute("aria-label");
        const clipboard = await page.evaluate(() => navigator.clipboard.readText());
        return {
          beforeName,
          afterName,
          clipboardMatches: clipboard === "-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----",
          aria: await page.locator("#root").ariaSnapshot(),
        };
      });
      return {
        ...pair,
        verify(before: any, after: any) {
          assert.equal(before.beforeName, null);
          assert.equal(after.beforeName, "Copy: PEM Certificate");
          assert.equal(after.afterName, "Copied: PEM Certificate");
          assert(before.clipboardMatches);
          assert(after.clipboardMatches);
          saveProof("MEGA-mega_design_manage-02", before, after);
        },
        metrics(result: any) {
          return {
            namedCopyButtons: Number(!!result.beforeName),
            namedCopiedButtons: Number(!!result.afterName),
            clipboardMatches: Number(result.clipboardMatches),
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_design_workbench-01",
    title: "Identify request reorder actions",
    timing: false,
    async: true,
    files: [requests, english],
    fixture:
      "Actual three-request editor mounted with explicit form/value-editor fixture bindings; preserved fieldset legends, first/last disabled state and keyboard Enter reordering.",
    metricUnits: {
      uniqueActionNames: "count",
      reorderButtons: "count",
      fieldsetContexts: "count",
      disabledBoundaryActions: "count",
      keyboardReorderWorks: "boolean",
    },
    async prepare(ctx) {
      const pair = await browserPair(ctx, "requests", async (page) => {
        await mount(page);
        const actionNames = await names(page, "fieldset .mantine-ActionIcon-root");
        const legends = await page.locator("fieldset legend").allTextContents();
        const disabled = await page.locator("fieldset .mantine-ActionIcon-root:disabled").count();
        await page.locator("fieldset").nth(1).locator(".mantine-ActionIcon-root").first().focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => !!(window as any).requestJson);
        const order = await page.evaluate(() => Object.keys(JSON.parse((window as any).requestJson)));
        return { actionNames, legends, disabled, order, aria: await page.locator("#root").ariaSnapshot() };
      });
      return {
        ...pair,
        verify(before: any, after: any) {
          assert.equal(new Set(before.actionNames).size, 2);
          assert.equal(new Set(after.actionNames).size, 6);
          assert.deepEqual(after.legends, before.legends);
          assert.equal(after.disabled, 2);
          assert.deepEqual(before.order, ["beta", "alpha", "gamma"]);
          assert.deepEqual(after.order, before.order);
          saveProof("MEGA-mega_design_workbench-01", before, after);
        },
        metrics(result: any) {
          return {
            uniqueActionNames: new Set(result.actionNames).size,
            reorderButtons: result.actionNames.length,
            fieldsetContexts: result.legends.length,
            disabledBoundaryActions: result.disabled,
            keyboardReorderWorks: Number(result.order.join(",") === "beta,alpha,gamma"),
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MEGA-mega_design_workbench-02",
    title: "Identify response-tree copy and insert actions",
    timing: false,
    async: true,
    files: [tree],
    fixture:
      "Actual ResponseTree mounted with nested repeated name fields and array data; real Mantine Tree/CopyButton. Mouse paths and keyboard Space/Enter are verified independently from tree-row navigation.",
    metricUnits: {
      uniqueActionNames: "count",
      visibleActions: "count",
      treeItems: "count",
      clipboardMatches: "boolean",
      insertMatches: "boolean",
      keyboardCopyWorks: "boolean",
      actionArrowNavigationWorks: "boolean",
      treeKeyboardExpansionWorks: "boolean",
    },
    async prepare(ctx) {
      const pair = await browserPair(ctx, "tree", async (page) => {
        await mount(page);
        await page.locator('[role="treeitem"][data-value="data.alpha"] > .response-tree-row').click();
        await page.locator('[role="treeitem"][data-value="data.beta"] > .response-tree-row').click();
        const actionNames = await names(page, ".response-tree-actions button");
        const treeItems = await page.getByRole("treeitem").count();
        const alpha = page.locator(
          '[role="treeitem"][data-value="data.alpha.name"] > .response-tree-row .response-tree-actions button',
        );
        await alpha.first().click();
        const clipboardMatches = await page
          .evaluate(() => navigator.clipboard.readText())
          .then((value: string) => value === "data.alpha.name");
        await alpha.nth(1).focus();
        await page.keyboard.press("Enter");
        const insertMatches = await page.evaluate(() => (window as any).insertedPath === "data.alpha.name");
        const rootButtons = page.locator(
          '[role="treeitem"][data-value="data"] > .response-tree-row .response-tree-actions button',
        );
        await page.evaluate(() => navigator.clipboard.writeText("sentinel"));
        await rootButtons.first().focus();
        await page.keyboard.press("Space");
        await page.waitForTimeout(50);
        const keyboardCopyWorks = await page
          .evaluate(() => navigator.clipboard.readText())
          .then((value: string) => value === "data");
        const rootItem = page.locator('[role="treeitem"][data-value="data"]');
        await rootItem.focus();
        await page.keyboard.press("ArrowRight");
        await rootButtons.first().focus();
        await page.keyboard.press("ArrowLeft");
        const collapsed = await page.locator('[role="treeitem"][data-value="data.alpha"]').isVisible();
        await rootItem.focus();
        await page.keyboard.press("ArrowRight");
        const expanded = await page.locator('[role="treeitem"][data-value="data.alpha"]').isVisible();
        return {
          actionNames,
          treeItems,
          clipboardMatches,
          insertMatches,
          keyboardCopyWorks,
          actionArrowNavigationWorks: !collapsed,
          treeKeyboardExpansionWorks: !collapsed && expanded,
          aria: await page.locator("#root").ariaSnapshot(),
        };
      });
      return {
        ...pair,
        verify(before: any, after: any) {
          assert.equal(new Set(before.actionNames).size, 2);
          assert.equal(new Set(after.actionNames).size, after.actionNames.length);
          assert.equal(after.treeItems, before.treeItems);
          assert(before.clipboardMatches && after.clipboardMatches);
          assert(before.insertMatches && after.insertMatches);
          assert.equal(after.keyboardCopyWorks, true);
          assert(before.actionArrowNavigationWorks && after.actionArrowNavigationWorks);
          assert.equal(after.treeKeyboardExpansionWorks, true);
          saveProof("MEGA-mega_design_workbench-02", before, after);
        },
        metrics(result: any) {
          return {
            uniqueActionNames: new Set(result.actionNames).size,
            visibleActions: result.actionNames.length,
            treeItems: result.treeItems,
            clipboardMatches: Number(result.clipboardMatches),
            insertMatches: Number(result.insertMatches),
            keyboardCopyWorks: Number(result.keyboardCopyWorks),
            actionArrowNavigationWorks: Number(result.actionArrowNavigationWorks),
            treeKeyboardExpansionWorks: Number(result.treeKeyboardExpansionWorks),
          };
        },
      };
    },
  }),
];
