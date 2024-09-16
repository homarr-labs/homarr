import { useChangeLocale } from "@homarr/translation/client";

import { useModalAction } from "../../../modals/src";

// FIXME: I guess I need some sort of context here to be able to call the same amount of hooks on every render
export const useInteractionContext = () => {
  const changeLocale = useChangeLocale();
  const { openModal } = useModalAction(null!);

  return {
    changeLocale,
  };
};
