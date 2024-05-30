"use server";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ options }: WidgetProps<"app">) {
  try {
    const app = await api.app.byId({ id: options.appId });
    let pingResult: RouterOutputs["widget"]["app"]["ping"] | null = null;

    if (app.href && options.openInNewTab) {
      pingResult = await api.widget.app.ping({ url: app.href });
    }

    return { app, pingResult };
  } catch (error) {
    return { app: null, pingResult: null };
  }
}
