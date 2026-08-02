import { createId } from "@homarr/common";
import { dynamicSectionOptionsSchema } from "@homarr/validation/shared";

import type { DynamicSection } from "~/app/[locale]/boards/_types";

type DynamicSectionMock = Omit<Partial<DynamicSection>, "options"> & {
  options?: Partial<DynamicSection["options"]>;
};

export class DynamicSectionMockBuilder {
  private readonly section: DynamicSection;

  constructor(section?: DynamicSectionMock) {
    this.section = {
      id: createId(),
      kind: "dynamic",
      layouts: [],
      ...section,
      collapsed: section?.collapsed ?? false,
      options: dynamicSectionOptionsSchema.parse(section?.options),
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
