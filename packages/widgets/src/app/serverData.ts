"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerData(_item: WidgetProps<"app">) {
  const app = await api.app.byId({ id: _item.options.appId });
  return { _item, app };
}
