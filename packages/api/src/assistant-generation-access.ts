import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { env } from "@homarr/common/env";

const getGenerationTelemetrySecret = () =>
  Buffer.from(
    hkdfSync("sha256", Buffer.from(env.SECRET_ENCRYPTION_KEY, "hex"), "", "assistant-generation-telemetry", 32),
  );

const getGenerationTelemetryPayload = ({
  userId,
  threadId,
  generationId,
}: {
  userId: string;
  threadId: string;
  generationId: string;
}) => `${userId}\0${threadId}\0${generationId}`;

export const createAssistantGenerationAccessToken = (input: {
  userId: string;
  threadId: string;
  generationId: string;
}) =>
  createHmac("sha256", getGenerationTelemetrySecret()).update(getGenerationTelemetryPayload(input)).digest("base64url");

export const verifyAssistantGenerationAccessToken = (
  input: { userId: string; threadId: string; generationId: string },
  accessToken: string,
) => {
  const expected = Buffer.from(createAssistantGenerationAccessToken(input));
  const actual = Buffer.from(accessToken);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
