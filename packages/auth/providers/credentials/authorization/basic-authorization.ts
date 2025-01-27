import bcrypt from "bcrypt";
import type { z } from "zod";

import type { Database } from "@homarr/db";
import { and, eq } from "@homarr/db";
import { users } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import type { validation } from "@homarr/validation";

export const authorizeWithBasicCredentialsAsync = async (
  db: Database,
  credentials: z.infer<typeof validation.user.signIn>,
) => {
  const user = await db.query.users.findFirst({
    where: and(eq(users.name, credentials.name.toLowerCase()), eq(users.provider, "credentials")),
  });

  if (!user?.password) {
    logger.info(`user ${credentials.name} was not found`);
    return null;
  }

  logger.info(`user ${user.name} is trying to log in. checking password...`);
  const isValidPassword = await bcrypt.compare(credentials.password, user.password);

  if (!isValidPassword) {
    logger.warn(`password for user ${user.name} was incorrect`);
    return null;
  }

  logger.info(`user ${user.name} successfully authorized`);

  return {
    id: user.id,
    name: user.name,
  };
};
