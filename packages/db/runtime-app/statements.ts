import type { HomarrDatabase } from "../driver";
import type {
  NativeCredentialEvidence,
  NativeCredentialPolicyConfiguration,
} from "../runtime-auth-credential/contracts";
import { readNativeCredentialPolicySync } from "../runtime-auth-credential/statements";
import { apps } from "../schema/sqlite";
import { AppMutationPermissionError, captureAppMutation } from "./contracts";
import type { AppMutation, AppMutationResult } from "./contracts";

export const executeAppMutationSync = (
  database: HomarrDatabase,
  mutation: AppMutation,
  credential: NativeCredentialEvidence,
  configuration: NativeCredentialPolicyConfiguration,
): AppMutationResult => {
  const captured = captureAppMutation(mutation);
  const policy = readNativeCredentialPolicySync(database, credential, configuration);
  if (!policy.permissions.includes("app-create")) throw new AppMutationPermissionError();
  const insertValues = captured.values;
  database.insert(apps).values(insertValues).run();
  return { appId: insertValues.id, ...insertValues };
};
