"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { useScopedI18n } from "@homarr/translation/client";

import { WidgetMobileSummary } from "../common/mobile-summary";
import type { WidgetComponentProps } from "../definition";
import { extractNotebookExcerpt } from "./mobile-summary";

const Notebook = dynamic(() => import("./notebook").then((module) => module.Notebook), {
  ssr: false,
});

interface NotebookMobileSummaryProps {
  content: string;
  label: string;
}

const NotebookMobileSummary = ({ content, label }: NotebookMobileSummaryProps) => {
  const [excerpt, setExcerpt] = useState("");

  useEffect(() => {
    setExcerpt(extractNotebookExcerpt(content));
  }, [content]);

  return <WidgetMobileSummary value={excerpt || "—"} label={label} />;
};

export default function NotebookWidget(props: WidgetComponentProps<"notebook">) {
  const t = useScopedI18n("widget.notebook");

  if (props.displayMode === "mobileSummary") {
    return <NotebookMobileSummary content={props.options.content} label={t("name")} />;
  }

  return <Notebook {...props} />;
}
