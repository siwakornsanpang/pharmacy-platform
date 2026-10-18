import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/navigation/safe-return-to";

describe("safeReturnTo", () => {
  it("keeps internal meeting checkout paths", () => {
    expect(safeReturnTo("/meeting/event-id/checkout?from=detail")).toBe("/meeting/event-id/checkout?from=detail");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeReturnTo("https://evil.example/path")).toBe("/home");
    expect(safeReturnTo("//evil.example/path")).toBe("/home");
    expect(safeReturnTo("/\\evil.example/path")).toBe("/home");
  });
});
