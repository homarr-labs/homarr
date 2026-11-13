// Throwaway proposal E, iteration 2 — UNSCORED. Original judgments are unchanged.
import type { DemoPrototype } from "./types";

export const variantE = {
  key: "E",
  iteration: 2,
  name: "Guided feature tour",
  question:
    "Can a short guided tour reveal useful home controls and connected services without slowing down everyday use?",
  description:
    "Iteration 2 · UNSCORED. A neutral feature tour with populated room controls, Beszel monitoring and concise notes.",
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
    pageTitle: "Homarr · Feature tour",
    primaryColor: "#6BA7A0",
    secondaryColor: "#6BA7A0",
    itemRadius: "lg",
    customCss: `
      [data-kind="notebook"] .homarr-notebook-read-mode h2 {
        font-size: calc(1.6rem * var(--board-canvas-ui-scale, 1));
        line-height: 1.2;
        letter-spacing: -0.025em;
        margin: 0 0 var(--mantine-spacing-sm);
      }
      [data-kind="notebook"] .homarr-notebook-read-mode h6 {
        font-size: calc(0.7rem * var(--board-canvas-ui-scale, 1));
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mantine-primary-color-filled);
        margin: 0 0 var(--mantine-spacing-sm);
      }
      [data-kind="notebook"] .homarr-notebook-read-mode p {
        line-height: 1.5;
        margin: 0 0 var(--mantine-spacing-sm);
      }
      [data-kind="notebook"] .homarr-notebook-read-mode p:last-child { margin-bottom: 0; }
    `,
  },
  tabs: [
    {
      name: "Overview",
      explanation: "Try useful home controls, then inspect media sessions and Beszel host data.",
      widgets: [
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 0,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>01 / Home Assistant</h6><h2>Home controls.</h2><p>Living room controls, then kitchen controls and sensors. Toggle a light or open its details; changes stay in this demo.</p>",
          },
        },
        {
          kind: "smartHome-controls",
          xOffset: 4,
          yOffset: 0,
          width: 8,
          height: 3,
          needsIntegration: true,
          options: {
            title: "Living room & kitchen",
            presentation: "controlPanel",
            blocks: [
              "live:__MOCK__:entity:light.living_room_ceiling",
              "live:__MOCK__:entity:climate.living_room",
              "live:__MOCK__:entity:cover.living_room_blinds",
              "live:__MOCK__:entity:media_player.living_room_tv",
              "live:__MOCK__:entity:light.kitchen_counter",
              "live:__MOCK__:entity:switch.coffee_machine",
              "live:__MOCK__:entity:sensor.kitchen_temperature",
              "live:__MOCK__:entity:sensor.kitchen_humidity",
            ],
            roomDomains: ["light", "climate", "cover", "media_player", "switch", "sensor"],
            controlSize: "auto",
            palette: "boring",
            showSummary: false,
          },
        },
        {
          kind: "app",
          xOffset: 0,
          yOffset: 2,
          width: 2,
          height: 1,
          needsIntegration: false,
          options: { appId: "__APP_PLEX__", showTitle: true, layout: "row", pingEnabled: false },
        },
        {
          kind: "app",
          xOffset: 2,
          yOffset: 2,
          width: 2,
          height: 1,
          needsIntegration: false,
          options: { appId: "__APP_PROXMOX__", showTitle: true, layout: "row", pingEnabled: false },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 3,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>02 / Connected services</h6><h2>Sessions and systems.</h2><p>Current media sessions beside Beszel host metrics. Open a host for its detailed history; app tiles link to your services.</p>",
          },
        },
        {
          kind: "mediaServer",
          xOffset: 4,
          yOffset: 3,
          width: 4,
          height: 3,
          needsIntegration: true,
          options: { showOnlyPlaying: false, showBitrate: true, showLocation: true },
        },
        {
          kind: "beszelSystemGrid",
          xOffset: 8,
          yOffset: 3,
          width: 4,
          height: 3,
          needsIntegration: true,
          options: {
            statusFilter: "up",
            fahrenheit: false,
            showCpu: true,
            showMemory: true,
            showDisk: false,
            showGpu: false,
            showLoadAvg: false,
            showNet: true,
            showTemp: false,
            showBattery: false,
            showServices: false,
            showUptime: false,
            showAgent: false,
          },
        },
        {
          kind: "app",
          xOffset: 0,
          yOffset: 5,
          width: 2,
          height: 1,
          needsIntegration: false,
          options: { appId: "__APP_PIHOLE__", showTitle: true, layout: "row", pingEnabled: false },
        },
        {
          kind: "app",
          xOffset: 2,
          yOffset: 5,
          width: 2,
          height: 1,
          needsIntegration: false,
          options: { appId: "__APP_QBITTORRENT__", showTitle: true, layout: "row", pingEnabled: false },
        },
      ],
    },
    {
      name: "Explore",
      explanation: "Compare the entity view, inspect download progress, and customize the board in place.",
      widgets: [
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 0,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>03 / More rooms</h6><h2>Controls and readings.</h2><p>Office and bedroom controls with indoor and outdoor sensor history. Native tabs keep these related views on one board.</p>",
          },
        },
        {
          kind: "smartHome-controls",
          xOffset: 4,
          yOffset: 0,
          width: 8,
          height: 3,
          needsIntegration: true,
          options: {
            title: "Office, bedroom & outdoors",
            presentation: "entities",
            blocks: ["live:__MOCK__:areas:office,bedroom,outside"],
            roomDomains: ["light", "climate", "cover", "fan", "media_player", "sensor", "binary_sensor"],
            controlSize: "compact",
            palette: "boring",
            showSummary: true,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 3,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>04 / Downloads</h6><h2>Queue status.</h2><p>Progress, speed and state from a populated queue. Open the widget's focus view when you need more space.</p>",
          },
        },
        {
          kind: "downloads",
          xOffset: 4,
          yOffset: 3,
          width: 8,
          height: 3,
          needsIntegration: true,
          options: {
            columns: ["name", "progress", "downSpeed", "time", "state"],
            defaultSort: "progress",
            descendingDefaultSort: true,
            limitPerIntegration: 5,
          },
        },
        {
          kind: "notebook",
          xOffset: 0,
          yOffset: 6,
          width: 4,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: false,
            allowReadOnlyCheck: false,
            content:
              "<h6>05 / Customize</h6><h2>Edit in place.</h2><p>The header's pencil opens layout editing. Select a widget for its options, or edit the note beside this one.</p>",
          },
        },
        {
          kind: "notebook",
          xOffset: 4,
          yOffset: 6,
          width: 8,
          height: 2,
          needsIntegration: false,
          options: {
            showToolbar: true,
            allowReadOnlyCheck: true,
            content:
              '<h6>Notebook / Maintenance</h6><h2>Keep context nearby.</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Backup retention reviewed</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Replace office air filter</p></div></li></ul>',
          },
        },
      ],
    },
  ],
} satisfies DemoPrototype;
