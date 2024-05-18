"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({
  options,
}: WidgetProps<"app">) {
  try {
    const app = await api.app.byId({ id: options.appId });
    return { app };
  } catch (error) {
    return { app: null };
  }
}
