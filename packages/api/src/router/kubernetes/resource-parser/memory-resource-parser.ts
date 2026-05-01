import { z } from "zod";

const memoryUnitSchema = z.enum(["Ki", "Mi", "Gi", "Ti", "Pi"]);
type MemoryUnit = z.infer<typeof memoryUnitSchema>;

const unitToBytes: Record<MemoryUnit, number> = {
  Ki: 1024 ** 1,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
};

export class MemoryResourceParser {
  parse(value: string): number {
    const match = value.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|Pi)?$/);
    if (!match) {
      throw new Error(`Invalid memory resource value: ${value}`);
    }

    const [, amountStr, unit] = match;
    const amount = parseFloat(amountStr);
    const multiplier = unit ? unitToBytes[unit as MemoryUnit] : 1; // Treat unitless as bytes

    return amount * multiplier;
  }
}