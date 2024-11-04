import { GenericContainer, Wait } from "testcontainers";
import { describe, expect, test } from "vitest";

import { createHomarrContainer } from "./shared/create-homarr-container";

describe("Health checks", () => {
  test("ready and live should return 200 OK", async () => {
    // Arrange
    const homarrContainer = await createHomarrContainer().start();

    // Act
    const readyResponse = await fetch(`http://localhost:${homarrContainer.getMappedPort(7575)}/api/health/ready`);
    const liveResponse = await fetch(`http://localhost:${homarrContainer.getMappedPort(7575)}/api/health/live`);

    // Assert
    expect(readyResponse.status).toBe(200);
    expect(liveResponse.status).toBe(200);
  }, 20_000);
});
