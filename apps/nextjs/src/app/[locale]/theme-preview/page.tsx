import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { ThemePreview } from "~/components/theme/theme-preview";

export default async function ThemePreviewPage() {
  if (!(await auth())) notFound();
  return <ThemePreview />;
}
