// File: packages/api/src/router/test/kubernetes/resource-parser/memory-resource-parser.spec.ts
import { describe, expect, it } from "vitest";

import { MemoryResourceParser } from "../../../kubernetes/resource-parser/memory-resource-parser";

const BYTES_IN_GIB = 1024 ** 3; // 1 GiB in bytes
const BYTES_IN_MIB = 1024 ** 2; // 1 MiB in bytes
const BYTES_IN_KIB = 1024; // 1 KiB in bytes
const KI = "Ki";
const MI = "Mi";
const GI = "Gi";
const TI = "Ti";
const PI = "Pi";

describe("MemoryResourceParser", () => {
  const parser = new MemoryResourceParser();

  it("should parse values without unit as bytes", () => {
    expect(parser.parse("42")).toBe(42);
  });

  it("should parse values with Ki unit correctly", () => {
    expect(parser.parse(`1024${KI}`)).toBe(1024 * BYTES_IN_KIB);
  });

  it("should parse values with Mi unit correctly", () => {
    expect(parser.parse(`512${MI}`)).toBe(512 * BYTES_IN_MIB);
  });

  it("should parse values with Gi unit correctly", () => {
    expect(parser.parse(`2${GI}`)).toBe(2 * BYTES_IN_GIB);
  });

  it("should parse values with Ti unit correctly", () => {
    expect(parser.parse(`1${TI}`)).toBe(1024 * 1024 * BYTES_IN_GIB);
  });

  it("should parse values with Pi unit correctly", () => {
    expect(parser.parse(`1${PI}`)).toBe(1024 * 1024 * 1024 * BYTES_IN_GIB);
  });

  it("should parse decimal values correctly", () => {
    expect(parser.parse("1.5Gi")).toBe(1.5 * BYTES_IN_GIB);
  });

  it("should throw error for invalid format", () => {
    expect(() => parser.parse("invalid")).toThrow("Invalid memory resource value");
    expect(() => parser.parse("100Xi")).toThrow("Invalid memory resource value");
    expect(() => parser.parse("")).toThrow("Invalid memory resource value");
  });
});