export { originalStaticAssets } from "./assets";
export type {
  OriginalDocumentAttributes,
  OriginalDocumentBranding,
  OriginalDocumentCrawling,
  OriginalDocumentPage,
  OriginalDocumentSnapshot,
} from "./contracts";
export { OriginalFontResources, originalInterConfiguration } from "./font";
export type { OriginalFontResourcesProps } from "./font";
export {
  createOriginalDocumentAttributes,
  createOriginalDocumentMetadata,
  getOriginalCrowdinScripts,
  OriginalDocumentHead,
} from "./head";
export type { OriginalDocumentHeadProps } from "./head";
export { createOriginalWebAppManifest } from "./manifest";
export type { OriginalManifestIcon } from "./manifest";
export { ServiceWorkerRegistration } from "./service-worker-registration";
