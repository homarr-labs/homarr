import { headers } from "next/headers";

export const boardDebugPreviewHeader = "x-homarr-board-debug-preview";

// The proxy overwrites this header on every application request.
export const isBoardDebugPreviewAsync = async () => (await headers()).get(boardDebugPreviewHeader) === "1";
