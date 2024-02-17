import { db } from "@homarr/db";
import { users } from "@homarr/db/schema/sqlite";
import { CronJob } from "quirrel/next-app";

export const sampleCronJob = CronJob(
  "api/cron",
  ["*/1 * * * *", "Europe/Berlin"],
  async () => {
    console.info("A minute has passed");
    const userList = await db.select().from(users);
    console.log(userList);
  },
);

export const POST = sampleCronJob;
