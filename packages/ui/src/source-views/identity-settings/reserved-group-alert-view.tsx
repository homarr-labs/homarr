"use client";

import { Alert, Anchor } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import type { IdentitySettingsLinkProps, ReservedGroupAlertViewProps } from "./contracts";

export const ReservedGroupAlertView = ({
  renderMessage,
  documentationLabel,
  documentationHref,
  linkComponent: LinkComponent,
}: ReservedGroupAlertViewProps) => {
  return (
    <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
      {renderMessage(
        <Anchor
          size="sm"
          href={documentationHref}
          target="_blank"
          renderRoot={(props: IdentitySettingsLinkProps) => <LinkComponent {...props} />}
        >
          {documentationLabel}
        </Anchor>,
      )}
    </Alert>
  );
};
