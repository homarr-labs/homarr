// @vitest-environment node

import { describe, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { iconRepositories, icons, medias, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { mediaRouter } from "../medias/media-router";

const createSession = (userId: string): Session => ({
  user: { id: userId, permissions: ["media-upload"], colorScheme: "light" },
  expires: new Date().toISOString(),
});

const setupAsync = async () => {
  const db = createDb();
  const userId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(iconRepositories).values({ id: createId(), slug: "local" });
  const caller = mediaRouter.createCaller({ db, deviceType: undefined, session: createSession(userId) });
  return { db, caller };
};

const upload = (...files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return formData;
};

describe("uploadMedia", () => {
  test("stores a video as media with a canonical url, but not as an icon", async () => {
    const { db, caller } = await setupAsync();

    const [uploaded] = await caller.uploadMedia(
      upload(
        new File(
          [new Uint8Array([0, 0, 0, 16, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0])],
          "background.mp4",
          { type: "video/mp4" },
        ),
      ),
    );

    expect(uploaded?.url).toBe(`/api/user-medias/${uploaded?.id}`);
    expect(await db.select().from(medias)).toHaveLength(1);
    expect(await db.select().from(icons)).toHaveLength(0);
  });

  test("stores an image as media and as a local icon", async () => {
    const { db, caller } = await setupAsync();

    const [uploaded] = await caller.uploadMedia(
      upload(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "logo.png", { type: "image/png" })),
    );

    expect(uploaded?.url).toBe(`/api/user-medias/${uploaded?.id}`);
    const storedIcons = await db.select().from(icons);
    expect(storedIcons.map((icon) => icon.url)).toEqual([uploaded?.url]);
  });
});
