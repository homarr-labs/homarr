import type { MantineSize } from "@mantine/core";

export interface SystemResourcePresentation {
  itemRadius: MantineSize;
  opacity: number;
  formatBytesPair: (used: number, total: number) => { used: string; total: string };
  formatByteRate: (bytes: number) => string;
}
