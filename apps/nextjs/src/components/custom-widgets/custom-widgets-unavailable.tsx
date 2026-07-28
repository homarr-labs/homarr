import { Alert, Container } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { getScopedI18n } from "@homarr/translation/server";

export async function CustomWidgetsUnavailable() {
  const t = await getScopedI18n("customWidget.page.disabled");

  return (
    <Container size="sm" py="xl">
      <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={t("title")}>
        {t("message")}
      </Alert>
    </Container>
  );
}
