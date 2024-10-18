import { database } from "../driver";
import { seedDataAsync } from "./seed";

seedDataAsync(database)
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.log("Seed failed\n\t", err);
    process.exit(1);
  });
