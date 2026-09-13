import { beforeEach, describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import { db } from "@homarr/db";
import { iconRepositories, icons } from "@homarr/db/schema";

import { addContainerIconsAsync } from "../lib/container-icons";

vi.mock("@homarr/db", async (importActual) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importActual<typeof import("@homarr/db")>();
  const { createDb } = await import("@homarr/db/test");
  return {
    ...actual,
    db: createDb(),
  };
});

const repositoryId = createId();

const insertIconsAsync = async (names: string[]) => {
  await db.insert(iconRepositories).values({ id: repositoryId, slug: "test" });
  await db.insert(icons).values(
    names.map((name) => ({
      id: createId(),
      name,
      url: `https://icons.example.com/${name}`,
      checksum: name,
      iconRepositoryId: repositoryId,
    })),
  );
};

describe("addContainerIconsAsync", () => {
  beforeEach(async () => {
    await db.delete(icons);
    await db.delete(iconRepositories);
  });

  test("matches an icon by the container image name", async () => {
    await insertIconsAsync(["sonarr.svg", "radarr.svg"]);

    await expect(addContainerIconsAsync([{ image: "linuxserver/sonarr:latest" }])).resolves.toStrictEqual([
      {
        image: "linuxserver/sonarr:latest",
        iconUrl: "https://icons.example.com/sonarr.svg",
      },
    ]);
  });

  test("does not match any icon for a container without an image", async () => {
    await insertIconsAsync(["sonarr.svg", "radarr.svg"]);

    await expect(addContainerIconsAsync([{ image: "" }])).resolves.toStrictEqual([{ image: "", iconUrl: null }]);
  });

  test("keeps matching the remaining containers when one has no image", async () => {
    await insertIconsAsync(["sonarr.svg"]);

    await expect(addContainerIconsAsync([{ image: "" }, { image: "ghcr.io/org/sonarr:v4" }])).resolves.toStrictEqual([
      { image: "", iconUrl: null },
      {
        image: "ghcr.io/org/sonarr:v4",
        iconUrl: "https://icons.example.com/sonarr.svg",
      },
    ]);
  });

  test("returns no icons when the table is empty", async () => {
    await expect(addContainerIconsAsync([{ image: "linuxserver/sonarr:latest" }])).resolves.toStrictEqual([
      { image: "linuxserver/sonarr:latest", iconUrl: null },
    ]);
  });
});
