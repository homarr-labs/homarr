import type { OldmarrConfig } from "@homarr/old-schema";

import type { OldmarrImportConfiguration } from "./settings";

export class OldHomarrImportError extends Error {
  constructor(oldConfig: OldmarrConfig, cause: unknown) {
    super(`Failed to import old homarr configuration name=${oldConfig.configProperties.name}`, {
      cause,
    });
  }
}

export class OldHomarrScreenSizeError extends Error {
  constructor(type: "app" | "widget", id: string, screenSize: OldmarrImportConfiguration["screenSize"]) {
    super(`Screen size not found for type=${type} id=${id} screenSize=${screenSize}`);
  }
}
