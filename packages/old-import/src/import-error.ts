import type { BoardSize, OldmarrConfig } from "@homarr/old-schema";

export class OldHomarrImportError extends Error {
  constructor(oldConfig: OldmarrConfig, cause: unknown) {
    super(`Failed to import old homarr configuration name=${oldConfig.configProperties.name}`, {
      cause,
    });
  }
}

export class OldHomarrScreenSizeError extends Error {
  constructor(type: "app" | "widget", id: string, screenSize: BoardSize) {
    super(`Screen size not found for type=${type} id=${id} screenSize=${screenSize}`);
  }
}
