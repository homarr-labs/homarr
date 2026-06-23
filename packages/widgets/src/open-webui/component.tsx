"use client";

import dynamic from "next/dynamic";

import type { WidgetComponentProps } from "../definition";

const Chat = dynamic(() => import("./chat").then((module) => module.Chat), {
  ssr: false,
});

export default function OpenWebUiWidget(props: WidgetComponentProps<"openWebUi">) {
  return <Chat {...props} />;
}
