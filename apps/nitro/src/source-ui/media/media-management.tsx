import type { MediaManagementViewProps } from "./contracts";

export function MediaManagementView({
  title = "Media",
  primaryAction,
  toolbar,
  footer,
  notice,
  children,
  renderLayout,
}: MediaManagementViewProps) {
  return renderLayout({
    title,
    primaryAction,
    toolbar,
    footer,
    children: (
      <>
        {notice}
        {children}
      </>
    ),
  });
}
