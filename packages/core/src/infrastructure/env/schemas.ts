import { z } from "zod/v4";

const trueStrings = ["1", "yes", "t", "true"];
const falseStrings = ["0", "no", "f", "false"];

export const createBooleanSchema = (defaultValue: boolean) =>
  z
    .stringbool({
      truthy: trueStrings,
      falsy: falseStrings,
      case: "insensitive",
    })
    .default(defaultValue);

export const createDurationSchema = (defaultValue: `${number}${"s" | "m" | "h" | "d"}`) => {
  const defaultMultipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  } as const;

  return z
    .string()
    .regex(/^\d+[smhd]?$/)
    .default(defaultValue)
    .transform((duration) => {
      const unit = duration.at(-1) as keyof typeof defaultMultipliers | undefined;
      const multiplier = unit ? defaultMultipliers[unit] : undefined;

      if (multiplier) {
        return Number(duration.slice(0, -1)) * multiplier;
      }

      return Number(duration);
    });
};
