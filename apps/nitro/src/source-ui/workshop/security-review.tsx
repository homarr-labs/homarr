import { Alert } from "@mantine/core";

import { ImportReviewContent } from "@homarr/custom-widgets/workbench";
import type { ImportReviewContentProps } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";

export function WorkshopSecurityReviewContent({ review }: { review: ImportReviewContentProps["review"] | null }) {
  const t = useI18n("customWidget");
  if (!review) return <Alert color="red">The configured widget is invalid and cannot be installed or previewed.</Alert>;
  return (
    <ImportReviewContent
      review={review}
      messages={{
        description: t("importReview.description"),
        name: t("importReview.name"),
        origin: t("importReview.origin"),
        authentication: t("importReview.authentication"),
        networkScope: t("importReview.networkScope"),
        methods: t("importReview.methods"),
        permissions: t("importReview.permissions"),
        actionWarningTitle: t("importReview.actionWarning.title"),
        actionWarningDescription: t("importReview.actionWarning.description"),
        permission: (permission) => {
          if (permission === "view") return t("preview.request.permission.view");
          if (permission === "modify") return t("preview.request.permission.modify");
          if (permission === "full") return t("preview.request.permission.full");
          return permission;
        },
      }}
    />
  );
}
