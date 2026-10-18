import { describe, expect, it } from "vitest";
import { conferenceAssetUrl } from "@/lib/conference/api";

describe("Conference asset URLs", () => {
  it("rewrites API-owned images and downloads through the same origin", () => {
    expect(conferenceAssetUrl("/api/v1/public/events/e1/cover-image")).toBe("/api/conference/public/events/e1/cover-image");
    expect(conferenceAssetUrl("https://cdn.example/e1.jpg")).toBe("https://cdn.example/e1.jpg");
  });
});
