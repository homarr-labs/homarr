import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { AppForm } from "@homarr/forms-collection";
import { createModal, modalSizeForm } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { appManageSchema } from "@homarr/validation/app";

interface QuickAddAppModalProps {
  onClose: (createdApp: Omit<RouterOutputs["app"]["create"], "appId">) => void;
}

export const QuickAddAppModal = createModal<QuickAddAppModalProps>(({ actions, innerProps }) => {
  const tScoped = useI18n("app.page.create.notification");
  const tCommon = useI18n("common");
  const tBoard = useI18n("board");

  const { mutate, isPending } = clientApi.app.create.useMutation({
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.create.error"),
        message: tScoped("error.message"),
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof appManageSchema>) => {
    mutate(values, {
      onSuccess(app) {
        showSuccessNotification({
          title: tCommon("notification.create.success"),
          message: tScoped("success.message"),
        });

        innerProps.onClose(app);
        actions.closeModal();
      },
    });
  };

  return (
    <AppForm
      buttonLabels={{
        submit: tBoard("action.quickCreateApp.modal.createAndUse"),
        submitAndCreateAnother: undefined,
      }}
      showBackToOverview={false}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
}).withOptions({
  defaultTitle(t) {
    return t("board.action.quickCreateApp.modal.title");
  },
  size: modalSizeForm,
});
