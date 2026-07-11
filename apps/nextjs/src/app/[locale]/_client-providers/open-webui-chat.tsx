"use client";

import dynamic from "next/dynamic";

const OpenWebUiChat = dynamic(() => import("~/components/open-webui-chat").then((mod) => mod.OpenWebUiChat), {
  ssr: false,
});

export const OpenWebUiChatProvider = () => {
  return <OpenWebUiChat />;
};
