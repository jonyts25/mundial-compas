import { describe, expect, it } from "vitest";
import {
  detectScoreDecreaseSide,
  scoreDecreased,
} from "@/lib/api-football/goal-notify-state";
import {
  cancelledGoalNotifyKey,
  isCancelledGoalAlreadyNotified,
  buildCancelledGoalNotifyMetadata,
} from "@/lib/api-football/goal-cancel-notify-state";

describe("scoreDecreased", () => {
  it("detects local score decrease", () => {
    expect(scoreDecreased({ local: 2, away: 1 }, 1, 1)).toBe(true);
    expect(detectScoreDecreaseSide({ local: 2, away: 1 }, { local: 1, away: 1 })).toBe(
      "local",
    );
  });

  it("detects visitante score decrease", () => {
    expect(scoreDecreased({ local: 1, away: 2 }, 1, 1)).toBe(true);
    expect(detectScoreDecreaseSide({ local: 1, away: 2 }, { local: 1, away: 1 })).toBe(
      "visitante",
    );
  });

  it("returns false when score unchanged or increased", () => {
    expect(scoreDecreased({ local: 1, away: 0 }, 1, 1)).toBe(false);
    expect(scoreDecreased({ local: 0, away: 0 }, 1, 0)).toBe(false);
  });
});

describe("cancelled goal notify dedup", () => {
  it("deduplicates by notify key in metadata", () => {
    const key = cancelledGoalNotifyKey(
      { local: 2, away: 1 },
      { local: 1, away: 1 },
      "local",
    );
    expect(isCancelledGoalAlreadyNotified({}, key)).toBe(false);
    const meta = buildCancelledGoalNotifyMetadata({}, [key]);
    expect(isCancelledGoalAlreadyNotified(meta, key)).toBe(true);
  });
});
