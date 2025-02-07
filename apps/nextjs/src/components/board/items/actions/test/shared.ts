import { createId } from "@homarr/db";

import type { Board, DynamicSection, EmptySection, Item, Section } from "~/app/[locale]/boards/_types";

export class BoardMockBuilder {
  private readonly board: Board;

  constructor(board?: Partial<Omit<Board, "groupPermissions" | "userPermissions" | "sections" | "items" | "layouts">>) {
    this.board = {
      id: createId(),
      backgroundImageRepeat: "no-repeat",
      backgroundImageAttachment: "scroll",
      backgroundImageSize: "cover",
      backgroundImageUrl: null,
      primaryColor: "#ffffff",
      secondaryColor: "#000000",
      pageTitle: "Board",
      metaTitle: "Board",
      logoImageUrl: null,
      faviconImageUrl: null,
      name: "board",
      opacity: 100,
      isPublic: true,
      customCss: "",
      creatorId: createId(),
      creator: {
        id: createId(),
        image: null,
        name: "User",
      },
      groupPermissions: [],
      userPermissions: [],
      columnCount: 12,
      sections: [],
      items: [],
      layouts: [
        {
          id: createId(),
          name: "Base",
          columnCount: 12,
          breakpoint: 0,
        },
      ],
      ...board,
    };
  }

  public addEmptySection(emptySection?: Partial<EmptySection>): BoardMockBuilder {
    return this.addSection(new EmptySectionMockBuilder(emptySection).build());
  }

  public addDynamicSection(dynamicSection?: Partial<DynamicSection>): BoardMockBuilder {
    return this.addSection(new DynamicSectionMockBuilder(dynamicSection).build());
  }

  public addSection(section: Section): BoardMockBuilder {
    this.board.sections.push(section);
    return this;
  }

  public addItem(item?: Partial<Item>): BoardMockBuilder {
    this.board.items.push(new ItemMockBuilder(item).build());
    return this;
  }

  public addLayout(layout?: Partial<Board["layouts"][number]>): BoardMockBuilder {
    this.board.layouts.push(new LayoutMockBuilder(layout).build());
    return this;
  }

  public build(): Board {
    return this.board;
  }
}

export class ItemMockBuilder {
  private readonly item: Item;

  constructor(item?: Partial<Item>) {
    this.item = {
      id: createId(),
      kind: "app",
      options: {},
      layouts: [],
      integrationIds: [],
      advancedOptions: {
        customCssClasses: [],
      },
      ...item,
    } satisfies Item;
  }

  public addLayout(layout?: Partial<Item["layouts"][0]>): ItemMockBuilder {
    this.item.layouts.push({
      layoutId: "1",
      height: 1,
      width: 1,
      xOffset: 0,
      yOffset: 0,
      sectionId: "0",
      ...layout,
    } satisfies Item["layouts"][0]);
    return this;
  }

  public build(): Item {
    return this.item;
  }
}

export class LayoutMockBuilder {
  private readonly layout: Board["layouts"][number];

  constructor(layout?: Partial<Board["layouts"][number]>) {
    this.layout = {
      id: createId(),
      name: "Base",
      columnCount: 12,
      breakpoint: 0,
      ...layout,
    } satisfies Board["layouts"][0];
  }

  public build(): Board["layouts"][0] {
    return this.layout;
  }
}

export class EmptySectionMockBuilder {
  private readonly section: EmptySection;

  constructor(section?: Partial<EmptySection>) {
    this.section = {
      id: createId(),
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
      ...section,
    } satisfies EmptySection;
  }

  public build(): EmptySection {
    return this.section;
  }
}

export class DynamicSectionMockBuilder {
  private readonly section: DynamicSection;

  constructor(section?: Partial<DynamicSection>) {
    this.section = {
      id: createId(),
      kind: "dynamic",
      layouts: [],
      ...section,
    } satisfies DynamicSection;
  }

  public addLayout(layout?: Partial<DynamicSection["layouts"][0]>): DynamicSectionMockBuilder {
    this.section.layouts.push({
      layoutId: "1",
      height: 1,
      width: 1,
      xOffset: 0,
      yOffset: 0,
      parentSectionId: "0",
      ...layout,
    } satisfies DynamicSection["layouts"][0]);
    return this;
  }

  public build(): DynamicSection {
    return this.section;
  }
}
