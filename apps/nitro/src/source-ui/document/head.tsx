import { ColorSchemeScript } from "@mantine/core";

import { originalDocumentBodyClassName } from "../../styles";
import type { OriginalDocumentAttributes, OriginalDocumentSnapshot } from "./contracts";

export function createOriginalDocumentAttributes(
  snapshot: OriginalDocumentSnapshot,
): OriginalDocumentAttributes & { html: { suppressHydrationWarning: true } } {
  let backgroundColor: string | undefined = "#fff";
  if (snapshot.colorScheme === "dark") backgroundColor = "#242424";
  if (snapshot.colorScheme === "auto") backgroundColor = undefined;

  return {
    html: {
      lang: snapshot.locale,
      dir: snapshot.direction,
      style: { backgroundColor },
      suppressHydrationWarning: true,
    },
    body: { className: originalDocumentBodyClassName },
  };
}

export function createOriginalDocumentMetadata(snapshot: OriginalDocumentSnapshot) {
  const logo = snapshot.branding.logoImageUrl ?? "/logo/logo.png";
  const brandFavicon = snapshot.branding.faviconImageUrl ?? logo;
  let title = snapshot.branding.appName;
  let favicon = brandFavicon;
  let appleIcon = logo;
  let startupImage = logo;

  if (snapshot.page.kind === "page") title = `${snapshot.page.title} • ${snapshot.branding.appName}`;
  if (snapshot.page.kind === "board") {
    title = `${snapshot.page.title} • ${snapshot.branding.appName}`;
    if (snapshot.page.metaTitle) title = snapshot.page.metaTitle;
    if (snapshot.page.faviconImageUrl?.trim()) favicon = snapshot.page.faviconImageUrl;
    appleIcon = favicon;
    startupImage = favicon;
  }

  const robots: string[] = [];
  const google: string[] = [];
  if (snapshot.crawling.noIndex) robots.push("noindex");
  if (snapshot.crawling.noFollow) robots.push("nofollow");
  if (snapshot.crawling.noSiteLinksSearchBox) google.push("nositelinkssearchbox");
  if (snapshot.crawling.noTranslate) google.push("notranslate");

  let appleStatusBarStyle = "default";
  if (snapshot.colorScheme === "dark") appleStatusBarStyle = "black-translucent";
  let appleTitle: string | null = snapshot.branding.appName;
  if (snapshot.page.kind === "board") {
    appleTitle = null;
    appleStatusBarStyle = "default";
  }

  return {
    title,
    description: snapshot.description,
    openGraph: {
      title: snapshot.dashboardTitle,
      description: snapshot.description,
      url: snapshot.websiteUrl,
      siteName: snapshot.branding.appName,
    },
    favicon,
    appleIcon,
    startupImage,
    appleTitle,
    appleStatusBarStyle,
    themeColor: snapshot.branding.primaryColor,
    robots: robots.join(","),
    google: google.join(","),
  };
}

export interface OriginalDocumentHeadProps {
  snapshot: OriginalDocumentSnapshot;
  nonce?: string;
  manifestHref?: string;
}

export function OriginalDocumentHead({ snapshot, nonce, manifestHref }: OriginalDocumentHeadProps) {
  const metadata = createOriginalDocumentMetadata(snapshot);
  return (
    <>
      <ColorSchemeScript defaultColorScheme={snapshot.colorScheme} nonce={nonce} />
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content={metadata.themeColor} />
      <meta property="og:title" content={metadata.openGraph.title} />
      <meta property="og:description" content={metadata.openGraph.description} />
      <meta property="og:url" content={metadata.openGraph.url} />
      <meta property="og:site_name" content={metadata.openGraph.siteName} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={metadata.openGraph.title} />
      <meta name="twitter:description" content={metadata.openGraph.description} />
      <link rel="icon" href={metadata.favicon} />
      <link rel="apple-touch-icon" href={metadata.appleIcon} />
      <link rel="apple-touch-startup-image" href={metadata.startupImage} />
      {metadata.appleTitle && <meta name="apple-mobile-web-app-title" content={metadata.appleTitle} />}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content={metadata.appleStatusBarStyle} />
      <meta name="robots" content={metadata.robots} />
      <meta name="google" content={metadata.google} />
      <meta name="homarr-website-url" content={snapshot.websiteUrl} />
      {snapshot.workshopUrls && (
        <>
          <meta name="homarr-workshop-api-url" content={snapshot.workshopUrls.api} />
          <meta name="homarr-workshop-web-url" content={snapshot.workshopUrls.web} />
        </>
      )}
      {manifestHref && <link rel="manifest" href={manifestHref} />}
      <style nonce={nonce} data-homarr-global-custom-css>
        {snapshot.branding.customCss}
      </style>
    </>
  );
}

export function getOriginalCrowdinScripts(locale: string) {
  if (locale !== "cr") return [];
  return [
    { type: "text/javascript", src: "//cdn.crowdin.com/jipt/jipt.js", strategy: "afterInteractive" },
    {
      type: "text/javascript",
      id: "crowdin-configuration",
      text: "var _jipt = []; _jipt.push(['project', 'homarr_labs']);",
      strategy: "afterInteractive",
    },
  ];
}
