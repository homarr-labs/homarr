import type { DayOfWeek } from "@mantine/dates";
import { z } from "zod";

import { colorSchemes } from "@homarr/definitions";
import type { TranslationObject } from "@homarr/translation";

import { zodEnumFromArray } from "./enums";
import { createCustomErrorParams } from "./form/i18n";

const usernameSchema = z.string().min(3).max(255);

const regexCheck = (regex: RegExp) => (value: string) => regex.test(value);
export const passwordRequirements = [
  { check: (value) => value.length >= 8, value: "length" },
  { check: regexCheck(/[a-z]/), value: "lowercase" },
  { check: regexCheck(/[A-Z]/), value: "uppercase" },
  { check: regexCheck(/\d/), value: "number" },
  { check: regexCheck(/[$&+,:;=?@#|'<>.^*()%!-]/), value: "special" },
] satisfies {
  check: (value: string) => boolean;
  value: keyof TranslationObject["user"]["field"]["password"]["requirement"];
}[];

const passwordSchema = z
  .string()
  .min(8)
  .max(255)
  .refine(
    (value) => {
      return passwordRequirements.every((requirement) => requirement.check(value));
    },
    {
      params: createCustomErrorParams({
        key: "passwordRequirements",
        params: {},
      }),
    },
  );

const addConfirmPasswordRefinement = <TObj extends { password: string; confirmPassword: string }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodObject<any, "strip", z.ZodTypeAny, TObj>,
) => {
  return schema.refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    params: createCustomErrorParams({
      key: "passwordsDoNotMatch",
      params: {},
    }),
  });
};

const baseCreateUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  email: z.string().email().or(z.string().length(0).optional()),
  groupIds: z.array(z.string()),
});

const createUserSchema = addConfirmPasswordRefinement(baseCreateUserSchema);

const initUserSchema = addConfirmPasswordRefinement(baseCreateUserSchema.omit({ groupIds: true }));

const signInSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
});

const registrationSchema = addConfirmPasswordRefinement(
  z.object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  }),
);

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

const baseChangePasswordSchema = z.object({
  previousPassword: z.string().min(1),
  password: passwordSchema,
  confirmPassword: z.string(),
  userId: z.string(),
});

const changePasswordSchema = addConfirmPasswordRefinement(baseChangePasswordSchema.omit({ userId: true }));

const changePasswordApiSchema = addConfirmPasswordRefinement(baseChangePasswordSchema);

const changeHomeBoardSchema = z.object({
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
});

const changeSearchPreferencesSchema = z.object({
  defaultSearchEngineId: z.string().min(1).nullable(),
  openInNewTab: z.boolean(),
});

const changeColorSchemeSchema = z.object({
  colorScheme: zodEnumFromArray(colorSchemes),
});

const firstDayOfWeekSchema = z.object({
  firstDayOfWeek: z.custom<DayOfWeek>((value) => z.number().min(0).max(6).safeParse(value).success),
});

const pingIconsEnabledSchema = z.object({
  pingIconsEnabled: z.boolean(),
});

export const userSchemas = {
  signIn: signInSchema,
  registration: registrationSchema,
  registrationApi: registrationSchemaApi,
  init: initUserSchema,
  create: createUserSchema,
  baseCreate: baseCreateUserSchema,
  password: passwordSchema,
  editProfile: editProfileSchema,
  changePassword: changePasswordSchema,
  changeHomeBoards: changeHomeBoardSchema,
  changeSearchPreferences: changeSearchPreferencesSchema,
  changePasswordApi: changePasswordApiSchema,
  changeColorScheme: changeColorSchemeSchema,
  firstDayOfWeek: firstDayOfWeekSchema,
  pingIconsEnabled: pingIconsEnabledSchema,
};
