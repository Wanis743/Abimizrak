import { describe, expect, it } from "vitest";

import {
  getDirection,
  interpolate,
  isLocale,
  messages,
  resolveLocale,
} from "./index";

describe("locale primitives", () => {
  it("accepts exactly the supported locales", () => {
    expect(["en", "ar", "fr", "es"].every(isLocale)).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("resolves supported locales and falls back to English", () => {
    expect(resolveLocale("ar")).toBe("ar");
    expect(resolveLocale("invalid")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("uses RTL only for Arabic", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("es")).toBe("ltr");
  });

  it("interpolates named values and preserves unknown placeholders", () => {
    expect(interpolate("Hello, {name}!", { name: "Sam" })).toBe(
      "Hello, Sam!",
    );
    expect(interpolate("{count} of {total}", { count: 2 })).toBe(
      "2 of {total}",
    );
  });

  it("keeps every translated dictionary in parity with English", () => {
    const canonicalKeys = Object.keys(messages.en).sort();

    expect(Object.keys(messages.ar).sort()).toEqual(canonicalKeys);
    expect(Object.keys(messages.fr).sort()).toEqual(canonicalKeys);
    expect(Object.keys(messages.es).sort()).toEqual(canonicalKeys);
  });
});
