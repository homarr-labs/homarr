"use server";

import { db } from "../../../db";
import type { WidgetProps } from "../definition";

export default async function getServerData(_item: WidgetProps<"clock">) {
  const randomUuid = crypto.randomUUID();
  const data = await db.query.items.findMany();
  return { data, count: data.length, randomUuid };
}
