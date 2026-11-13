// Throwaway proposal E: a guided feature tour on the native demo board route.
import type { DemoPrototype } from "./types";

export const variantE = {
  key: "E",
  name: "Guided feature tour",
  question: "Does a short, numbered tour help self-hosters discover the working controls and board customization?",
  description:
    "An editorial sequence: Home Assistant first, populated services next, with concise explanations alongside native widgets.",
  headerPreferences: {
    version: 4,
    visible: true,
    searchDisplay: "icon",
    logoDisplay: "logoAndText",
    tabsDisplay: "wide",
    zones: {
      left: [{ type: "builtin", id: "logo" }],
      center: [{ type: "builtin", id: "boardTabs" }],
      right: [
        { type: "builtin", id: "search" },
        { type: "builtin", id: "boardEdit" },
        { type: "builtin", id: "boardSettings" },
        { type: "builtin", id: "themeToggle" },
        { type: "builtin", id: "user" },
      ],
    },
  },
  board: {
    pageTitle: "Homarr · Guided feature tour",
    primaryColor: "teal",
    secondaryColor: "cyan",
    itemRadius: "lg",
    customCss: `
      [data-kind="notebook"] .homarr-notebook-read-mode h1 {
        font-size: calc(2.65rem * var(--board-canvas-ui-scale, 1));
        line-height: 1.08;
        letter-spacing: -0.045em;
        font-weight: 700;
        margin: calc(0.45rem * var(--board-canvas-ui-scale, 1)) 0 var(--mantine-spacing-md);
      }
      [data-kind="notebook"] .homarr-notebook-read-mode h2 {
        font-size: calc(1.65rem * var(--board-canvas-ui-scale, 1));
        line-height: 1.15;
        letter-spacing: -0.025em;
        margin: calc(0.45rem * var(--board-canvas-ui-scale, 1)) 0 calc(0.8rem * var(--board-canvas-ui-scale, 1));
      }
      [data-kind="notebook"] .homarr-notebook-read-mode h6 {
        font-size: calc(0.7rem * var(--board-canvas-ui-scale, 1));
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--mantine-color-teal-text);
        margin: 0 0 calc(0.8rem * var(--board-canvas-ui-scale, 1));
      }
      [data-kind="notebook"] .homarr-notebook-read-mode p {
        line-height: 1.55;
        margin: 0 0 var(--mantine-spacing-sm);
      }
      [data-kind="notebook"] .homarr-notebook-read-mode p:last-child { margin-bottom: 0; }
    `,
  },
  tabs: [
    {
      name: "Overview",
      explanation: "Try Home Assistant, inspect populated services, and open an app from one board.",
      widgets: [
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 0,
          width: 4,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>01 / Home Assistant</h6><h1>A home you<br>can control.</h1><p>Lights, heating, blinds and media beside your self-hosted services.</p><p><strong>Try a light toggle</strong> or open its details. Changes stay in this demo.</p>",
          },
        },
        {
          kind: "smartHome-controls",
          xOffset: 4,
          yOffset: 0,
          width: 8,
          height: 4,
          needsIntegration: true,
          options: {
            title: "Living room & kitchen",
            presentation: "controlPanel",
            blocks: ["live:__MOCK__:areas:living_room,kitchen"],
            roomDomains: ["light", "climate", "cover", "fan", "media_player"],
            controlSize: "auto",
            palette: "colorful",
            showSummary: true,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 4,
          width: 4,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>02 / Connected services</h6><h2>Useful data.<br>In the same view.</h2><p>See current media sessions beside CPU, memory and network activity.</p><p>These widgets use populated demo integrations. Their controls and detail views are the same ones used on your own board.</p>",
          },
        },
        {
          kind: "mediaServer",
          xOffset: 4,
          yOffset: 4,
          width: 4,
          height: 3,
          needsIntegration: true,
          options: { showOnlyPlaying: false, showBitrate: true, showLocation: true },
        },
        {
          kind: "systemResources",
          xOffset: 8,
          yOffset: 4,
          width: 4,
          height: 3,
          needsIntegration: true,
          options: {
            visibleCharts: ["cpu", "memory", "network"],
            resourceLayout: "horizontal",
            subresourceLayout: "grid",
            labelDisplayMode: "textWithIcon",
            hasShadow: false,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 7,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>03 / App shortcuts</h6><h2>Your services, one click away.</h2><p>App tiles open each service. Add your own URLs and icons when you build a board.</p>",
          },
        },
        {
          kind: "app",
          xOffset: 4,
          yOffset: 7,
          width: 2,
          height: 2,
          needsIntegration: false,
          options: { appId: "__APP_PLEX__", showTitle: true, layout: "column", pingEnabled: false },
        },
        {
          kind: "app",
          xOffset: 6,
          yOffset: 7,
          width: 2,
          height: 2,
          needsIntegration: false,
          options: { appId: "__APP_PROXMOX__", showTitle: true, layout: "column", pingEnabled: false },
        },
        {
          kind: "app",
          xOffset: 8,
          yOffset: 7,
          width: 2,
          height: 2,
          needsIntegration: false,
          options: { appId: "__APP_PIHOLE__", showTitle: true, layout: "column", pingEnabled: false },
        },
        {
          kind: "app",
          xOffset: 10,
          yOffset: 7,
          width: 2,
          height: 2,
          needsIntegration: false,
          options: { appId: "__APP_QBITTORRENT__", showTitle: true, layout: "column", pingEnabled: false },
        },
      ],
    },
    {
      name: "Explore",
      explanation: "Compare the entity presentation, inspect download progress, and edit the board in place.",
      widgets: [
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 0,
          width: 4,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>04 / Another perspective</h6><h1>Same home.<br>More detail.</h1><p>Room controls and sensor readings for the office, bedroom and outdoors.</p><p>Native tabs keep related views together. <strong>Overview</strong> returns to the control panel.</p>",
          },
        },
        {
          kind: "smartHome-controls",
          xOffset: 4,
          yOffset: 0,
          width: 8,
          height: 4,
          needsIntegration: true,
          options: {
            title: "Office, bedroom & outdoors",
            presentation: "entities",
            blocks: ["live:__MOCK__:areas:office,bedroom,outside"],
            roomDomains: ["light", "climate", "cover", "fan", "media_player", "sensor", "binary_sensor"],
            controlSize: "compact",
            palette: "colorful",
            showSummary: true,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 4,
          width: 4,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>05 / Follow the queue</h6><h2>Progress and<br>activity.</h2><p>See download progress, speed and state in a populated queue.</p><p>Open the widget's focus view when you need more space.</p>",
          },
        },
        {
          kind: "downloads",
          xOffset: 4,
          yOffset: 4,
          width: 8,
          height: 3,
          needsIntegration: true,
          options: {
            columns: ["name", "progress", "downSpeed", "time", "state", "actions"],
            defaultSort: "progress",
            descendingDefaultSort: true,
            limitPerIntegration: 5,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 7,
          width: 4,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>06 / Make the board yours</h6><h2>Edit in place.</h2><p>Use the header's pencil to move and resize widgets on the board. Select a widget to change its options alongside the layout.</p><p>The header is customizable too: this example centers wide tabs and keeps search, edit and theme controls together.</p>",
          },
        },
        {
          kind: "notebook",
          xOffset: 4,
          yOffset: 7,
          width: 8,
          height: 3,
          needsIntegration: false,
          options: {
            showToolbar: true,
            allowReadOnlyCheck: true,
            content:
              '<h6>Notebook / Maintenance</h6><h2>Keep the context with the controls.</h2><p>Rich text, links and checklists work inside the board. Use this note\'s pencil to edit the document.</p><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Backup retention reviewed</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Replace office air filter</p></div></li></ul>',
          },
        },
      ],
    },
  ],
} satisfies DemoPrototype;
