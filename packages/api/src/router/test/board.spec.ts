import SuperJSON from "superjson";
import { describe, expect, it, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { createId, eq } from "@homarr/db";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  integrationItems,
  integrations,
  items,
  sections,
  serverSettings,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { BoardPermission, GroupPermissionKey } from "@homarr/definitions";

import type { RouterOutputs } from "../..";
import { boardRouter } from "../board";
import * as boardAccess from "../board/board-access";
import { expectToBeDefined } from "./helper";

const defaultCreatorId = createId();
const defaultSession = {
  user: {
    id: defaultCreatorId,
    permissions: [],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const createRandomUserAsync = async (db: Database) => {
  const userId = createId();
  await db.insert(users).values({
    id: userId,
    homeBoardId: null,
  });
  return userId;
};

describe("getAllBoards should return all boards accessable to the current user", () => {
  test("without session it should return only public boards", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: null });

    const user1 = await createRandomUserAsync(db);
    const user2 = await createRandomUserAsync(db);

    await db.insert(boards).values([
      {
        id: createId(),
        name: "public",
        creatorId: user1,
        isPublic: true,
      },
      {
        id: createId(),
        name: "private",
        creatorId: user2,
        isPublic: false,
      },
    ]);

    // Act
    const result = await caller.getAllBoards();

    // Assert
    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe("public");
  });

  test("with session containing board-view-all permission it should return all boards", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({
      db,
      deviceType: undefined,
      session: {
        user: {
          id: defaultCreatorId,
          permissions: ["board-view-all"],
          colorScheme: "light",
        },
        expires: new Date().toISOString(),
      },
    });

    const user1 = await createRandomUserAsync(db);
    const user2 = await createRandomUserAsync(db);

    await db.insert(boards).values([
      {
        id: createId(),
        name: "public",
        creatorId: user1,
        isPublic: true,
      },
      {
        id: createId(),
        name: "private",
        creatorId: user2,
        isPublic: false,
      },
    ]);

    // Act
    const result = await caller.getAllBoards();

    // Assert
    expect(result.length).toBe(2);
    expect(result.map((board) => board.name)).toEqual(["public", "private"]);
  });

  test("with session user beeing creator it should return all private boards of them", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const user1 = await createRandomUserAsync(db);
    const user2 = await createRandomUserAsync(db);
    await db.insert(users).values({
      id: defaultCreatorId,
    });

    await db.insert(boards).values([
      {
        id: createId(),
        name: "public",
        creatorId: user1,
        isPublic: true,
      },
      {
        id: createId(),
        name: "private",
        creatorId: user2,
        isPublic: false,
      },
      {
        id: createId(),
        name: "private2",
        creatorId: defaultCreatorId,
        isPublic: false,
      },
    ]);

    // Act
    const result = await caller.getAllBoards();

    // Assert
    expect(result.length).toBe(2);
    expect(result.map(({ name }) => name)).toStrictEqual(["public", "private2"]);
  });

  test.each([["view"], ["modify"]] satisfies [BoardPermission][])(
    "with %s group board permission it should show board",
    async (permission) => {
      // Arrange
      const db = createDb();
      const caller = boardRouter.createCaller({
        db,
        deviceType: undefined,
        session: defaultSession,
      });

      const user1 = await createRandomUserAsync(db);
      const user2 = await createRandomUserAsync(db);
      await db.insert(users).values({
        id: defaultCreatorId,
      });
      const boardId = createId();

      await db.insert(boards).values([
        {
          id: createId(),
          name: "public",
          creatorId: user1,
          isPublic: true,
        },
        {
          id: boardId,
          name: "private1",
          creatorId: user2,
          isPublic: false,
        },
        {
          id: createId(),
          name: "private2",
          creatorId: user2,
          isPublic: false,
        },
      ]);

      const groupId = createId();
      await db.insert(groups).values({
        id: groupId,
        name: "group1",
      });

      await db.insert(groupMembers).values({
        userId: defaultSession.user.id,
        groupId,
      });

      await db.insert(boardGroupPermissions).values({
        groupId,
        permission,
        boardId,
      });

      // Act
      const result = await caller.getAllBoards();

      // Assert
      expect(result.length).toBe(2);
      expect(result.map(({ name }) => name)).toStrictEqual(["public", "private1"]);
    },
  );

  test.each([["view"], ["modify"]] satisfies [BoardPermission][])(
    "with %s user board permission it should show board",
    async (permission) => {
      // Arrange
      const db = createDb();
      const caller = boardRouter.createCaller({
        db,
        deviceType: undefined,
        session: defaultSession,
      });

      const user1 = await createRandomUserAsync(db);
      const user2 = await createRandomUserAsync(db);
      await db.insert(users).values({
        id: defaultCreatorId,
      });
      const boardId = createId();

      await db.insert(boards).values([
        {
          id: createId(),
          name: "public",
          creatorId: user1,
          isPublic: true,
        },
        {
          id: boardId,
          name: "private1",
          creatorId: user2,
          isPublic: false,
        },
        {
          id: createId(),
          name: "private2",
          creatorId: user2,
          isPublic: false,
        },
      ]);

      await db.insert(boardUserPermissions).values({
        userId: defaultSession.user.id,
        permission,
        boardId,
      });

      // Act
      const result = await caller.getAllBoards();

      // Assert
      expect(result.length).toBe(2);
      expect(result.map(({ name }) => name)).toStrictEqual(["public", "private1"]);
    },
  );
});

