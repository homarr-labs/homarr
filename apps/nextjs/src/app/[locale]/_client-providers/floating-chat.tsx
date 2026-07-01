"use client";

import dynamic from "next/dynamic";

const FloatingChatButton = dynamic(
  () => import("~/components/board/floating-chat-button").then((mod) => mod.FloatingChatButton),
  { ssr: false },
);

export const FloatingChatButtonProvider = () => {
  return <FloatingChatButton />;
};
