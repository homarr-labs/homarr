import { Alert, Stack } from "@mantine/core";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { I18nProvider } from "@homarr/translation/standalone/client";

import messages from "../../../../../../packages/translation/src/lang/en.json";

export const Route = createFileRoute("/(public)/_public/preview")({ component: DisplayPreviewLayout });

function DisplayPreviewLayout() {
  return (
    <I18nProvider snapshot={{ locale: "en", timeZone: "UTC", messages }}>
      <Stack gap="xl">
        <Alert color="yellow" title="Display preview namespace">
          This is not an authenticated product route. Private operations are unavailable. Original component subsets are
          shown for feedback; complete product, font and native-operation parity is not claimed. Document branding and
          English metadata use original preview defaults, not private settings.
        </Alert>
        <Outlet />
      </Stack>
    </I18nProvider>
  );
}
