import { z } from "zod/v4";

import { createEnv, runtimeEnvWithPrefix } from "@homarr/core/infrastructure/env";

export const backupEnv = createEnv({
  server: {
    // File system path where backups will be stored
    // Defaults to ./backups-archive in development, /appdata/backups-archive in production
    STORAGE_PATH: z
      .string()
      .default(process.env.NODE_ENV === "production" ? "/appdata/backups-archive" : "./backups-archive"),

    // Maximum backup file size in megabytes
    MAX_SIZE_MB: z.coerce.number().positive("BACKUP_MAX_SIZE_MB must be greater than 0").default(100),

    // Number of backup files to retain
    RETENTION_COUNT: z.coerce
      .number()
      .int("BACKUP_RETENTION_COUNT must be an integer")
      .positive("BACKUP_RETENTION_COUNT must be greater than 0")
      .default(10),
  },
  runtimeEnv: runtimeEnvWithPrefix("BACKUP_"),
});
