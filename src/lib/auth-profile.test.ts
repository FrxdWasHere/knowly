import { describe, expect, it } from "vitest";
import { getAuthProfilePrefill } from "./auth-profile";

describe("auth profile prefill", () => {
  it("uses the provider's first name and a Google profile photo", () => {
    expect(
      getAuthProfilePrefill({
        given_name: "Mina",
        full_name: "Mina Santos",
        picture: "https://lh3.googleusercontent.com/avatar",
      }),
    ).toEqual({
      firstName: "Mina",
      avatarUrl: "https://lh3.googleusercontent.com/avatar",
    });
  });

  it("falls back to the full name and rejects non-Google or insecure photo URLs", () => {
    expect(
      getAuthProfilePrefill({ name: "Alex Doe", picture: "http://example.com/avatar" }),
    ).toEqual({ firstName: "Alex", avatarUrl: null });
    expect(
      getAuthProfilePrefill({ name: "Alex Doe", picture: "https://notgoogleusercontent.com/x" }),
    ).toEqual({ firstName: "Alex", avatarUrl: null });
  });

  it("ignores malformed provider metadata", () => {
    expect(getAuthProfilePrefill(null)).toEqual({ firstName: null, avatarUrl: null });
  });
});
