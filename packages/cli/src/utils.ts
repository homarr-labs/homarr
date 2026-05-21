import { randomBytes } from "node:crypto";

export const generateSecureRandomToken = (size: number) => randomBytes(size).toString("hex");

export const printTable = (headers: string[], rows: string[][]) => {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)),
  );

  const formatRow = (cells: string[]) =>
    cells.map((cell, i) => cell.padEnd(widths[i]!)).join("  ");

  console.log(formatRow(headers));
  console.log(widths.map((w) => "─".repeat(w)).join("  "));
  for (const row of rows) {
    console.log(formatRow(row));
  }
};
