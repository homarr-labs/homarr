import { Integration } from "../base/integration";

export abstract class MediaOrganizerIntegration extends Integration {
  /**
   * Priority list that determines the quality of images using their order.
   * Types at the start of the list are better than those at the end.
   * We do this to attempt to find the best quality image for the show.
   */
  protected readonly priorities: string[] = [
    "cover", // Official, perfect aspect ratio
    "poster", // Official, perfect aspect ratio
    "banner", // Official, bad aspect ratio
    "fanart", // Unofficial, possibly bad quality
    "screenshot", // Bad aspect ratio, possibly bad quality
    "clearlogo", // Without background, bad aspect ratio
  ];
}
