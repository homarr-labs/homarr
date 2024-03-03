import { NestFactory } from "@nestjs/core";
import { WinstonModule } from "nest-winston";

import { logger } from "@homarr/log";

import { AppModule } from "./app.module";

const winstonLoggerModule = WinstonModule.createLogger({
  instance: logger,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLoggerModule,
  });
  await app.listen(3100);
}

// @ts-expect-error this has no type yet
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if (import.meta.env.PROD) {
  void bootstrap();
}

export const viteNodeApp = NestFactory.create(AppModule, {
  logger: winstonLoggerModule,
});
