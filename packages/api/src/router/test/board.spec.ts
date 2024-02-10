import SuperJSON from "superjson";
import { describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { createId, eq } from "@homarr/db";
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

const expectToBeDefined = <T>(value: T) => {
  if (value === undefined) {
    expect(value).toBeDefined();
  }
  if (value === null) {
    expect(value).not.toBeNull();
  }
  return value as Exclude<T, undefined | null>;
};

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
      boardId,
    });
  });

  it("should throw error when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const act = async () =>
      await caller.saveGeneralSettings({
        pageTitle: "newPageTitle",
        metaTitle: "newMetaTitle",
        logoImageUrl: "http://logo.image/url.png",
        faviconImageUrl: "http://favicon.image/url.png",
        boardId: "nonExistentBoardId",
      });

    await expect(act()).rejects.toThrowError("Board not found");
  });
});

describe("save should save full board", () => {
  it("should remove section when not present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, sectionId } = await createFullBoard(db, "default");

    await caller.save({
      boardId,
      sections: [
        {
          id: createId(),
          kind: "empty",
          position: 0,
          items: [],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: true,
      },
    });

    const section = await db.query.boards.findFirst({
      where: eq(sections.id, sectionId),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    expect(definedBoard.sections[0]?.id).not.toBe(sectionId);
    expect(section).toBeUndefined();
  });
  it("should remove item when not present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, itemId, sectionId } = await createFullBoard(db, "default");

    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [
            {
              id: createId(),
              kind: "clock",
              options: { is24HourFormat: true },
              integrations: [],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: {
          with: {
            items: true,
          },
        },
      },
    });

    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    const firstSection = expectToBeDefined(definedBoard.sections[0]);
    expect(firstSection.items.length).toBe(1);
    expect(firstSection.items[0]?.id).not.toBe(itemId);
    expect(item).toBeUndefined();
  });
  it("should remove integration reference when not present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });
    const anotherIntegration = {
      id: createId(),
      kind: "adGuardHome",
      name: "AdGuard Home",
      url: "http://localhost:3000",
    } as const;

    const { boardId, itemId, integrationId, sectionId } = await createFullBoard(
      db,
      "default",
    );
    await db.insert(integrations).values(anotherIntegration);

    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrations: [anotherIntegration],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: {
          with: {
            items: {
              with: {
                integrations: true,
              },
            },
          },
        },
      },
    });

    const integration = await db.query.integrationItems.findFirst({
      where: eq(integrationItems.integrationId, integrationId),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    const firstSection = expectToBeDefined(definedBoard.sections[0]);
    expect(firstSection.items.length).toBe(1);
    const firstItem = expectToBeDefined(firstSection.items[0]);
    expect(firstItem.integrations.length).toBe(1);
    expect(firstItem.integrations[0]?.integrationId).not.toBe(integrationId);
    expect(integration).toBeUndefined();
  });
  it.each([
    [{ kind: "empty" as const }],
    [{ kind: "category" as const, name: "My first category" }],
  ])("should add section when present in input", async (partialSection) => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, sectionId } = await createFullBoard(db, "default");

    const newSectionId = createId();
    await caller.save({
      boardId,
      sections: [
        {
          id: newSectionId,
          position: 1,
          items: [],
          ...partialSection,
        },
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: true,
      },
    });

    const section = await db.query.sections.findFirst({
      where: eq(sections.id, newSectionId),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(2);
    const addedSection = expectToBeDefined(
      definedBoard.sections.find((section) => section.id === newSectionId),
    );
    expect(addedSection).toBeDefined();
    expect(addedSection.id).toBe(newSectionId);
    expect(addedSection.kind).toBe(partialSection.kind);
    expect(addedSection.position).toBe(1);
    if ("name" in partialSection) {
      expect(addedSection.name).toBe(partialSection.name);
    }
    expect(section).toBeDefined();
  });
  it("should add item when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, sectionId } = await createFullBoard(db, "default");

    const newItemId = createId();
    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [
            {
              id: newItemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrations: [],
              height: 1,
              width: 1,
              xOffset: 3,
              yOffset: 2,
            },
          ],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: {
          with: {
            items: true,
          },
        },
      },
    });

    const item = await db.query.items.findFirst({
      where: eq(items.id, newItemId),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    const firstSection = expectToBeDefined(definedBoard.sections[0]);
    expect(firstSection.items.length).toBe(1);
    const addedItem = expectToBeDefined(
      firstSection.items.find((item) => item.id === newItemId),
    );
    expect(addedItem).toBeDefined();
    expect(addedItem.id).toBe(newItemId);
    expect(addedItem.kind).toBe("clock");
    expect(addedItem.options).toBe(
      SuperJSON.stringify({ is24HourFormat: true }),
    );
    expect(addedItem.height).toBe(1);
    expect(addedItem.width).toBe(1);
    expect(addedItem.xOffset).toBe(3);
    expect(addedItem.yOffset).toBe(2);
    expect(item).toBeDefined();
  });
  it("should add integration reference when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });
    const integration = {
      id: createId(),
      kind: "plex",
      name: "Plex",
      url: "http://plex.local",
    } as const;

    const { boardId, itemId, sectionId } = await createFullBoard(db, "default");
    await db.insert(integrations).values(integration);

    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrations: [integration],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
            },
          ],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: {
          with: {
            items: {
              with: {
                integrations: true,
              },
            },
          },
        },
      },
    });

    const integrationItem = await db.query.integrationItems.findFirst({
      where: eq(integrationItems.integrationId, integration.id),
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    const firstSection = expectToBeDefined(definedBoard.sections[0]);
    expect(firstSection.items.length).toBe(1);
    const firstItem = expectToBeDefined(
      firstSection.items.find((item) => item.id === itemId),
    );
    expect(firstItem.integrations.length).toBe(1);
    expect(firstItem.integrations[0]?.integrationId).toBe(integration.id);
    expect(integrationItem).toBeDefined();
  });
  it("should update section when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, sectionId } = await createFullBoard(db, "default");
    const newSectionId = createId();
    await db.insert(sections).values({
      id: newSectionId,
      kind: "category",
      name: "Before",
      position: 1,
      boardId,
    });

    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "category",
          position: 1,
          name: "Test",
          items: [],
        },
        {
          id: newSectionId,
          kind: "category",
          name: "After",
          position: 0,
          items: [],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: true,
      },
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(2);
    const firstSection = expectToBeDefined(
      definedBoard.sections.find((section) => section.id === sectionId),
    );
    expect(firstSection.id).toBe(sectionId);
    expect(firstSection.kind).toBe("empty");
    expect(firstSection.position).toBe(1);
    expect(firstSection.name).toBe(null);
    const secondSection = expectToBeDefined(
      definedBoard.sections.find((section) => section.id === newSectionId),
    );
    expect(secondSection.id).toBe(newSectionId);
    expect(secondSection.kind).toBe("category");
    expect(secondSection.position).toBe(0);
    expect(secondSection.name).toBe("After");
  });
  it("should update item when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const { boardId, itemId, sectionId } = await createFullBoard(db, "default");

    await caller.save({
      boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          position: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: false },
              integrations: [],
              height: 3,
              width: 2,
              xOffset: 7,
              yOffset: 5,
            },
          ],
        },
      ],
    });

    const board = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
      with: {
        sections: {
          with: {
            items: true,
          },
        },
      },
    });

    const definedBoard = expectToBeDefined(board);
    expect(definedBoard.sections.length).toBe(1);
    const firstSection = expectToBeDefined(definedBoard.sections[0]);
    expect(firstSection.items.length).toBe(1);
    const firstItem = expectToBeDefined(
      firstSection.items.find((item) => item.id === itemId),
    );
    expect(firstItem.id).toBe(itemId);
    expect(firstItem.kind).toBe("clock");
    expect(
      SuperJSON.parse<{ is24HourFormat: boolean }>(firstItem.options)
        .is24HourFormat,
    ).toBe(false);
    expect(firstItem.height).toBe(3);
    expect(firstItem.width).toBe(2);
    expect(firstItem.xOffset).toBe(7);
    expect(firstItem.yOffset).toBe(5);
  });
  it("should fail when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: null });

    const act = async () =>
      await caller.save({
        boardId: "nonExistentBoardId",
        sections: [],
      });

    await expect(act()).rejects.toThrowError("Board not found");
  });
});

const expectInputToBeFullBoardWithName = (
  input: RouterOutputs["board"]["default"],
  props: { name: string } & Awaited<ReturnType<typeof createFullBoard>>,
) => {
  expect(input.id).toBe(props.boardId);
  expect(input.name).toBe(props.name);
  expect(input.sections.length).toBe(1);
  const firstSection = expectToBeDefined(input.sections[0]);
  expect(firstSection.id).toBe(props.sectionId);
  expect(firstSection.items.length).toBe(1);
  const firstItem = expectToBeDefined(firstSection.items[0]);
  expect(firstItem.id).toBe(props.itemId);
  expect(firstItem.kind).toBe("clock");
  if (firstItem.kind === "clock") {
    expect(firstItem.options.is24HourFormat).toBe(true);
  }
  expect(firstItem.integrations.length).toBe(1);
  const firstIntegration = expectToBeDefined(firstItem.integrations[0]);
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
