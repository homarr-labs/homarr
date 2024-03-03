import { Injectable } from "@nestjs/common";

import { db } from "@homarr/db";

@Injectable()
export class DatabaseService {
  get() {
    return db;
  }
}
