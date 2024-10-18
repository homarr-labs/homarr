import Link from "next/link";
import { Alert, Anchor } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { getI18n } from "@homarr/translation/server";

export const ReservedGroupAlert = async () => {
  const t = await getI18n();

  return (
    <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
      {t("group.reservedNotice.message", {
        checkoutDocs: (
          <Anchor
            size="sm"
            component={Link}
            href="https://deploy-preview-113--homarr-docs.netlify.app/docs/management/users/#special-groups"
            target="_blank"
          >
            {t("common.action.checkoutDocs")}
          </Anchor>
        ),
      })}
    </Alert>
  );
};
