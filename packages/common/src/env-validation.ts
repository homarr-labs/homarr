import { z } from "zod";

const trueStrings = ["1", "yes", "t", "true"];
const falseStrings = ["0", "no", "f", "false"];

export const createBooleanSchema = (defaultValue: boolean) =>
  z
    .string()
    .default(defaultValue.toString())
    .transform((value, ctx) => {
      const normalized = value.trim().toLowerCase();
      if (trueStrings.includes(normalized)) return true;
      if (falseStrings.includes(normalized)) return false;

      throw new Error(`Invalid boolean value for ${ctx.path.join(".")}`);
    });

export const createDurationSchema = (defaultValue: `${number}${"s" | "m" | "h" | "d"}`) =>
  z
    .string()
    .regex(/^\d+[smhd]?$/)
    .default(defaultValue)
    .transform((duration) => {
      const lastChar = duration[duration.length - 1] as "s" | "m" | "h" | "d";
      if (!isNaN(Number(lastChar))) {
        return Number(defaultValue);
      }

      const multipliers = {
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24,
      };
      const numberDuration = Number(duration.slice(0, -1));
      const multiplier = multipliers[lastChar];

      return numberDuration * multiplier;
    });

export const shouldSkipEnvValidation = () =>
  Boolean(process.env.CI) || Boolean(process.env.SKIP_ENV_VALIDATION) || process.env.npm_lifecycle_event === "lint";
