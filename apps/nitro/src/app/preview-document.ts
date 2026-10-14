import type { Bootstrap } from "../contracts/render";
import type { OriginalDocumentAttributes, OriginalDocumentSnapshot } from "../source-ui/document/contracts";
import { originalDocumentBodyClassName } from "../styles";

export function createPublicDocumentSnapshot(
  bootstrap: Bootstrap,
): Omit<OriginalDocumentSnapshot, "crawling" | "workshopUrls"> {
  return {
    locale: bootstrap.snapshot.locale,
    direction: bootstrap.snapshot.direction,
    colorScheme: bootstrap.colorScheme,
    branding: bootstrap.publicSettings.branding,
    ...bootstrap.document,
    page: { kind: "root" },
  };
}

export function createPublicDocumentAttributes(
  snapshot: ReturnType<typeof createPublicDocumentSnapshot>,
): OriginalDocumentAttributes {
  let backgroundColor: string | undefined;
  if (snapshot.colorScheme === "light") backgroundColor = "#fff";
  if (snapshot.colorScheme === "dark") backgroundColor = "#242424";
  return {
    html: { lang: snapshot.locale, dir: snapshot.direction, style: { backgroundColor } },
    body: { className: originalDocumentBodyClassName },
  };
}

export function createPublicDocumentMetadata(snapshot: ReturnType<typeof createPublicDocumentSnapshot>) {
  const logo = snapshot.branding.logoImageUrl ?? "/logo/logo.png";
  let appleStatusBarStyle = "default";
  if (snapshot.colorScheme === "dark") appleStatusBarStyle = "black-translucent";
  return {
    title: snapshot.branding.appName,
    description: snapshot.description,
    dashboardTitle: snapshot.dashboardTitle,
    websiteUrl: snapshot.websiteUrl,
    logo,
    favicon: snapshot.branding.faviconImageUrl ?? logo,
    appleStatusBarStyle,
    primaryColor: snapshot.branding.primaryColor,
    customCss: snapshot.branding.customCss,
  };
}
