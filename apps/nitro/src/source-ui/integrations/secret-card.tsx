import { Fieldset } from "@mantine/core";

import { IntegrationSecretCardView } from "@homarr/ui/source-views/connections";
import type { IntegrationSecretCardViewProps } from "@homarr/ui/source-views/connections";

export interface IntegrationSecretPresentationProps extends IntegrationSecretCardViewProps {
  disabled?: boolean;
}

export function IntegrationSecretPresentation({ disabled, ...props }: IntegrationSecretPresentationProps) {
  return (
    <Fieldset variant="unstyled" disabled={disabled} p={0} m={0} miw={0}>
      <IntegrationSecretCardView {...props} />
    </Fieldset>
  );
}
