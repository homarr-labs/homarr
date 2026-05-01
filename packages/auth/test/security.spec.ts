import { describe, expect, it } from "vitest";

import { comparePasswordsAsync, hashPasswordAsync } from "../security";

describe("hashPassword should return a hash", () => {
  it("should return a hash", async () => {
    const password = "password";
    const result = await hashPasswordAsync(password);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(55);
    expect(result).not.toEqual(password);
  });
  it("should return a different hash each time", async () => {
    const password = "password";
    const password2 = "another password";

    const result1 = await hashPasswordAsync(password);
    const result2 = await hashPasswordAsync(password2);

    expect(result1).not.toEqual(result2);
  });
  it("should return a different hash for the same password with different salts", async () => {
    const password = "password";

    const result1 = await hashPasswordAsync(password);
    const result2 = await hashPasswordAsync(password);

    expect(result1).not.toEqual(result2);
  });
});

describe("comparePasswordsAsync should compare passwords correctly", () => {
  it("should return true for matching passwords", async () => {
    // Arrange
    const password = "password";
    const hash = await hashPasswordAsync(password);

    // Act
    const result = await comparePasswordsAsync(password, hash);

    // Assert
    expect(result).toBe(true);
  });
  it("should return false for non-matching passwords", async () => {
    // Arrange
    const password = "password";
    const wrongPassword = "wrongpassword";
    const hash = await hashPasswordAsync(password);

    // Act
    const result = await comparePasswordsAsync(wrongPassword, hash);

    // Assert
    expect(result).toBe(false);
  });
});
