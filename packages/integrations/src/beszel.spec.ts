import { describe, test } from "vitest";

import { BeszelIntegration } from "./beszel/beszel-integration";

describe("authenticate beszel", () => {
  test("pocketbase", async () => {
    const integration = new BeszelIntegration({
      id: "new",
      name: "Beszel",
      decryptedSecrets: [],
      url: "http://localhost:8090",
    });

    const systems = await integration.getSystemsAsync();
    console.log(systems.length);

    const firstSystem = systems.at(0);
    if (!firstSystem) throw new Error("no system found");

    const systemDetails = await integration.getSystemDetailsAsync(firstSystem.id);

    //const test = await pb.collection("user_settings").getFirstListItem(`user='${user.record.id}'`);

    console.log(JSON.stringify(systemDetails, null, 2));
  });
});
