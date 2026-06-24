import { describe, expect, it } from "vitest";
import {
  AI_SUMMARY_UNAVAILABLE_MESSAGE,
  classifyAiSummaryUnavailableReason,
  isAiSummaryUnavailableError,
  parseMatchSummaryApiFailure,
} from "@/lib/ai/match-summary/match-summary-availability";

describe("isAiSummaryUnavailableError", () => {
  it("detects OLLAMA_UNAVAILABLE and OLLAMA_TIMEOUT", () => {
    expect(isAiSummaryUnavailableError("OLLAMA_UNAVAILABLE")).toBe(true);
    expect(isAiSummaryUnavailableError("OLLAMA_TIMEOUT")).toBe(true);
  });

  it("returns false for builder errors", () => {
    expect(isAiSummaryUnavailableError("MATCH_NOT_FINISHED")).toBe(false);
    expect(isAiSummaryUnavailableError("INVALID_JSON")).toBe(false);
  });
});

describe("parseMatchSummaryApiFailure", () => {
  it("returns friendly message and input on Ollama failure", () => {
    const input = {
      version: "match-summary-v1",
      partido_id: "abc",
      match: {
        home_name: "A",
        away_name: "B",
        score_home: 1,
        score_away: 0,
      },
      timeline: [],
      statistics: null,
    };
    const result = parseMatchSummaryApiFailure({
      ok: false,
      error: "OLLAMA_UNAVAILABLE",
      input,
    });
    expect(result.unavailable).toBe(true);
    expect(result.message).toBe(AI_SUMMARY_UNAVAILABLE_MESSAGE);
    expect(result.input?.partido_id).toBe("abc");
    expect(result.reason).toBe("ollama_unavailable");
  });

  it("classifies network failures", () => {
    const result = parseMatchSummaryApiFailure({}, true);
    expect(result.unavailable).toBe(true);
    expect(result.reason).toBe("network");
  });
});

describe("classifyAiSummaryUnavailableReason", () => {
  it("maps timeout code", () => {
    expect(classifyAiSummaryUnavailableReason("OLLAMA_TIMEOUT")).toBe(
      "ollama_timeout",
    );
  });
});
