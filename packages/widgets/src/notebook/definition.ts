import { optionsBuilder } from "../options";
import { defaultContent } from "./default-content";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showToolbar: factory.switch({ defaultValue: true }),
        allowReadOnlyCheck: factory.switch({ defaultValue: true }),
        content: factory.text({ defaultValue: defaultContent }),
      }),
      {
        content: { shouldHide: () => true },
      },
    );
  },
};
