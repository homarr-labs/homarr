import type { CheckboxProps } from "@homarr/form/types";
import { useScopedI18n } from "@homarr/translation/client";
import { Fieldset, Switch } from "@mantine/core";

interface OldmarrImportAppsSettingsProps {
  onlyImportApps: CheckboxProps;
  background?: string;
}

export const OldmarrImportAppsSettings = ({ background, onlyImportApps }: OldmarrImportAppsSettingsProps) => {
  const tApps = useScopedI18n("board.action.oldImport.form.apps");

  return (
    <Fieldset legend={tApps("label")} bg={background}>
      <Switch {...onlyImportApps} label={tApps("onlyImportApps.label")} description={tApps("onlyImportApps.description")} />
    </Fieldset>
  );
};