describe("createBoard should create a new board", () => {
  test("should create a new board with permission board-create", async () => {
    // Arrange
    const db = createDb();
    const session = {
      ...defaultSession,
      user: {
        ...defaultSession.user,
        permissions: ["board-create"] satisfies GroupPermissionKey[],
      },
    };
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session });

    await db.insert(users).values({
      id: defaultCreatorId,
    });

    // Act
    await caller.createBoard({ name: "newBoard", columnCount: 24, isPublic: true });

    // Assert
    const dbBoard = await db.query.boards.findFirst();
    expect(dbBoard).toBeDefined();
    expect(dbBoard?.name).toBe("newBoard");
    expect(dbBoard?.columnCount).toBe(24);
    expect(dbBoard?.isPublic).toBe(true);
    expect(dbBoard?.creatorId).toBe(defaultCreatorId);

    const dbSection = await db.query.sections.findFirst();
    expect(dbSection).toBeDefined();
    expect(dbSection?.boardId).toBe(dbBoard?.id);
    expect(dbSection?.kind).toBe("empty");
  });

  test("should throw error when user has no board-create permission", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.createBoard({ name: "newBoard", columnCount: 12, isPublic: true });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Permission denied");
  });
});

describe("rename board should rename board", () => {
  test("should rename board", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

    await db.insert(users).values({
      id: defaultCreatorId,
    });
    const boardId = createId();
    await db.insert(boards).values({
      id: boardId,
      name: "oldName",
      creatorId: defaultCreatorId,
    });

    // Act
    await caller.renameBoard({ id: boardId, name: "newName" });

    // Assert
    const dbBoard = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });
    expect(dbBoard).toBeDefined();
    expect(dbBoard?.name).toBe("newName");
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
  });

  test("should throw error when similar board name exists", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    await db.insert(users).values({
      id: defaultCreatorId,
    });
    const boardId = createId();
    await db.insert(boards).values({
      id: boardId,
      name: "oldName",
      creatorId: defaultCreatorId,
    });
    await db.insert(boards).values({
      id: createId(),
      name: "newName",
      creatorId: defaultCreatorId,
    });

    // Act
    const actAsync = async () => await caller.renameBoard({ id: boardId, name: "Newname" });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Board with similar name already exists");
  });

  test("should throw error when board not found", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.renameBoard({ id: "nonExistentBoardId", name: "newName" });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Board not found");
  });
});

describe("changeBoardVisibility should change board visibility", () => {
  test.each([["public"], ["private"]] satisfies ["private" | "public"][])(
    "should change board visibility to %s",
    async (visibility) => {
      // Arrange
      const db = createDb();
      const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
      const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

      await db.insert(users).values({
        id: defaultCreatorId,
      });
      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "board",
        creatorId: defaultCreatorId,
        isPublic: visibility === "public",
      });

      // Act
      await caller.changeBoardVisibility({
        id: boardId,
        visibility,
      });

      // Assert
      const dbBoard = await db.query.boards.findFirst({
        where: eq(boards.id, boardId),
      });
      expect(dbBoard).toBeDefined();
      expect(dbBoard?.isPublic).toBe(visibility === "public");
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
    },
  );
});

describe("deleteBoard should delete board", () => {
  test("should delete board", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

    await db.insert(users).values({
      id: defaultCreatorId,
    });
    const boardId = createId();
    await db.insert(boards).values({
      id: boardId,
      name: "board",
      creatorId: defaultCreatorId,
    });

    // Act
    await caller.deleteBoard({ id: boardId });

    // Assert
    const dbBoard = await db.query.boards.findFirst({
      where: eq(boards.id, boardId),
    });
    expect(dbBoard).toBeUndefined();
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
  });

  test("should throw error when board not found", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    // Act
    const actAsync = async () => await caller.deleteBoard({ id: "nonExistentBoardId" });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Board not found");
  });
});

