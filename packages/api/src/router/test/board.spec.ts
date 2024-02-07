import SuperJSON from "superjson";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { createId } from "@homarr/db";
import {
  boards,
  integrationItems,
  integrations,
  items,
  sections,
} from "@homarr/db/schema/sqlite";

import type { RouterOutputs } from "../../..";
import { boardRouter } from "../board";
import { createDb } from "./_db";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

describe("default should return default board", () => {
  it("should return default board", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const fullBoardProps = await createFullBoard(db, "default");

    const result = await caller.default();

    expectInputToBeFullBoardWithName(result, {
      name: "default",
      ...fullBoardProps,
    });
  });
});

describe("byName should return board by name", () => {
  it.each([["default"], ["something"]])(
    "should return board by name %s when present",
    async (name) => {
      const db = createDb();
      const caller = boardRouter.createCaller({ db, session: null });

      const fullBoardProps = await createFullBoard(db, name);

      const result = await caller.byName({ name });

      expectInputToBeFullBoardWithName(result, {
        name,
        ...fullBoardProps,
      });
    },
  );

  it("should throw error when not present");
});

describe("saveGeneralSettings should save general settings", () => {
  it("should save general settings", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const newPageTitle = "newPageTitle";
    const newMetaTitle = "newMetaTitle";
    const newLogoImageUrl = "http://logo.image/url.png";
    const newFaviconImageUrl = "http://favicon.image/url.png";

    const { boardId } = await createFullBoard(db, "default");

    await caller.saveGeneralSettings({
      pageTitle: newPageTitle,
      metaTitle: newMetaTitle,
      logoImageUrl: newLogoImageUrl,
      faviconImageUrl: newFaviconImageUrl,
    });
  });
});

const expectInputToBeFullBoardWithName = (
  input: RouterOutputs["board"]["default"],
  props: { name: string } & Awaited<ReturnType<typeof createFullBoard>>,
) => {
  expect(input.id).toBe(props.boardId);
  expect(input.name).toBe(props.name);
  expect(input.sections.length).toBe(1);
  const firstSection = input.sections[0]!;
  expect(firstSection.id).toBe(props.sectionId);
  expect(firstSection.items.length).toBe(1);
  const firstItem = firstSection.items[0]!;
  expect(firstItem.id).toBe(props.itemId);
  expect(firstItem.kind).toBe("clock");
  if (firstItem.kind === "clock") {
    expect(firstItem.options.is24HourFormat).toBe(true);
  }
  expect(firstItem.integrations.length).toBe(1);
  const firstIntegration = firstItem.integrations[0]!;
  expect(firstIntegration.id).toBe(props.integrationId);
  expect(firstIntegration.kind).toBe("adGuardHome");
};

const createFullBoard = async (db: Database, name: string) => {
  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name,
  });

  const sectionId = createId();
  await db.insert(sections).values({
    id: sectionId,
    kind: "empty",
    position: 0,
    boardId,
  });

  const itemId = createId();
  await db.insert(items).values({
    id: itemId,
    kind: "clock",
    height: 1,
    width: 1,
    xOffset: 0,
    yOffset: 0,
    sectionId,
    options: SuperJSON.stringify({ is24HourFormat: true }),
  });

  const integrationId = createId();
  await db.insert(integrations).values({
    id: integrationId,
    kind: "adGuardHome",
    name: "AdGuard Home",
    url: "http://localhost:3000",
  });

  await db.insert(integrationItems).values({
    integrationId,
    itemId,
  });

  return {
    boardId,
    sectionId,
    itemId,
    integrationId,
  };
};
