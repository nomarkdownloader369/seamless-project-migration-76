import { expect, it } from "vitest";
import { DEFAULT_LANGUAGE, visitorLanguage } from "../lib/i18n";
it("defaults first-time visitors to Arabic", () => { expect(DEFAULT_LANGUAGE).toBe("ar"); expect(visitorLanguage(null)).toBe("ar"); });
it("preserves the visitor's saved English choice", () => { expect(visitorLanguage("en")).toBe("en"); });
it("preserves the visitor's saved Arabic choice", () => { expect(visitorLanguage("ar")).toBe("ar"); });