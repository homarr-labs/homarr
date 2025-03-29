import type { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { AppForm } from "@homarr/forms-collection";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { validation } from "@homarr/validation";

interface QuickAddAppModalProps {
  onClose: (createdAppId: string) => void;
}

export const QuickAddAppModal = createModal<QuickAddAppModalProps>(({ actions, innerProps }) => {
  const tScoped = useScopedI18n("app.page.create.notification");
  const t = useI18n();

  const { mutate, isPending } = clientApi.app.create.useMutation({
    onError: () => {
      showErrorNotification({
        title: tScoped("error.title"),
        message: tScoped("error.message"),
      });
    },
  });

  const handleSubmit = (values: z.infer<typeof validation.app.manage>) => {
    mutate(values, {
      onSuccess({ appId }) {
        showSuccessNotification({
          title: tScoped("success.title"),
          message: tScoped("success.message"),
        });

        innerProps.onClose(appId);
        actions.closeModal();
      },
    });
  };

  return (
    <AppForm
      buttonLabels={{
        submit: t("board.action.quickCreateApp.modal.createAndUse"),
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
});
