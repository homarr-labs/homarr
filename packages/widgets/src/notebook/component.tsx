import dynamic from "next/dynamic";

import "@mantine/tiptap/styles.css";

import type { WidgetComponentProps } from "../definition";

const Notebook = dynamic(
  () => import("./notebook").then((module) => module.Notebook),
  {
    ssr: false,
  },
);

export default function NotebookWidget(
  props: WidgetComponentProps<"notebook">,
) {
  return <Notebook {...props} />;
}
