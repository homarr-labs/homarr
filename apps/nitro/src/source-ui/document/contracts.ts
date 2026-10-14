import type { CSSProperties } from "react";
import type { MantineColorScheme } from "@mantine/core";

export interface OriginalDocumentBranding {
  appName: string;
  primaryColor: string;
  logoImageUrl: string | null;
  faviconImageUrl: string | null;
  customCss: string;
}

export interface OriginalDocumentCrawling {
  noIndex: boolean;
  noFollow: boolean;
  noSiteLinksSearchBox: boolean;
  noTranslate: boolean;
}

export type OriginalDocumentPage =
  | { kind: "root" }
  | { kind: "page"; title: string }
  | { kind: "board"; title: string; metaTitle: string | null; faviconImageUrl: string | null };

export interface OriginalDocumentSnapshot {
  locale: string;
  direction: "ltr" | "rtl";
  colorScheme: MantineColorScheme;
  branding: OriginalDocumentBranding;
  description: string;
  dashboardTitle: string;
  websiteUrl: string;
  crawling: OriginalDocumentCrawling;
  page: OriginalDocumentPage;
  workshopUrls?: { api: string; web: string };
}

export interface OriginalDocumentAttributes {
  html: { lang: string; dir: "ltr" | "rtl"; style: CSSProperties };
  body: { className: string };
}
