import { expect, test } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { createQueryHydrationSnapshot } from "./query-hydration";

test("leaving a prepared Board releases frozen values and keeps live clients usable", () => {
  const shared = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  shared.setQueryData(["history"], "captured");
  const snapshot = createQueryHydrationSnapshot(shared);
  const widget = snapshot.createClient();
  shared.setQueryData(["history"], "live");
  expect(widget.client.getQueryData(["history"])).toBe("captured");

  snapshot.dispose();
  expect(widget.client.getQueryData(["history"])).toBe("live");
  shared.removeQueries({ queryKey: ["history"] });
  widget.resume();
  expect(widget.client.getQueryData(["history"])).toBeUndefined();
  shared.clear();
});
