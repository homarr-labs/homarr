import { closeCliDbAsync } from "./cli-db";
import { CliError } from "./errors";
import { runCliAsync } from "./router";

const mainAsync = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  const start = performance.now();

  try {
    const code = await runCliAsync(argv);
    if (code === 0) {
      const elapsed = Math.round(performance.now() - start);
      console.error(`\nDone in ${elapsed}ms`);
    }
    return code;
  } catch (error) {
    if (error instanceof CliError) {
      console.error(error.message);
      return error.exitCode;
    }

    if (error instanceof TypeError && error.message.startsWith("Unknown option")) {
      console.error(error.message);
      return 2;
    }

    console.error(error instanceof Error ? error.message : error);
    return 1;
  }
};

mainAsync()
  .then(async (code) => {
    await closeCliDbAsync();
    process.exit(code);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await closeCliDbAsync();
    process.exit(1);
  });
