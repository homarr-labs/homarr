"use server";

import { revalidatePath } from "next/cache";

export async function revalidatePathAction(path: string) {
  return new Promise((resolve) => resolve(revalidatePath(path, "page")));
}
