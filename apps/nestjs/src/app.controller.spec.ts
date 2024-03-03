import { describe, expect, it, beforeEach, vitest } from "vitest";
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from "./db/database.service";

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, DatabaseService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', async () => {
      // arrange
      vitest.spyOn(appService, 'getHello').mockReturnValueOnce(Promise.resolve('ABC'));

      // act
      const a = await appController.getHello();

      // assert
      expect(a).toBe('ABC');
      expect(appService.getHello).toHaveBeenCalledTimes(1);
    });
  });
});
