import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { logger } from '@homarr/log';

const winstonLoggerModule = WinstonModule.createLogger({
  instance: logger,
});

// @ts-expect-error
if (import.meta.env.PROD) {
  async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
      logger: winstonLoggerModule,
    });
    await app.listen(3001);
  }

  bootstrap();
}

export const viteNodeApp = NestFactory.create(AppModule, {
  logger: winstonLoggerModule,
});
