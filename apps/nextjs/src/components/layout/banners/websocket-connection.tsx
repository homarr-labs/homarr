"use client";

import { useAtomValue } from "jotai";
import { webSocketConnectionAtom } from "~/app/[locale]/_client-providers/trpc";

export const WebSocketConnectionBanner = () => {
  const value = useAtomValue(webSocketConnectionAtom);

  console.log('socket connection', value)
  return <div>dfheuihjfieufheuhfuefhuehfu</div>
};