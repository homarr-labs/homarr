import type { DnsHoleControls } from "./dns-hole-controls-types";

export interface DnsHoleControlsIntegration {
  getControlsAsync(): Promise<DnsHoleControls>;
}
