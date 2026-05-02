// File: packages/api/src/router/kubernetes/resource-parser/memory-resource-parser.ts
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
    if (typeof value !== 'string') {
      throw new Error(`Invalid memory resource value: ${value}. Expected a string`);
    }

    const match = value.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|Pi)?$/);
    if (!match) {
      throw new Error(`Invalid memory resource value: ${value}. Expected format: '<number>(<unit>)?' where <unit> is one of Ki, Mi, Gi, Ti, Pi`);
    }

    const [, amountStr, unit] = match;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      throw new Error(`Invalid memory resource value: ${value}. Failed to parse amount as a number`);
    }

    const multiplier = unit ? unitToBytes[unit as MemoryUnit] : 1;

    return amount * multiplier;
  }
}