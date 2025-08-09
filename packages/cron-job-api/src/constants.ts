export const CRON_JOB_API_PORT = parseInt(process.env.UNSAFE_CRON_JOB_PORT ?? "3002", 10);
export const CRON_JOB_API_PATH = "/trpc";
export const CRON_JOB_API_KEY_HEADER = "cron-job-api-key";
