import { createModal } from "@homarr/modals";
import { AppNewForm } from "@homarr/forms-collection";

export const QuickAddAppModal = createModal(({ actions }) => {
  return <AppNewForm showCreateAnother={false} showBackToOverview={false}/>;
}).withOptions({
  defaultTitle(t) {
    return 'TEST'; // TODO: change
  },
});