describe("getHomeBoard should return home board", () => {
  test("should return user home board when user has one", async () => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const fullBoardProps = await createFullBoardAsync(db, "home");
    await db
      .update(users)
      .set({
        homeBoardId: fullBoardProps.boardId,
      })
      .where(eq(users.id, defaultCreatorId));

    // Act
    const result = await caller.getHomeBoard();

    // Assert
    expectInputToBeFullBoardWithName(result, {
      name: "home",
      ...fullBoardProps,
    });
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "view");
  });
  test("should return global home board when user doesn't have one", async () => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const fullBoardProps = await createFullBoardAsync(db, "home");
    await db.insert(serverSettings).values({
      settingKey: "board",
      value: SuperJSON.stringify({ homeBoardId: fullBoardProps.boardId }),
    });

    // Act
    const result = await caller.getHomeBoard();

    // Assert
    expectInputToBeFullBoardWithName(result, {
      name: "home",
      ...fullBoardProps,
    });
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "view");
  });
  test("should throw error when home board not configured in serverSettings", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    await createFullBoardAsync(db, "home");

    // Act
    const actAsync = async () => await caller.getHomeBoard();

    // Assert
    await expect(actAsync()).rejects.toThrowError("No home board found");
  });
});

describe("getBoardByName should return board by name", () => {
  it.each([["default"], ["something"]])("should return board by name %s when present", async (name) => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const fullBoardProps = await createFullBoardAsync(db, name);

    // Act
    const result = await caller.getBoardByName({ name });

    // Assert
    expectInputToBeFullBoardWithName(result, {
      name,
      ...fullBoardProps,
    });
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "view");
  });

  it("should throw error when not present", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    await createFullBoardAsync(db, "default");

    // Act
    const actAsync = async () => await caller.getBoardByName({ name: "nonExistentBoard" });

    // Assert
    await expect(actAsync()).rejects.toThrowError("Board not found");
  });
});

