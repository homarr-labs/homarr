import { validate } from "node-cron";
import z from "zod";

export const cronExpressionSchema = z.string().refine((expression) => validate(expression), {
  error: "Invalid cron expression",
});
