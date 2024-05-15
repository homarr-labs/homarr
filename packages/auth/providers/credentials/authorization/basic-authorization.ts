import bcrypt from "bcrypt";

import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { validation, z } from "@homarr/validation";

export const authorizeWithBasicCredentials = async (
  db: Database,
  credentials: z.infer<typeof validation.user.signIn>,
) => {
  const user = await db.query.users.findFirst({
    where: eq(users.name, credentials.name),
  });

  if (!user?.password) {
    logger.info(`user ${credentials.name} was not found`);
    return null;
  }

  logger.info(`user ${user.name} is trying to log in. checking password...`);
  const isValidPassword = await bcrypt.compare(
    credentials.password,
    user.password,
  );

  if (!isValidPassword) {
    logger.info(`password for user ${user.name} was incorrect`);
    return null;
  }

  logger.info(`user ${user.name} successfully authorized`);

  return {
    id: user.id,
    name: user.name,
  };
};
