import { logger } from "@homarr/log";

export const sendPingRequestAsync = async (url: string) => {
  try {
    return await fetch(url).then((response) => ({ statusCode: response.status }));
  } catch (error) {
    logger.error(error);
    if (error instanceof Error) {
      return { error: error.message };
    }

    if (typeof error === "string") {
      return { error };
    }

    return { error: "Unknown error" };
  }
};
