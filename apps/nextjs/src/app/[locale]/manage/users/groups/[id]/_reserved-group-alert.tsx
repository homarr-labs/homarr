"use client";

import { Alert, Anchor } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export const ReservedGroupAlert = () => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");

  return (
    <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
      {tGroup.rich("reservedNotice.message", {
        checkoutDocs: () => (
          <Anchor
            size="sm"
            component={Link}
            href={createDocumentationLink("/docs/management/users", "#special-groups")}
            target="_blank"
          >
            {tCommon("action.checkoutDocs")}
          </Anchor>
        ),
      })}
    </Alert>
  );
};
