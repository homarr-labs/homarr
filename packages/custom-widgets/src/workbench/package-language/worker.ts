import { createPackageLanguageService } from "./service";
import type { PackageLanguageLibraries, PackageLanguageMessage, PackageLanguageResponse } from "./types";

const scope = globalThis as unknown as {
  postMessage(message: PackageLanguageResponse, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<PackageLanguageMessage>) => void): void;
};
const ready = fetch(new URL("./types.json", import.meta.url)).then(async (response) => {
  if (!response.ok) throw new Error(`Unable to load installed editor types (${response.status})`);
  const libraries = (await response.json()) as PackageLanguageLibraries;
  return createPackageLanguageService(libraries);
});
let revision = 0;
void ready.catch(() => undefined);
scope.addEventListener("message", async (event) => {
  const message = event.data;
  try {
    const service = await ready;
    if (message.method === "update") {
      service.patch(message.changes);
      revision = message.revision;
      return;
    }
    if (message.revision !== revision) throw new Error("The editor document changed");
    scope.postMessage({ id: message.id, revision, value: service.execute(message) }, []);
  } catch (cause) {
    if (message.method === "update") return;
    const error = cause instanceof Error ? cause.message : String(cause);
    scope.postMessage({ id: message.id, revision: message.revision, error }, []);
  }
});
