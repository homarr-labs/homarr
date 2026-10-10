import type { Application } from "../contracts/contribution";
import type { RenderAssets } from "../contracts/render";
import { composeApplication } from "./compose";

let application: Application | undefined;
let disposal: Promise<void> | undefined;

export function fetchApplication(request: Request, assets: RenderAssets): Promise<Response> {
  if (disposal) return Promise.resolve(new Response("Service unavailable", { status: 503 }));
  application ??= composeApplication(assets);
  return application.fetch(request);
}

export function closeApplication(): Promise<void> {
  disposal ??= application?.dispose() ?? Promise.resolve();
  return disposal;
}
