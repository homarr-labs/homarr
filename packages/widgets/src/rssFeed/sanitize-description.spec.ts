import { describe, expect, test } from "vitest";

import { sanitizeFeedDescription } from "./sanitize-description";

describe("sanitizeFeedDescription", () => {
  test("keeps basic formatting while removing executable markup", () => {
    const description =
      '<p onclick="alert(1)" aria-hidden="true" data-tracking="yes">News <strong>today</strong><script>alert(2)</script><img src="tracker"></p>';

    expect(sanitizeFeedDescription(description)).toBe("<p>News <strong>today</strong></p>");
  });
});
