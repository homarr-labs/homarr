import { db } from "@homarr/db";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DatabaseService {
    get() {
        return db;
    }
}