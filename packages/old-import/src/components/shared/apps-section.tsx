import { Fieldset, Switch } from "@mantine/core";

import type { CheckboxProps } from "@homarr/form/types";
import { useScopedI18n } from "@homarr/translation/client";

interface OldmarrImportAppsSettingsProps {
  onlyImportApps: CheckboxProps;
  bg?: string;
}

export const OldmarrImportAppsSettings = ({ bg, onlyImportApps }: OldmarrImportAppsSettingsProps) => {
  const tApps = useScopedI18n("board.action.oldImport.form.apps");

  return (
    <Fieldset legend={tApps("label")} bg={bg}>
      <Switch
        {...onlyImportApps}
        label={tApps("onlyImportApps.label")}
        description={tApps("onlyImportApps.description")}
      />
    </Fieldset>
  );
};
