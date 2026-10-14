import type { CardProps } from "@mantine/core";
import type { ScopedTranslationFunction } from "@homarr/translation";

export interface TranscodingViewBindings {
  tCommon: ScopedTranslationFunction<"widget.mediaTranscoding.panel.common">;
  tQueue: ScopedTranslationFunction<"widget.mediaTranscoding.panel.queue">;
  tWorkers: ScopedTranslationFunction<"widget.mediaTranscoding.panel.workers">;
  tStatistics: ScopedTranslationFunction<"widget.mediaTranscoding.panel.statistics">;
  tHealthCheck: ScopedTranslationFunction<"widget.mediaTranscoding.healthCheck">;
  formatBytes: (bytes: number) => string;
  itemRadius: CardProps["radius"];
  colorScheme: "light" | "dark";
}
