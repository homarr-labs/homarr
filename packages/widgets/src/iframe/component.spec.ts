import { describe, expect, it } from "vitest";

import { getAllowedPermissions, getFrameTitle, getSandboxFlags, isSupportedProtocol } from "./component";

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

  it("accepts HTTP URLs and same-origin paths", () => {
    expect(isSupportedProtocol("https://example.com")).toBe(true);
    expect(isSupportedProtocol("/api/demo-assets/overview")).toBe(true);
    expect(isSupportedProtocol("//evil.example")).toBe(false);
    expect(isSupportedProtocol("/\\evil.example")).toBe(false);
    expect(isSupportedProtocol("javascript:alert(1)")).toBe(false);
    expect(isSupportedProtocol("not a url")).toBe(false);
  });

  it("creates a display title without credentials, paths, or query parameters", () => {
    expect(getFrameTitle("https://user:secret@example.com/private?token=sensitive")).toBe("example.com");
  });

  it("keeps a non-default port in the display title", () => {
    expect(getFrameTitle("http://user:secret@example.com:8080/private?token=sensitive")).toBe("example.com:8080");
  });
});
