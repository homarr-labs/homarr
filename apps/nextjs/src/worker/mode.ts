/** The hosted frontend renders a browser workspace instead of reading a local backend. */
export const isWorkerFrontend = () => process.env.HOMARR_FRONTEND_MODE === "workers";
