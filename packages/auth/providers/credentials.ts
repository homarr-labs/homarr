import type Credentials from "@auth/core/providers/credentials";
import bcrypt from "bcrypt";

import { db, eq } from "@alparr/db";
import { users } from "@alparr/db/schema/sqlite";
import { signInSchema } from "@alparr/validation";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const credentialsConfiguration = {
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
  async authorize(credentials) {
    const data = await signInSchema.parseAsync(credentials);

    const user = await db.query.users.findFirst({
      where: eq(users.name, data.name),
    });

    if (!user?.password) {
      return null;
    }

    console.log(`user ${user.name} is trying to log in. checking password...`);
    const isValidPassword = await bcrypt.compare(data.password, user.password);

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
} satisfies CredentialsConfiguration;
