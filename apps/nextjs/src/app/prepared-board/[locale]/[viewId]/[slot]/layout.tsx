import type { PropsWithChildren } from "react";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { isLocaleSupported } from "@homarr/translation";
import { RootLayoutView } from "~/app/[locale]/_root-layout-view";
import { readPreparedBoardAsync } from "~/board-preparation/store";

interface Params {
  locale: string;
  viewId: string;
  slot: string;
}

// Catch accidental cookies/auth/header reads instead of silently caching an
// anonymous result or publishing a dynamic response as a prepared page.
export const dynamic = "error";
export const dynamicParams = true;
export const revalidate = false;
export const generateStaticParams = () => [];

export const generateViewport = async ({ params }: { params: Promise<Params> }): Promise<Viewport> => {
  const { locale, viewId, slot } = await params;
  if (!isLocaleSupported(locale)) notFound();
  const prepared = await readPreparedBoardAsync(viewId, slot);
  if (!prepared || prepared.context.locale !== locale) notFound();
  return { themeColor: prepared.context.root.serverSettings.branding.primaryColor };
};

export default async function Layout({ params, children }: PropsWithChildren<{ params: Promise<Params> }>) {
  const { locale, viewId, slot } = await params;
  if (!isLocaleSupported(locale)) notFound();
  setRequestLocale(locale);
  const prepared = await readPreparedBoardAsync(viewId, slot);
  if (!prepared || prepared.context.locale !== locale) notFound();
  return (
    <RootLayoutView
      locale={locale}
      data={prepared.context.root}
      preparedToken={prepared.token}
      initialRenderTime={prepared.renderedAt}
    >
      {children}
    </RootLayoutView>
  );
}
