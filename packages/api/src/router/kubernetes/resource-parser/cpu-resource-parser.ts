import type { ResourceParser } from "./resource-parser";

export class CpuResourceParser implements ResourceParser {
  parse(value: string): number {
    if (!value.length) {
      return NaN;
    }

    value = value.replace(/,/g, "").trim();

    const [, numericValue, unit = ""] = /^([0-9.]+)\s*([a-zA-Z]*)$/.exec(value) ?? [];

    if (numericValue === undefined) {
      return NaN;
    }

    const parsedValue = parseFloat(numericValue);

    if (isNaN(parsedValue)) {
      return NaN;
    }

    switch (unit.toLowerCase()) {
      case "n": // nano-cores (billionths of a core)
        return parsedValue / 1_000_000_000; // 1 NanoCPU = 1/1,000,000,000 cores
      case "u": // micro-cores (millionths of a core)
        return parsedValue / 1_000_000; // 1 MicroCPU = 1/1,000,000 cores
      case "m": // milli-cores
        return parsedValue / 1_000; // 1 milli-core = 1/1000 cores
      case "k": // thousands of cores
        return parsedValue * 1_000; // 1 thousand-core = 1000 cores
      default: // cores (no unit)
        return parsedValue;
    }
  }
}
