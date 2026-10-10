import type { z } from "zod/v4";

import { userSignInSchema } from "@homarr/validation/user";

import { comparePasswordsAsync } from "../../security";
import type { AuthorizedCredentialsIdentity, BasicVerifierResources } from "./contracts";

export const authorizeWithBasicCredentialsAsync = async (
  { repository, logger }: BasicVerifierResources,
  credentials: z.infer<typeof userSignInSchema>,
): Promise<AuthorizedCredentialsIdentity | null> => {
  const user = await repository.findUserByName({ name: credentials.name.toLowerCase(), provider: "credentials" });

  if (!user?.password) {
    logger.info("User not found", { userName: credentials.name });
    return null;
  }

  logger.info("User is trying to log in. Checking password...", { userName: user.name });
  const isValidPassword = await comparePasswordsAsync(credentials.password, user.password);

  if (!isValidPassword) {
    logger.warn("Password for user was incorrect", { userName: user.name });
    return null;
  }

  logger.info("User successfully authorized", { userName: user.name });

  return { id: user.id, name: user.name };
};

export const verifyBasicCredentialsAsync = async (resources: BasicVerifierResources, input: unknown) => {
  const credentials = await userSignInSchema.parseAsync(input);
  return authorizeWithBasicCredentialsAsync(resources, credentials);
};
