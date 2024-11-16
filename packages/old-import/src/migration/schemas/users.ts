import { z } from "zod";

export const oldmarrImportCredentialsUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  emailVerified: z.date().nullable(),
  image: z.string().nullable(),
  password: z.string(),
  salt: z.string(),
  isAdmin: z.boolean(),
  isOwner: z.boolean(),
  settings: z.object({
    colorScheme: z.enum(["light", "dark", "environment"]),
    defaultBoard: z.string(),
    firstDayOfWeek: z.enum(["monday", "saturday", "sunday"]).transform((value) => {
      switch (value) {
        case "monday":
          return 1;
        case "saturday":
          return 5;
        case "sunday":
          return 0;
        default:
          return 1;
      }
    }),
    replacePingWithIcons: z.boolean(),
  }),
});

export type OldmarrImportCredentialsUser = z.infer<typeof oldmarrImportCredentialsUserSchema>;
