import { AppNewForm } from "@homarr/forms-collection";
import { createModal } from "@homarr/modals";

export const QuickAddAppModal = createModal(({ actions }) => {
  return <AppNewForm showCreateAnother={false} showBackToOverview={false} />;
}).withOptions({
  defaultTitle(t) {
    return t("board.action.quickCreateApp.modal.title");
  },
});
