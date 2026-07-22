import { describe, expect, test } from "vitest";

import { parseTennisResponse } from "./tennis-mapping";

// Trimmed from a real api.livetennisapi.com /matches response.
const liveMatch = {
  id: 21631,
  status: "live",
  tournament: "M15 Kursumlijska Banja 10",
  round: "M15 Kursumlijska Banja 10 - 1/16-finals",
  surface: "clay",
  is_doubles: false,
  scheduled_time: "2026-07-22T09:00:00Z",
  players: {
    p1: { id: 4980, name: "Tito Chavez", country: "esp", ranking: 1192 },
    p2: { id: 12543, name: "Didrik Liljekvist", country: "swe", ranking: null },
  },
  score: {
    games: [
      [2, 6, 2],
      [6, 3, 3],
    ],
    sets: [1, 1],
    points: ["40", "AD"],
    server: 1,
    is_tiebreak: false,
  },
};

const upcomingMatch = {
  id: 21660,
  status: "upcoming",
  tournament: "W15 Las Palmas de Gran Canaria",
  round: "W15 Las Palmas de Gran Canaria - 1/16-finals",
  surface: "clay",
  is_doubles: false,
  scheduled_time: "2026-07-22T12:00:00Z",
  players: {
    p1: { id: 3037, name: "Victoria O'Hayon Gomez", country: "esp", ranking: 969 },
    p2: { id: 11828, name: "Naomi McKenzie", country: "aus", ranking: 1273 },
  },
  score: null,
};

describe("parseTennisResponse", () => {
  test("splits the per-set game arrays onto the two players", () => {
    const { matches } = parseTennisResponse({ data: [liveMatch] });
    const [match] = matches;

    expect(match?.players[0].games).toStrictEqual([2, 6, 2]);
    expect(match?.players[1].games).toStrictEqual([6, 3, 3]);
    expect(match?.players[0].sets).toBe(1);
    expect(match?.players[1].sets).toBe(1);
  });

  test("maps the current game points and the serving player", () => {
    const { matches } = parseTennisResponse({ data: [liveMatch] });
    const [match] = matches;

    expect(match?.players[0].points).toBe("40");
    expect(match?.players[1].points).toBe("AD");
    // server: 1 refers to p1, which is index 0.
    expect(match?.players[0].isServing).toBe(true);
    expect(match?.players[1].isServing).toBe(false);
  });

  test("uppercases country codes and keeps a missing ranking null", () => {
    const { matches } = parseTennisResponse({ data: [liveMatch] });
    const [match] = matches;

    expect(match?.players[0].country).toBe("ESP");
    expect(match?.players[1].ranking).toBeNull();
  });

  test("handles upcoming matches that have no score yet", () => {
    const { matches } = parseTennisResponse({ data: [upcomingMatch] });
    const [match] = matches;

    expect(match?.players[0].games).toStrictEqual([]);
    expect(match?.players[0].points).toBeNull();
    expect(match?.players[0].isServing).toBe(false);
    expect(match?.scheduledTime).toBe("2026-07-22T12:00:00Z");
  });

  test("tolerates unknown extra fields and missing optional fields", () => {
    const { matches } = parseTennisResponse({
      data: [{ id: 1, status: "live", players: { p1: { id: 1, name: "A" }, p2: { id: 2, name: "B" } }, extra: true }],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.tournament).toBeNull();
    expect(matches[0]?.surface).toBeNull();
    expect(matches[0]?.players[0].country).toBeNull();
  });

  test("rejects a payload that is not shaped like the API response", () => {
    expect(() => parseTennisResponse({ data: [{ id: "not-a-number" }] })).toThrow();
  });
});
