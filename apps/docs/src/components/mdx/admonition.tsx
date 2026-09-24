import { Callout } from "fumadocs-ui/components/callout";
import type { ReactNode } from "react";

interface AdmonitionProps {
  children: ReactNode;
  title?: ReactNode;
  type?: "caution" | "danger" | "info" | "note" | "success" | "tip" | "warning";
}

const typeMap = {
  caution: "warn",
  danger: "error",
  info: "info",
  note: "info",
  success: "success",
  tip: "idea",
  warning: "warn",
} as const;

export default function Admonition({ children, title, type = "note" }: AdmonitionProps) {
  return (
    <Callout title={title} type={typeMap[type]}>
      {children}
    </Callout>
  );
}
