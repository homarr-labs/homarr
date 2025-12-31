import type { TranslationFunction } from "@homarr/translation";
import { IconDatabaseOff } from "@tabler/icons-react";

import { ErrorBoundaryError } from "./base";

export class NoIntegrationDataError extends ErrorBoundaryError {
  constructor() {
    super("No integration data available");
  }

  public getErrorBoundaryData() {
    return {
      icon: IconDatabaseOff,
      message: (t: TranslationFunction) => t("widget.common.error.noData"),
      showLogsLink: false,
    };
  }
}
