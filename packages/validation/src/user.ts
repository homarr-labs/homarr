import { z } from "zod";

const usernameSchema = z.string().min(3).max(255);
const passwordSchema = z.string().min(8).max(255);

const createUserSchema = z
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

const initUserSchema = createUserSchema;

const signInSchema = z.object({
  name: z.string(),
  password: z.string(),
});

const registrationSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const registrationSchemaApi = registrationSchema.and(
  z.object({
    inviteId: z.string(),
    token: z.string(),
  }),
);

const editProfileSchema = z.object({
  id: z.string(),
  name: usernameSchema,
  email: z
    .string()
    .email()
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value))
    .optional()
    .nullable(),
});

const changePasswordSchema = z
  .object({
    previousPassword: z.string(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

const changePasswordApiSchema = changePasswordSchema.and(
  z.object({ userId: z.string() }),
);

export const userSchemas = {
  signIn: signInSchema,
  registration: registrationSchema,
  registrationApi: registrationSchemaApi,
  init: initUserSchema,
  create: createUserSchema,
  password: passwordSchema,
  editProfile: editProfileSchema,
  changePassword: changePasswordSchema,
  changePasswordApi: changePasswordApiSchema,
};
