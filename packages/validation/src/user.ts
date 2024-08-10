import { z } from "zod";

import { createCustomErrorParams } from "./form/i18n";

const usernameSchema = z.string().min(3).max(255);
const passwordSchema = z.string().min(8).max(255);

const confirmPasswordRefine = [
  (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    params: createCustomErrorParams("passwordsDoNotMatch"),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
] satisfies [(args: any) => boolean, unknown];

const createUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    email: z.string().email().or(z.string().length(0).optional()),
  })
  .refine(confirmPasswordRefine[0], confirmPasswordRefine[1]);

const initUserSchema = createUserSchema;

const signInSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
  credentialType: z.enum(["basic", "ldap"]),
});

const registrationSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(confirmPasswordRefine[0], confirmPasswordRefine[1]);

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
    previousPassword: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(confirmPasswordRefine[0], confirmPasswordRefine[1]);

const changePasswordApiSchema = changePasswordSchema.and(z.object({ userId: z.string() }));

const changeHomeBoardSchema = z.object({
  homeBoardId: z.string().min(1),
});

export const userSchemas = {
  signIn: signInSchema,
  registration: registrationSchema,
  registrationApi: registrationSchemaApi,
  init: initUserSchema,
  create: createUserSchema,
  password: passwordSchema,
  editProfile: editProfileSchema,
  changePassword: changePasswordSchema,
  changeHomeBoard: changeHomeBoardSchema,
  changePasswordApi: changePasswordApiSchema,
};
