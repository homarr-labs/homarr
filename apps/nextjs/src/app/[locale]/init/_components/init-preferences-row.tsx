import { CurrentLanguageCombobox } from "~/components/language/current-language-combobox";
import { InitGridColCard } from "./init-card";
import { ColorSchemeSelect } from "./init-color-scheme";

export const InitPreferencesRow = () => {
  return (
    <>
      <InitGridColCard p="xs">
        <ColorSchemeSelect />
      </InitGridColCard>
      <InitGridColCard p="xs">
        <CurrentLanguageCombobox variant="unstyled" />
      </InitGridColCard>
    </>
  );
};
