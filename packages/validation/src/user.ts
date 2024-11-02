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

const confirmPasswordRefine = [
  (data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword,
  {
    path: ["confirmPassword"],
    params: createCustomErrorParams({
      key: "passwordsDoNotMatch",
      params: {},
    }),
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
  password: passwordSchema,
  editProfile: editProfileSchema,
  changePassword: changePasswordSchema,
  changeHomeBoard: changeHomeBoardSchema,
  changePasswordApi: changePasswordApiSchema,
  changeColorScheme: changeColorSchemeSchema,
  firstDayOfWeek: firstDayOfWeekSchema,
  pingIconsEnabled: pingIconsEnabledSchema,
};
