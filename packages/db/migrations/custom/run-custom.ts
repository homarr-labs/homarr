import { applyCustomMigrationsAsync } from ".";
import { database } from "../../driver";

applyCustomMigrationsAsync(database)
  .then(() => {
    console.log("Custom migrations applied successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log("Failed to apply custom migrations\n\t", err);
    process.exit(1);
  });
