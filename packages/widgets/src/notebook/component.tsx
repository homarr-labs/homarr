"use client";

import dynamic from "next/dynamic";

import { useScopedI18n } from "@homarr/translation/client";

import { WidgetMobileSummary } from "../common/mobile-summary";
import type { WidgetComponentProps } from "../definition";

const Notebook = dynamic(() => import("./notebook").then((module) => module.Notebook), {
  ssr: false,
});

export default function NotebookWidget(props: WidgetComponentProps<"notebook">) {
  const t = useScopedI18n("widget.notebook");

  if (props.displayMode === "mobileSummary") {
    const excerpt = props.options.content
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&(?:nbsp|#160);/gi, " ")
      .replace(/&(?:amp|#38);/gi, "&")
      .replace(/&(?:lt|#60);/gi, "<")
      .replace(/&(?:gt|#62);/gi, ">")
      .replace(/&(?:quot|#34);/gi, '"')
      .replace(/\s+/g, " ")
      .trim();

    return <WidgetMobileSummary value={excerpt || "—"} label={t("name")} />;
  }

  return <Notebook {...props} />;
}
