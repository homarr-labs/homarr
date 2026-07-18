import type { Metadata } from "next";

import { CustomWidgetSecretEntry } from "./secret-entry";

export const metadata: Metadata = {
  title: "Configure custom widget credential",
  robots: { index: false, follow: false },
};

export default async function CustomWidgetSecretPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomWidgetSecretEntry token={token} />;
}
