import type { OldmarrConfig } from "../config";

export class OldHomarrImportError extends Error {
  constructor(oldConfig: OldmarrConfig, cause: unknown) {
    super(`Failed to import old homarr configuration name=${oldConfig.configProperties.name}`, {
      cause,
    });
  }
}
