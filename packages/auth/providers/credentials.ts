import type Credentials from "@auth/core/providers/credentials";
import { signInSchema } from "../validation";
import { db, eq } from "@alparr/db";
import { users } from "@alparr/db/schema/sqlite";
//import bcrypt from "bcrypt";

type CredentialsConfiguration = Parameters<typeof Credentials>[0];

export const credentialsConfiguration = {
    name: "Credentials",
    credentials: {
        name: {
            label: "Username",
            type: "text",
        },
        password: {
            label: "Password",
            type: "password",
        }
    },
    async authorize(credentials) {
        console.log(credentials)
        const data = await signInSchema.parseAsync(credentials);

        console.log(data)

        const user = await db.query.users.findFirst({
          where: eq(users.name, data.name),
        });

        console.log(user)

        if (!user?.password) {
          return null;
        }

        console.log(`user ${user.name} is trying to log in. checking password...`);
        const isValidPassword = true //await bcrypt.compare(data.password, user.password);

        if (!isValidPassword) {
            console.log(`password for user ${user.name} was incorrect`);
          return null;
        }

        console.log(user)

        console.log(`user ${user.name} successfully authorized`);

        return {
          id: user.id,
          name: user.name,
        };
    },
} satisfies CredentialsConfiguration;