describe("savePartialBoardSettings should save general settings", () => {
  it("should save general settings", async () => {
    // Arrange
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

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
    await caller.savePartialBoardSettings({
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
    expect(dbBoard?.backgroundImageAttachment).toBe(newBackgroundImageAttachment);
    expect(dbBoard?.backgroundImageRepeat).toBe(newBackgroundImageRepeat);
    expect(dbBoard?.backgroundImageSize).toBe(newBackgroundImageSize);
    expect(dbBoard?.backgroundImageUrl).toBe(newBackgroundImageUrl);
    expect(dbBoard?.columnCount).toBe(newColumnCount);
    expect(dbBoard?.customCss).toBe(newCustomCss);
    expect(dbBoard?.opacity).toBe(newOpacity);
    expect(dbBoard?.primaryColor).toBe(newPrimaryColor);
    expect(dbBoard?.secondaryColor).toBe(newSecondaryColor);

    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });

  it("should throw error when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const actAsync = async () =>
      await caller.savePartialBoardSettings({
        pageTitle: "newPageTitle",
        metaTitle: "newMetaTitle",
        logoImageUrl: "http://logo.image/url.png",
        faviconImageUrl: "http://favicon.image/url.png",
        id: "nonExistentBoardId",
      });

    await expect(actAsync()).rejects.toThrowError("Board not found");
  });
});

describe("saveBoard should save full board", () => {
  it("should remove section when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: createId(),
          kind: "empty",
          yOffset: 0,
          xOffset: 0,
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
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it("should remove item when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const { boardId, itemId, sectionId } = await createFullBoardAsync(db, "default");

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          yOffset: 0,
          xOffset: 0,
          items: [
            {
              id: createId(),
              kind: "clock",
              options: { is24HourFormat: true },
              integrationIds: [],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
              advancedOptions: {},
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
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it("should remove integration reference when not present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    const anotherIntegration = {
      id: createId(),
      kind: "adGuardHome",
      name: "AdGuard Home",
      url: "http://localhost:3000",
    } as const;

    const { boardId, itemId, integrationId, sectionId } = await createFullBoardAsync(db, "default");
    await db.insert(integrations).values(anotherIntegration);

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          xOffset: 0,
          yOffset: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrationIds: [anotherIntegration.id],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
              advancedOptions: {},
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
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it.each([[{ kind: "empty" as const }], [{ kind: "category" as const, collapsed: false, name: "My first category" }]])(
    "should add section when present in input",
    async (partialSection) => {
      const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
      const db = createDb();
      const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

      const { boardId, sectionId } = await createFullBoardAsync(db, "default");

      const newSectionId = createId();
      await caller.saveBoard({
        id: boardId,
        sections: [
          {
            id: newSectionId,
            xOffset: 0,
            yOffset: 1,
            items: [],
            ...partialSection,
          },
          {
            id: sectionId,
            kind: "empty",
            xOffset: 0,
            yOffset: 0,
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
      const addedSection = expectToBeDefined(definedBoard.sections.find((section) => section.id === newSectionId));
      expect(addedSection).toBeDefined();
      expect(addedSection.id).toBe(newSectionId);
      expect(addedSection.kind).toBe(partialSection.kind);
      expect(addedSection.yOffset).toBe(1);
      if ("name" in partialSection) {
        expect(addedSection.name).toBe(partialSection.name);
      }
      expect(section).toBeDefined();
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
    },
  );
  it("should add item when present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");

    const newItemId = createId();
    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          yOffset: 0,
          xOffset: 0,
          items: [
            {
              id: newItemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrationIds: [],
              height: 1,
              width: 1,
              xOffset: 3,
              yOffset: 2,
              advancedOptions: {},
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
    const addedItem = expectToBeDefined(firstSection.items.find((item) => item.id === newItemId));
    expect(addedItem).toBeDefined();
    expect(addedItem.id).toBe(newItemId);
    expect(addedItem.kind).toBe("clock");
    expect(addedItem.options).toBe(SuperJSON.stringify({ is24HourFormat: true }));
    expect(addedItem.height).toBe(1);
    expect(addedItem.width).toBe(1);
    expect(addedItem.xOffset).toBe(3);
    expect(addedItem.yOffset).toBe(2);
    expect(item).toBeDefined();
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it("should add integration reference when present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    const integration = {
      id: createId(),
      kind: "plex",
      name: "Plex",
      url: "http://plex.local",
    } as const;

    const { boardId, itemId, sectionId } = await createFullBoardAsync(db, "default");
    await db.insert(integrations).values(integration);

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          xOffset: 0,
          yOffset: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: true },
              integrationIds: [integration.id],
              height: 1,
              width: 1,
              xOffset: 0,
              yOffset: 0,
              advancedOptions: {},
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
    const firstItem = expectToBeDefined(firstSection.items.find((item) => item.id === itemId));
    expect(firstItem.integrations.length).toBe(1);
    expect(firstItem.integrations[0]?.integrationId).toBe(integration.id);
    expect(integrationItem).toBeDefined();
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it("should update section when present in input", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const { boardId, sectionId } = await createFullBoardAsync(db, "default");
    const newSectionId = createId();
    await db.insert(sections).values({
      id: newSectionId,
      kind: "category",
      name: "Before",
      yOffset: 1,
      xOffset: 0,
      boardId,
    });

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "category",
          yOffset: 1,
          xOffset: 0,
          name: "Test",
          collapsed: true,
          items: [],
        },
        {
          id: newSectionId,
          kind: "category",
          name: "After",
          yOffset: 0,
          xOffset: 0,
          collapsed: false,
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
    const firstSection = expectToBeDefined(definedBoard.sections.find((section) => section.id === sectionId));
    expect(firstSection.id).toBe(sectionId);
    expect(firstSection.kind).toBe("empty");
    expect(firstSection.yOffset).toBe(1);
    expect(firstSection.name).toBe(null);
    const secondSection = expectToBeDefined(definedBoard.sections.find((section) => section.id === newSectionId));
    expect(secondSection.id).toBe(newSectionId);
    expect(secondSection.kind).toBe("category");
    expect(secondSection.yOffset).toBe(0);
    expect(secondSection.name).toBe("After");
  });
  it("should update item when present in input", async () => {
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const { boardId, itemId, sectionId } = await createFullBoardAsync(db, "default");

    await caller.saveBoard({
      id: boardId,
      sections: [
        {
          id: sectionId,
          kind: "empty",
          yOffset: 0,
          xOffset: 0,
          items: [
            {
              id: itemId,
              kind: "clock",
              options: { is24HourFormat: false },
              integrationIds: [],
              height: 3,
              width: 2,
              xOffset: 7,
              yOffset: 5,
              advancedOptions: {},
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
    const firstItem = expectToBeDefined(firstSection.items.find((item) => item.id === itemId));
    expect(firstItem.id).toBe(itemId);
    expect(firstItem.kind).toBe("clock");
    expect(SuperJSON.parse<{ is24HourFormat: boolean }>(firstItem.options).is24HourFormat).toBe(false);
    expect(firstItem.height).toBe(3);
    expect(firstItem.width).toBe(2);
    expect(firstItem.xOffset).toBe(7);
    expect(firstItem.yOffset).toBe(5);
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "modify");
  });
  it("should fail when board not found", async () => {
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });

    const actAsync = async () =>
      await caller.saveBoard({
        id: "nonExistentBoardId",
        sections: [],
      });

    await expect(actAsync()).rejects.toThrowError("Board not found");
  });
});

describe("getBoardPermissions should return board permissions", () => {
  test("should return board permissions", async () => {
    // Arrange
    const db = createDb();
    const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
    const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

    const user1 = await createRandomUserAsync(db);
    const user2 = await createRandomUserAsync(db);
    await db.insert(users).values({
      id: defaultCreatorId,
    });

    const boardId = createId();
    await db.insert(boards).values({
      id: boardId,
      name: "board",
      creatorId: defaultCreatorId,
    });

    await db.insert(boardUserPermissions).values([
      {
        userId: user1,
        permission: "view",
        boardId,
      },
      {
        userId: user2,
        permission: "modify",
        boardId,
      },
    ]);

    const groupId = createId();
    await db.insert(groups).values({
      id: groupId,
      name: "group1",
    });

    await db.insert(boardGroupPermissions).values({
      groupId,
      permission: "view",
      boardId,
    });

    await db.insert(groupPermissions).values({
      groupId,
      permission: "admin",
    });

    // Act
    const result = await caller.getBoardPermissions({ id: boardId });

    // Assert
    expect(result.groups).toEqual([{ group: { id: groupId, name: "group1" }, permission: "view" }]);
    expect(result.users).toEqual(
      expect.arrayContaining([
        {
          user: { id: user1, name: null, image: null },
          permission: "view",
        },
        {
          user: { id: user2, name: null, image: null },
          permission: "modify",
        },
      ]),
    );
    expect(result.inherited).toEqual([{ group: { id: groupId, name: "group1" }, permission: "admin" }]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
  });
});

describe("saveUserBoardPermissions should save user board permissions", () => {
  test.each([["view"], ["modify"]] satisfies [BoardPermission][])(
    "should save user board permissions",
    async (permission) => {
      // Arrange
      const db = createDb();
      const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
      const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

      const user1 = await createRandomUserAsync(db);
      await db.insert(users).values({
        id: defaultCreatorId,
      });

      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "board",
        creatorId: defaultCreatorId,
      });

      // Act
      await caller.saveUserBoardPermissions({
        entityId: boardId,
        permissions: [
          {
            principalId: user1,
            permission,
          },
        ],
      });

      // Assert
      const dbUserPermission = await db.query.boardUserPermissions.findFirst({
        where: eq(boardUserPermissions.userId, user1),
      });
      expect(dbUserPermission).toBeDefined();
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
    },
  );
});

describe("saveGroupBoardPermissions should save group board permissions", () => {
  test.each([["view"], ["modify"]] satisfies [BoardPermission][])(
    "should save group board permissions",
    async (permission) => {
      // Arrange
      const db = createDb();
      const caller = boardRouter.createCaller({ db, deviceType: undefined, session: defaultSession });
      const spy = vi.spyOn(boardAccess, "throwIfActionForbiddenAsync");

      await db.insert(users).values({
        id: defaultCreatorId,
      });

      const groupId = createId();
      await db.insert(groups).values({
        id: groupId,
        name: "group1",
      });

      const boardId = createId();
      await db.insert(boards).values({
        id: boardId,
        name: "board",
        creatorId: defaultCreatorId,
      });

      // Act
      await caller.saveGroupBoardPermissions({
        entityId: boardId,
        permissions: [
          {
            principalId: groupId,
            permission,
          },
        ],
      });

      // Assert
      const dbGroupPermission = await db.query.boardGroupPermissions.findFirst({
        where: eq(boardGroupPermissions.groupId, groupId),
      });
      expect(dbGroupPermission).toBeDefined();
      expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), "full");
    },
  );
});

const expectInputToBeFullBoardWithName = (
  input: RouterOutputs["board"]["getHomeBoard"],
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
  expect(firstItem.integrationIds.length).toBe(1);
  const firstIntegration = expectToBeDefined(firstItem.integrationIds[0]);
  expect(firstIntegration).toBe(props.integrationId);
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
    yOffset: 0,
    xOffset: 0,
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
