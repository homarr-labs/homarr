import type { System } from "./system-usage-types";

export interface SystemUsageCapability {
  getSystemsAsync(): Promise<Pick<System, "id" | "name">[]>;
  getSystemDetailsAsync(id: System["id"]): Promise<System>;
}
