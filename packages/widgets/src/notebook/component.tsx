import dynamic from "next/dynamic";

import "@mantine/tiptap/styles.css";

import type { WidgetComponentProps } from "../definition";

const Editor = dynamic(
  () => import("./editor").then((module) => module.Editor),
  {
    ssr: false,
  },
);

export default function NotebookWidget(
  props: WidgetComponentProps<"notebook">,
) {
  return <Editor {...props} />;
}
