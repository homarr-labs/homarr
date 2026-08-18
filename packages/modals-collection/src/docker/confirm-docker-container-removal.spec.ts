import { describe, expect, test, vi } from "vitest";

import { createDockerRemovalConfirmation } from "./confirm-docker-container-removal";

describe("createDockerRemovalConfirmation", () => {
  test("does not remove containers before explicit confirmation", () => {
    const remove = vi.fn();
    const t = vi.fn((key: string, values?: Record<string, string>) => `${key}:${JSON.stringify(values)}`);

    const confirmation = createDockerRemovalConfirmation([{ name: "sonarr" }, { name: "radarr" }], t as never, remove);

    expect(remove).not.toHaveBeenCalled();
    expect(confirmation.title).toContain('"count":"2"');
    expect(confirmation.children).toContain('"names":"sonarr, radarr"');

    confirmation.onConfirm();
    expect(remove).toHaveBeenCalledOnce();
  });
});
