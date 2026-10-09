import type { PropsWithChildren } from "react";
import { NextIntlClientProvider } from "next-intl";

/* oxlint-disable import/no-unassigned-import */
import "@homarr/ui/styles.css";
import "@homarr/notifications/styles.css";
import "@mantine/lightbox/styles.css";
import "mantine-datatable/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "~/styles/color-scheme.scss";
import "~/styles/scroll-area.scss";
/* oxlint-enable import/no-unassigned-import */

import { getI18nMessages } from "@homarr/translation/server";
import { DebugPreviewProviders } from "~/components/board/debug/preview";
import { fontSans } from "~/theme/font";

// A separate root avoids the authenticated app's session guard, Assistant and
// service worker. Only the snapshot's providers are mounted in the preview.
export default async function DebugPreviewLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={[fontSans.className, fontSans.variable].join(" ")}>
        <NextIntlClientProvider locale="en" messages={await getI18nMessages({ locale: "en" })}>
          <DebugPreviewProviders>{children}</DebugPreviewProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
