import { Controller, Get, Inject } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  async getHello(): Promise<string> {
    return await this.appService.getHello();
  }

  @Get("/random")
  getRandom(): string {
    return Math.random().toString();
  }
}
