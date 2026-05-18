"use server";

import { revalidatePath, revalidateTag } from "next/cache";

// eslint-disable-next-line @typescript-eslint/require-await
export async function invalidateBoardCacheAsync(boardName: string) {
  revalidateTag(`board-${boardName.toLowerCase()}`, { expire: 3600 });
  revalidatePath(`/boards/${boardName}`, "page");
}
