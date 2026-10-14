import { z } from "zod/v4";

export {
  userCreateSchema,
  userEditProfileSchema,
  userChangePasswordApiSchema,
  userPreferencesPatchSchema,
  userPreferencesSchema,
  passwordRequirements,
} from "../../../../../packages/validation/src/user";
export {
  groupCreateSchema,
  groupUpdateSchema,
  groupSavePartialSettingsSchema,
  groupSavePositionsSchema,
  groupSavePermissionsSchema,
} from "../../../../../packages/validation/src/group";

export const avatarSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9/+]+=*$/)
  .max(350000)
  .nullable();

export function validationMessage(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  return issues.map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`).join("; ");
}
