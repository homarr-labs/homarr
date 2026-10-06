import { cache } from "react";
import { cookies } from "next/headers";

import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import type { ColorScheme } from "@homarr/definitions";
import { colorSchemeCookieKey } from "@homarr/definitions";

export const getCurrentColorSchemeAsync = cache(async () => {
  const cookieValue = (await cookies()).get(colorSchemeCookieKey)?.value;

  if (cookieValue) {
    return cookieValue as ColorScheme;
  }

  const serverSettings = await getRscServerSettingsAsync();
  return serverSettings.appearance.defaultColorScheme;
});
