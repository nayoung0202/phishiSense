import { describe, expect, it } from "vitest";
import {
  countTokenOccurrences,
  extractTemplateTokens,
  normalizeTrainingUrlPlaceholders,
} from "./templateTokens";

describe("templateTokens", () => {
  it("normalizes common TRAINING_URL typos", () => {
    expect(normalizeTrainingUrlPlaceholders("{{tranning_url}}}")).toBe("{{TRAINING_URL}}");
    expect(normalizeTrainingUrlPlaceholders("{{trainning_url}}")).toBe("{{TRAINING_URL}}");
  });

  it("extracts and counts tokens after normalization", () => {
    const html = '<a href="{{tranning_url}}}">link</a><form action="{{trainning_url}}"></form>';

    expect(extractTemplateTokens(html)).toEqual(["TRAINING_URL"]);
    expect(countTokenOccurrences(html, ["TRAINING_URL"])).toBe(2);
  });
});
