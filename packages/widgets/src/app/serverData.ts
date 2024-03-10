"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerData({ options }: WidgetProps<"app">) {
  const app = await api.app.byId({ id: options.appId });
  return { app };
}
