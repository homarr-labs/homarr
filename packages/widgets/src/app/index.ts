import { appNamePositions, appNameStyles } from "@homarr/definitions";
import { IconCloud } from "@homarr/ui";
import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { opt } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("app", {
  icon: IconCloud,
  options: opt.from((fac) => ({
    name: fac.text(),
    description: fac.text(), // TODO: Maybe add text area?
    internalUrl: fac.text(),
    externalUrl: fac.text(),
    iconUrl: fac.text(), // TODO: Add icon picker (maybe also allow uploading?)
    openInNewTab: fac.switch(),
    fontSize: fac.number({ defaultValue: 16, validate: z.number() }),
    namePosition: fac.select({
      options: appNamePositions,
      defaultValue: "top",
    }),
    nameStyle: fac.select({
      options: appNameStyles,
      defaultValue: "normal",
    }),
    nameLineClamp: fac.number({ defaultValue: 1, validate: z.number() }),
    statusCodes: fac.multiSelect({
      options: [],
      defaultValue: [],
    }),
  })),
}).withDynamicImport(() => import("./component"));
