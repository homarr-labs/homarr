import { z } from "zod";

const usernameSchema = z.string().min(3).max(255);
const passwordSchema = z.string().min(8).max(255);

const initUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const signInSchema = z.object({
  name: z.string(),
  password: z.string(),
});

export const userSchemas = {
  signIn: signInSchema,
  init: initUserSchema,
  password: passwordSchema,
};
