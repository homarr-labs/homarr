import { describe, expect, test } from "vitest";

import { formatLinkedDockerContainer, parseLinkedDockerContainer } from "./container-option";

describe("linked docker container option", () => {
  test.each([
    { endpointId: "socket:/var/run/docker.sock", name: "sonarr" },
    { endpointId: "tcp:192.168.1.10:2375", name: "my_app.v2-1" },
    { endpointId: "remote@office", name: "plex" },
  ])("round-trips $name on $endpointId", (container) => {
    expect(parseLinkedDockerContainer(formatLinkedDockerContainer(container))).toEqual(container);
  });

  test.each(["", "sonarr", "@socket:/var/run/docker.sock", "sonarr@"])("rejects %j", (value) => {
    expect(parseLinkedDockerContainer(value)).toBeNull();
  });
});
