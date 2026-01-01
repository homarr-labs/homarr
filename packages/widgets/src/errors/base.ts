import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@tabler/icons-react";

export abstract class ErrorBoundaryError extends Error {
  public abstract getErrorBoundaryData(): {
    icon: TablerIcon;
    message: stringOrTranslation;
    showLogsLink: boolean;
  };
}
