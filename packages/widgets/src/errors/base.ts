import type { TablerIcon } from "@tabler/icons-react";

import type { stringOrTranslation } from "@homarr/translation";

export abstract class ErrorBoundaryError extends Error {
  public abstract getErrorBoundaryData(): {
    icon: TablerIcon;
    message: stringOrTranslation;
    showLogsLink: boolean;
  };
}
