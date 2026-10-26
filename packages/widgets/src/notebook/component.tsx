"use client";

import dynamic from "next/dynamic";

import type { WidgetComponentProps } from "../definition";

// Sanitizing rich text needs a DOM. Keep it in the browser instead of loading
// a second DOM implementation into the server for every Board with a Notebook.
const Notebook = dynamic(() => import("./client"), { ssr: false });

export default function NotebookWidget(props: WidgetComponentProps<"notebook">) {
  return <Notebook {...props} />;
}
