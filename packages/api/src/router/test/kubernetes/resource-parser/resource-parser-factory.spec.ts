import { describe, expect, it } from "vitest";

import { CpuResourceParser } from "../../../kubernetes/resource-parser/cpu-resource-parser";
import { MemoryResourceParser } from "../../../kubernetes/resource-parser/memory-resource-parser";
import { ResourceParserFactory } from "../../../kubernetes/resource-parser/resource-parser-factory";

describe("ResourceParserFactory", () => {
  it("should return a CpuResourceParser when type is 'cpu'", () => {
    const parser = ResourceParserFactory.getParser("cpu");
    expect(parser).toBeInstanceOf(CpuResourceParser);
  });

  it("should return a MemoryResourceParser when type is 'memory'", () => {
    const parser = ResourceParserFactory.getParser("memory");
    expect(parser).toBeInstanceOf(MemoryResourceParser);
  });
});
