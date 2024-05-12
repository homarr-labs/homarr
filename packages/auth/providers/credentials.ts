import type Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcrypt";

import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const createCredentialsConfiguration = (db: Database) =>
  ({
    type: "credentials",
    name: "Credentials",
    credentials: {
      name: {
        label: "Username",
        type: "text",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    // eslint-disable-next-line no-restricted-syntax
    async authorize(credentials) {
      const data = await validation.user.signIn.parseAsync(credentials);

      const user = await db.query.users.findFirst({
        where: eq(users.name, data.name),
      });

      if (!user?.password) {
        console.log(`user ${data.name} was not found`);
        return null;
      }

      console.log(
        `user ${user.name} is trying to log in. checking password...`,
      );
      const isValidPassword = await bcrypt.compare(
        data.password,
        user.password,
      );

      if (!isValidPassword) {
        console.log(`password for user ${user.name} was incorrect`);
        return null;
      }

      console.log(`user ${user.name} successfully authorized`);

      return {
        id: user.id,
        name: user.name,
      };
    },
  }) satisfies CredentialsConfiguration;
