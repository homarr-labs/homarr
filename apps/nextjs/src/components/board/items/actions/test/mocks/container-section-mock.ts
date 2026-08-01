import { createId } from "@homarr/common";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

import type { ContainerSection } from "~/app/[locale]/boards/_types";

type ContainerSectionMock = Omit<Partial<ContainerSection>, "options"> & {
  options?: Partial<ContainerSection["options"]>;
};

export class ContainerSectionMockBuilder {
  private readonly section: ContainerSection;

  constructor(section?: ContainerSectionMock) {
    this.section = {
      id: section?.id ?? createId(),
      kind: "container",
      collapsed: section?.collapsed ?? false,
      layouts: section?.layouts ?? [],
      options: containerSectionOptionsSchema.parse(section?.options),
    };
  }

  public addLayout(layout?: Partial<ContainerSection["layouts"][0]>): ContainerSectionMockBuilder {
    this.section.layouts.push({
      layoutId: layout?.layoutId ?? createId(),
      parentSectionId: layout?.parentSectionId ?? createId(),
      xOffset: layout?.xOffset ?? 0,
      yOffset: layout?.yOffset ?? 0,
      width: layout?.width ?? 1,
      height: layout?.height ?? 1,
    });
    return this;
  }

  public build(): ContainerSection {
    return structuredClone(this.section);
  }
}
