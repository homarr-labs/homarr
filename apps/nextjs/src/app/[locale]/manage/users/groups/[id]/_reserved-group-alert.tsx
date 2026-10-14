"use client";

import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { ReservedGroupAlertView } from "@homarr/ui/source-views/identity-settings";

export const ReservedGroupAlert = () => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");

  return (
    <ReservedGroupAlertView
      renderMessage={(documentationLink) =>
        tGroup.rich("reservedNotice.message", {
          checkoutDocs: () => documentationLink,
        })
      }
      documentationLabel={tCommon("action.checkoutDocs")}
      documentationHref={createDocumentationLink("/docs/management/users", "#special-groups")}
      linkComponent={Link}
    />
  );
};
