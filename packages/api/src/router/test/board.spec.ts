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
  users,
} from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import type { RouterOutputs } from "../..";
import { boardRouter } from "../board";
import * as boardAccess from "../board/board-access";
import { expectToBeDefined } from "./helper";

const defaultCreatorId = createId();
const defaultSession = {
  user: {
    id: defaultCreatorId,
  },
  expires: new Date().toISOString(),
} satisfies Session;

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

describe("default should return default board", () => {
  it("should return default board", async () => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const fullBoardProps = await createFullBoardAsync(db, "default");

    // Act
    const result = await caller.default();

    // Assert
    expectInputToBeFullBoardWithName(result, {
      name: "default",
      ...fullBoardProps,
    });
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-view",
    );
  });
});

describe("byName should return board by name", () => {
  it.each([["default"], ["something"]])(
    "should return board by name %s when present",
    async (name) => {
      // Arrange
      const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
      const db = createDb();
      const caller = boardRouter.createCaller({ db, session: defaultSession });

      const fullBoardProps = await createFullBoardAsync(db, name);

      // Act
      const result = await caller.byName({ name });

      // Assert
      expectInputToBeFullBoardWithName(result, {
        name,
        ...fullBoardProps,
      });
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        "board-view",
      );
    },
  );

  it("should throw error when not present", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });
    await createFullBoardAsync(db, "default");

    // Act
    const act = async () => await caller.byName({ name: "nonExistentBoard" });

    // Assert
    await expect(act()).rejects.toThrowError("Board not found");
  });
});

describe("savePartialSettings should save general settings", () => {
  it("should save general settings", async () => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const newPageTitle = "newPageTitle";
    const newMetaTitle = "newMetaTitle";
    const newLogoImageUrl = "http://logo.image/url.png";
    const newFaviconImageUrl = "http://favicon.image/url.png";
    const newBackgroundImageAttachment = "scroll";
    const newBackgroundImageSize = "cover";
    const newBackgroundImageRepeat = "repeat";
    const newBackgroundImageUrl = "http://background.image/url.png";
    const newColumnCount = 2;
    const newCustomCss = "body { background-color: blue; }";
    const newOpacity = 0.8;
    const newPrimaryColor = "#0000ff";
    const newSecondaryColor = "#ff00ff";

    const { boardId } = await createFullBoardAsync(db, "default");

    // Act
    await caller.savePartialSettings({
      pageTitle: newPageTitle,
      metaTitle: newMetaTitle,
      logoImageUrl: newLogoImageUrl,
      faviconImageUrl: newFaviconImageUrl,
      backgroundImageAttachment: newBackgroundImageAttachment,
      backgroundImageRepeat: newBackgroundImageRepeat,
      backgroundImageSize: newBackgroundImageSize,
      backgroundImageUrl: newBackgroundImageUrl,
      columnCount: newColumnCount,
      customCss: newCustomCss,
      opacity: newOpacity,
      primaryColor: newPrimaryColor,
      secondaryColor: newSecondaryColor,
      id: boardId,
    });

    // Assert
    const dbBoard = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });
    expect(dbBoard).toBeDefined();
    expect(dbBoard?.pageTitle).toBe(newPageTitle);
    expect(dbBoard?.metaTitle).toBe(newMetaTitle);
    expect(dbBoard?.logoImageUrl).toBe(newLogoImageUrl);
    expect(dbBoard?.faviconImageUrl).toBe(newFaviconImageUrl);
    expect(dbBoard?.backgroundImageAttachment).toBe(
      newBackgroundImageAttachment,
    );
    expect(dbBoard?.backgroundImageRepeat).toBe(newBackgroundImageRepeat);
    expect(dbBoard?.backgroundImageSize).toBe(newBackgroundImageSize);
    expect(dbBoard?.backgroundImageUrl).toBe(newBackgroundImageUrl);
    expect(dbBoard?.columnCount).toBe(newColumnCount);
    expect(dbBoard?.customCss).toBe(newCustomCss);
    expect(dbBoard?.opacity).toBe(newOpacity);
    expect(dbBoard?.primaryColor).toBe(newPrimaryColor);
    expect(dbBoard?.secondaryColor).toBe(newSecondaryColor);

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });

  it("should throw error when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const act = async () =>
      await caller.savePartialSettings({
        pageTitle: "newPageTitle",
        metaTitle: "newMetaTitle",
        logoImageUrl: "http://logo.image/url.png",
        faviconImageUrl: "http://favicon.image/url.png",
        id: "nonExistentBoardId",
      });

    await expect(act()).rejects.toThrowError("Board not found");
  });
});

describe("save should save full board", () => {
  it("should remove section when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");

    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should remove item when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, itemId, sectionId } = await createFullBoardAsync(
      db,
      "default",
    );

    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should remove integration reference when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });
    const anotherIntegration = {
      id: createId(),
      kind: "adGuardHome",
      name: "AdGuard Home",
      url: "http://localhost:3000",
    } as const;

    const { boardId, itemId, integrationId, sectionId } =
      await createFullBoardAsync(db, "default");
    await db.insert(integrations).values(anotherIntegration);

    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it.each([
    [{ kind: "empty" as const }],
    [{ kind: "category" as const, name: "My first category" }],
  ])("should add section when present in input", async (partialSection) => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");

    const newSectionId = createId();
    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should add item when present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");

    const newItemId = createId();
    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should add integration reference when present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });
    const integration = {
      id: createId(),
      kind: "plex",
      name: "Plex",
      url: "http://plex.local",
    } as const;

    const { boardId, itemId, sectionId } = await createFullBoardAsync(
      db,
      "default",
    );
    await db.insert(integrations).values(integration);

    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should update section when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");
    const newSectionId = createId();
    await db.insert(sections).values({
      id: newSectionId,
      kind: "category",
      name: "Before",
      position: 1,
      boardId,
    });

    await caller.save({
      id: boardId,
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
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const { boardId, itemId, sectionId } = await createFullBoardAsync(
      db,
      "default",
    );

    await caller.save({
      id: boardId,
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
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "board-change",
    );
  });
  it("should fail when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, session: defaultSession });

    const act = async () =>
      await caller.save({
        id: "nonExistentBoardId",
        sections: [],
      });

    await expect(act()).rejects.toThrowError("Board not found");
  });
});

const expectInputToBeFullBoardWithName = (
  input: RouterOutputs["board"]["default"],
  props: { name: string } & Awaited<ReturnType<typeof createFullBoardAsync>>,
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

const createFullBoardAsync = async (db: Database, name: string) => {
  await db.insert(users).values({
    id: defaultCreatorId,
  });

  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name,
    creatorId: defaultCreatorId,
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
