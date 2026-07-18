import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  localeOptions,
  messages,
  resolvePreferredLocale,
  translate,
} from "./i18n";

const expectedLocales = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "es",
  "fr",
  "de",
  "pt-BR",
  "ko",
];

describe("ProofLab localization contract", () => {
  it("ships the nine launch locales in a stable order", () => {
    expect(localeOptions.map((option) => option.code)).toEqual(expectedLocales);
    expect(new Set(localeOptions.map((option) => option.nativeLabel)).size).toBe(
      expectedLocales.length,
    );
  });

  it.each([
    [["zh-Hant-HK", "en-US"], "zh-TW"],
    [["zh-SG"], "zh-CN"],
    [["ja-JP"], "ja"],
    [["es-MX"], "es"],
    [["fr-CA"], "fr"],
    [["de-AT"], "de"],
    [["pt-PT"], "pt-BR"],
    [["ko-KR"], "ko"],
  ])("matches browser preferences %j to %s", (preferences, expected) => {
    expect(resolvePreferredLocale(preferences)).toBe(expected);
  });

  it("falls back to English for missing or unsupported preferences", () => {
    expect(resolvePreferredLocale([])).toBe(DEFAULT_LOCALE);
    expect(resolvePreferredLocale(["xx-YY"])).toBe(DEFAULT_LOCALE);
  });

  it("keeps every catalog complete and non-empty", () => {
    const englishKeys = Object.keys(messages.en).sort();

    for (const option of localeOptions) {
      const catalog = messages[option.code];
      expect(Object.keys(catalog).sort()).toEqual(englishKeys);
      expect(Object.values(catalog).every((value) => value.trim().length > 0)).toBe(
        true,
      );
    }
  });

  it("provides real localized interface copy instead of English aliases", () => {
    for (const option of localeOptions.filter((option) => option.code !== "en")) {
      expect(messages[option.code]["hero.titleLead"]).not.toBe(
        messages.en["hero.titleLead"],
      );
      expect(messages[option.code]["actions.replayRun"]).not.toBe(
        messages.en["actions.replayRun"],
      );
    }
  });

  it("formats named values without evaluating arbitrary template content", () => {
    expect(translate("en", "workspace.position", { index: 2 })).toBe(
      "Reproducibility workspace / 002",
    );
    expect(translate("zh-CN", "audit.viewFindings", { count: 6 })).toContain(
      "6",
    );
  });
});
