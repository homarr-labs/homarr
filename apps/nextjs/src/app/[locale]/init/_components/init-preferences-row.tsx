import { LanguageCombobox } from "~/components/language/language-combobox";
import { InitGridColCard } from "./init-card";
import { ColorSchemeSelect } from "./init-color-scheme";

export const InitPreferencesRow = () => {
  return (
    <>
      <InitGridColCard p="xs">
        <ColorSchemeSelect />
      </InitGridColCard>
      <InitGridColCard p="xs">
        <LanguageCombobox variant="unstyled" />
      </InitGridColCard>
    </>
  );
};
