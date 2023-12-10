## Quick Start

To get it running, follow the steps below:

### 1. Setup dependencies

```bash
# Install dependencies
pnpm i

# Configure environment variables
# There is an `.env.example` in the root directory you can use for reference
cp .env.example .env

# Push the Drizzle schema to the database
pnpm db:push
```

### 2. Start application

Run `pnpm dev` at the project root folder to start the application.

> **Note**
> The authentication will currently fail with the message `TypeError: Failed to construct 'URL': Invalid base URL`. This issue will be resolved in the next next-auth beta release. You can track the issue [here](https://github.com/nextauthjs/next-auth/issues/9279).

You can find the initial account creation page at [http://localhost:3000/init/user](http://localhost:3000/init/user).
After that you can login at [http://localhost:3000/auth/login](http://localhost:3000/auth/login).

### 3. When it's time to add a new package

To add a new package, simply run `pnpm turbo gen init` in the monorepo root. This will prompt you for a package name as well as if you want to install any dependencies to the new package (of course you can also do this yourself later).

The generator sets up the `package.json`, `tsconfig.json` and a `index.ts`, as well as configures all the necessary configurations for tooling around your package such as formatting, linting and typechecking. When the package is created, you're ready to go build out the package.

## References

The stack originates from [create-t3-app](https://github.com/t3-oss/create-t3-app).

A [blog post](https://jumr.dev/blog/t3-turbo) where I wrote how to migrate a T3 app into this.
