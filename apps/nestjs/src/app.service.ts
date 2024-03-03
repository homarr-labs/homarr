import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "./db/database.service";

@Injectable()
export class AppService {
  constructor(
    // @ts-expect-error decorators are not correctly handled yet
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {}

  async getHello(): Promise<string> {
    const users = await this.databaseService.get().query.users.findMany();
    return JSON.stringify(users);
  }
}
