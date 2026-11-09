import type { ComponentProps } from "react";
import { Alert } from "@mantine/core";
import { IconAlertOctagon, IconAlertTriangle, IconBulb, IconInfoCircle, IconMessageReport } from "@tabler/icons-react";
import type { ExtraProps } from "react-markdown";
import type rehypeSanitize from "rehype-sanitize";

import classes from "./markdown.module.css";

type HastRoot = Parameters<ReturnType<typeof rehypeSanitize>>[0];
type HastNode = HastRoot["children"][number];
type HastElement = Extract<HastNode, { type: "element" }>;

const alerts = {
  note: { color: "blue", title: "Note", icon: IconInfoCircle },
  tip: { color: "green", title: "Tip", icon: IconBulb },
  important: { color: "violet", title: "Important", icon: IconMessageReport },
  warning: { color: "yellow", title: "Warning", icon: IconAlertTriangle },
  caution: { color: "red", title: "Caution", icon: IconAlertOctagon },
} as const;

type AlertKind = keyof typeof alerts;

const markerRegex = /^\[!(note|tip|important|warning|caution)\](?=\s|$)/i;
const iconStyle = { width: "100%", height: "100%" };

const isAlertKind = (value: unknown): value is AlertKind =>
  typeof value === "string" && Object.keys(alerts).includes(value);

const isBlank = (node: HastNode) => {
  if (node.type === "text") return node.value.trim() === "";
  return node.type === "element" && node.tagName === "br";
};

const trimLeadingBlanks = (children: HastElement["children"]) => {
  while (children[0] && isBlank(children[0])) children.shift();
  const [head] = children;
  if (head?.type === "text") head.value = head.value.trimStart();
};

const takeAlertKind = (blockquote: HastElement) => {
  const paragraph = blockquote.children.find((child) => child.type !== "text" || child.value.trim() !== "");
  if (paragraph?.type !== "element" || paragraph.tagName !== "p") return undefined;

  const [head] = paragraph.children;
  if (head?.type !== "text") return undefined;

  const match = markerRegex.exec(head.value);
  const kind = match?.[1]?.toLowerCase();
  if (!match || !isAlertKind(kind)) return undefined;

  head.value = head.value.slice(match[0].length);
  trimLeadingBlanks(paragraph.children);
  if (paragraph.children.length === 0) {
    blockquote.children.splice(blockquote.children.indexOf(paragraph), 1);
  }
  return kind;
};

const markAlerts = (parent: HastRoot | HastElement) => {
  for (const child of parent.children) {
    if (child.type !== "element") continue;
    if (child.tagName === "blockquote") {
      const kind = takeAlertKind(child);
      if (kind) child.properties.dataAlert = kind;
    }
    markAlerts(child);
  }
};

export const rehypeGithubAlerts = () => (tree: HastRoot) => {
  markAlerts(tree);
};

export const AlertBlockquote = ({ node, children, ...props }: ComponentProps<"blockquote"> & ExtraProps) => {
  const kind = node?.properties.dataAlert;
  if (!isAlertKind(kind)) return <blockquote {...props}>{children}</blockquote>;

  const { color, title, icon: Icon } = alerts[kind];
  return (
    <Alert color={color} title={title} icon={<Icon style={iconStyle} />} className={classes.alert}>
      {children}
    </Alert>
  );
};
