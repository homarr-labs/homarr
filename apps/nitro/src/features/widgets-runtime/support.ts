import type { WidgetKind } from "@homarr/definitions";

export const nativeHookRendererKinds: ReadonlySet<WidgetKind> = new Set<WidgetKind>([
  "clock",
  "countdown",
  "timer",
  "iframe",
  "weather",
  "airQuality",
  "bazarr",
  "coolify",
  "paperlessNgx",
  "patchmon",
  "networkControllerSummary",
  "networkControllerStatus",
  "traefik",
  "uptimeKuma",
  "firewall",
  "wazuhAgents",
  "wazuhAlerts",
  "wazuhSummary",
  "wazuhTimeline",
  "wazuhTopList",
  "wazuhVulnerabilities",
  "wazuhFim",
  "wazuhAuthFailures",
]);

export class WidgetImportClosureError extends Error {
  constructor(readonly kind: WidgetKind) {
    super(`The ${kind} source renderer still requires native host adapters`);
    this.name = "WidgetImportClosureError";
  }
}

export function assertNativeWidgetRenderer(kind: WidgetKind) {
  if (!nativeHookRendererKinds.has(kind)) throw new WidgetImportClosureError(kind);
}
