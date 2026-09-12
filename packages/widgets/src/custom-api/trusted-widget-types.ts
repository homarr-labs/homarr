import type { WidgetPackageManifest } from "@homarr/custom-widgets/package";

export interface TrustedWidgetData {
  type: "customWidgetV3";
  installationId: string;
  previewId?: string;
  artifactDigest: string;
  manifest: WidgetPackageManifest;
  options: Record<string, unknown>;
  surfaceUrls: { tile: string; advanced?: string; configuration?: string };
  stylesheetUrls: { tile: string; advanced?: string; configuration?: string };
}
