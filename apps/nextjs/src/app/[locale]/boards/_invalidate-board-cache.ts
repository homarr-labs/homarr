"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function invalidateBoardCacheAsync(boardName: string) {
  revalidateTag(`board-${boardName.toLowerCase()}`);
  revalidatePath(`/boards/${boardName}`, "page");
}
