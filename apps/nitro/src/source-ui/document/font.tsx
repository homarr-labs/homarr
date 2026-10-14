export const originalInterConfiguration = {
  family: "Inter",
  style: "normal",
  weight: "100 900",
  display: "swap",
  preloadSubsets: ["latin"],
  variable: "--font-sans",
  fallback: {
    family: "Inter Fallback",
    local: "Arial",
    ascentOverride: "90.44%",
    descentOverride: "22.52%",
    lineGapOverride: "0.00%",
    sizeAdjust: "107.12%",
  },
  delivery: "awaiting-original-local-font-assets",
} as const;

export interface OriginalFontResourcesProps {
  stylesheetHref: string;
  latinPreloadHrefs: readonly string[];
  nonce?: string;
}

const isLocalAssetPath = (value: string) => value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");

export function OriginalFontResources({ stylesheetHref, latinPreloadHrefs, nonce }: OriginalFontResourcesProps) {
  if (
    !isLocalAssetPath(stylesheetHref) ||
    latinPreloadHrefs.length === 0 ||
    !latinPreloadHrefs.every(isLocalAssetPath)
  ) {
    throw new Error("Original Inter requires an admitted local stylesheet and Latin preload assets");
  }

  return (
    <>
      {latinPreloadHrefs.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" nonce={nonce} />
      ))}
      <link rel="stylesheet" href={stylesheetHref} nonce={nonce} />
    </>
  );
}
