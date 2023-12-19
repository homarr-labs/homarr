import { z } from "zod";

const usernameSchema = z.string().min(3).max(255);
const passwordSchema = z.string().min(8).max(255);

const initUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    path: ["repeatPassword"],
    message: "Passwords do not match",
  });

const signInSchema = z.object({
  name: z.string(),
  password: z.string(),
});

export const userSchemas = {
  signIn: signInSchema,
  init: initUserSchema,
}