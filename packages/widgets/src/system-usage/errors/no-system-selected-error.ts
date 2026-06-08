import { IconServerOff } from "@tabler/icons-react";

import type { TranslationFunction } from "@homarr/translation";

import { ErrorBoundaryError } from "../../errors";

export class NoSystemSelectedError extends ErrorBoundaryError {
  constructor() {
    super("No system selected");
  }

  public getErrorBoundaryData() {
    return {
      icon: IconServerOff,
      message: (t: TranslationFunction) => t("widget.systemUsage.error.noSystem"),
      showLogsLink: false,
    };
  }
}
