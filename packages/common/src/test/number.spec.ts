import { describe, expect, it } from "vitest";

import { formatByteRate, formatBytes, formatBytesPair } from "../number";

describe("formatBytes", () => {
  it("returns bytes for small values", () => {
    expect(formatBytes(0)).toBe("0.0 B");
    expect(formatBytes(1)).toBe("1.0 B");
    expect(formatBytes(1023)).toBe("1023.0 B");
  });

  it("scales binary units correctly", () => {
    expect(formatBytes(1024)).toBe("1.0 KiB");
    expect(formatBytes(1024 ** 2)).toBe("1.0 MiB");
    expect(formatBytes(1024 ** 3)).toBe("1.0 GiB");
    expect(formatBytes(1024 ** 4)).toBe("1.0 TiB");
  });

  it("scales decimal units when requested", () => {
    expect(formatBytes(1000, { unit: "decimal" })).toBe("1.0 KB");
    expect(formatBytes(1000 ** 2, { unit: "decimal" })).toBe("1.0 MB");
    expect(formatBytes(1000 ** 3, { unit: "decimal" })).toBe("1.0 GB");
    expect(formatBytes(1000 ** 4, { unit: "decimal" })).toBe("1.0 TB");
  });

  it("formats a typical storage value with one decimal", () => {
    expect(formatBytes(985828802560)).toBe("918.1 GiB");
    expect(formatBytes(985828802560, { unit: "decimal" })).toBe("985.8 GB");
  });

  it("caps at the largest unit to avoid overflow", () => {
    expect(formatBytes(Number.MAX_SAFE_INTEGER)).toMatch(/PiB$/);
  });

  it("returns the zero value for negative or non-finite input", () => {
    expect(formatBytes(-1)).toBe("0.0 B");
    expect(formatBytes(Number.NaN)).toBe("0.0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0.0 B");
  });
});

describe("formatBytesPair", () => {
  it("picks the unit of the larger total and applies it to both values", () => {
    const { used, available } = formatBytesPair(985828802560, 2858736793190);
    expect(used).toBe("0.9 TiB");
    expect(available).toBe("2.6 TiB");
  });

  it("uses a smaller unit when both values fit in it", () => {
    const { used, available } = formatBytesPair(1024 * 1024 * 100, 1024 * 1024 * 200);
    expect(used).toBe("100.0 MiB");
    expect(available).toBe("200.0 MiB");
  });

  it("falls back to zero when both inputs are invalid", () => {
    const { used, available } = formatBytesPair(Number.NaN, -1);
    expect(used).toBe("0.0 B");
    expect(available).toBe("0.0 B");
  });

  it("uses the same unit across both values when one is invalid", () => {
    const { used, available } = formatBytesPair(Number.NaN, 1024 ** 4);
    expect(used).toBe("0.0 TiB");
    expect(available).toBe("1.0 TiB");
  });

  it("honours the decimal unit option", () => {
    const { used, available } = formatBytesPair(500_000_000_000, 1_500_000_000_000, { unit: "decimal" });
    expect(used).toBe("0.5 TB");
    expect(available).toBe("1.5 TB");
  });
});

describe("formatByteRate", () => {
  it("appends a /s suffix to the formatted value", () => {
    expect(formatByteRate(0)).toBe("0.0 B/s");
    expect(formatByteRate(1024)).toBe("1.0 KiB/s");
    expect(formatByteRate(1024 ** 3)).toBe("1.0 GiB/s");
  });

  it("honours the decimal unit option", () => {
    expect(formatByteRate(1000, { unit: "decimal" })).toBe("1.0 KB/s");
    expect(formatByteRate(1000 ** 2, { unit: "decimal" })).toBe("1.0 MB/s");
  });

  it("returns zero for invalid input", () => {
    expect(formatByteRate(-1)).toBe("0.0 B/s");
    expect(formatByteRate(Number.NaN)).toBe("0.0 B/s");
  });
});
