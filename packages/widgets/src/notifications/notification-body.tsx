import { Text } from "@mantine/core";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import classes from "./component.module.css";

const markdownPlugins = [rehypeSanitize];
const htmlPlugins = [rehypeRaw, rehypeSanitize];
const components: Components = {
  a: ({ href, children }) => (
    <a href={getSafeApplicationUrl(href)} target="_blank" rel={SAFE_NEW_TAB_REL}>
      {children}
    </a>
  ),
};

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
        style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}
      >
        {body}
      </Text>
    );
  }

  let plugins: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"] = markdownPlugins;
  if (resolvedFormat === "html") plugins = htmlPlugins;

  return (
    <Text component="div" c="dimmed" size={dense ? "xs" : "sm"} lineClamp={lineClamp} className={classes.body}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={plugins}
        skipHtml={resolvedFormat !== "html"}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </Text>
  );
};
