import { CpuResourceParser } from "./cpu-resource-parser";
import { MemoryResourceParser } from "./memory-resource-parser";
import type { ResourceParser } from "./resource-parser";

export const ResourceParserFactory = {
  getParser(type: "cpu" | "memory"): ResourceParser {
    switch (type) {
      case "cpu":
        return new CpuResourceParser();
      case "memory":
        return new MemoryResourceParser();
      default:
        throw new Error(`Unsupported resource type: ${type}`);
    }
  },
};
