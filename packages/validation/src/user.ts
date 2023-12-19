import { z } from "zod";

const usernameSchema = z.string().min(3).max(255);
const passwordSchema = z.string().min(8).max(255);

export const initUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const signInSchema = z.object({
  name: z.string(),
  password: z.string(),
});
