import { createModal } from "@homarr/modals";

export const QuickAddAppModal = createModal(({ actions }) => {
    return <AppNewForm />;
}).withOptions({
    defaultTitle(t) {
        return 'TEST'; // TODO: change
    },
});