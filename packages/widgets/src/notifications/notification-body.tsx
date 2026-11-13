import { Text } from "@mantine/core";

import { Markdown } from "@homarr/ui/markdown";

interface NotificationBodyProps {
  body: string;
  contentType?: string;
  format: "auto" | "plain" | "markdown" | "html";
  lineClamp?: number;
  dense: boolean;
}

export const NotificationBody = ({ body, contentType, format, lineClamp, dense }: NotificationBodyProps) => {
  let resolvedFormat = format;
  if (format === "auto") {
    resolvedFormat = "plain";
    if (contentType === "text/markdown") resolvedFormat = "markdown";
    if (contentType === "text/html") resolvedFormat = "html";
  }

  if (resolvedFormat === "plain") {
    return (
      <Text
        c="dimmed"
        size={dense ? "xs" : "sm"}
        lineClamp={lineClamp}
        title={body}
        style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
      >
        {body}
      </Text>
    );
  }

  return (
    <Text component="div" c="dimmed" size={dense ? "xs" : "sm"} lineClamp={lineClamp} w="100%">
      <Markdown allowHtml={resolvedFormat === "html"} typography={false}>
        {body}
      </Markdown>
    </Text>
  );
};
