import { describe, expect, it } from "vitest";

import { getAllowedPermissions, getSandboxFlags, isSupportedProtocol } from "./component";

const permissions = {
  allowFullScreen: true,
  allowPayment: false,
  allowAutoPlay: true,
  allowMicrophone: false,
  allowCamera: false,
  allowGeolocation: false,
  allowModals: true,
};

describe("iframe policy", () => {
  it("keeps sandbox-only modal permission out of Permissions Policy", () => {
    expect(getAllowedPermissions(permissions)).toBe("fullscreen *; autoplay *");
    expect(getSandboxFlags(permissions)).toContain("allow-modals");
  });

  it("accepts only HTTP protocols", () => {
    expect(isSupportedProtocol("https://example.com")).toBe(true);
    expect(isSupportedProtocol("javascript:alert(1)")).toBe(false);
    expect(isSupportedProtocol("not a url")).toBe(false);
  });
});
