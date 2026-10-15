import { describe, expect, test } from "bun:test";
import { prizes, type PrizeId } from "./prizes.ts";
import {
  houseHighScores,
  noHighScores,
  pointsPerTicket,
  startingTokens,
  ticketsFor,
  ticketsPerToken,
  Wallet,
  type WalletProgress,
} from "./wallet.ts";

function wallet(p: Partial<WalletProgress> = {}): Wallet {
  return new Wallet({ highScores: noHighScores, tokens: startingTokens, tickets: 0, prizes: [], ...p });
}

function counts(w: Wallet): { tokens: number; tickets: number } {
  return { tokens: w.tokens, tickets: w.tickets };
}

describe("a new Wallet", () => {
  test("holds a New game's 5 tokens, no tickets, no prizes and no high score", () => {
    expect(new Wallet().toProgress()).toEqual({
      highScores: { sweetSam: 0, firefly: 0, brassMonkey: 0 },
      tokens: 5,
      tickets: 0,
      prizes: [],
    });
    expect(startingTokens).toBe(5);
  });

  test("keeps restored prizes once each, in catalogue order", () => {
    expect(wallet({ prizes: ["sleepyBees", "honeyJar", "sleepyBees"] }).prizes).toEqual(["honeyJar", "sleepyBees"]);
    expect(wallet({ prizes: ["wings", "honeyJar", "lantern", "wings"] }).prizes).toEqual([
      "honeyJar",
      "lantern",
      "wings",
    ]);
  });

  test("toProgress is a copy", () => {
    const w = wallet({ prizes: ["honeyJar"] });
    w.toProgress().prizes.push("wings");
    expect(w.prizes).toEqual(["honeyJar"]);
  });
});

describe("startRun", () => {
  test("spends a token for a paid run, and plays free with none", () => {
    const w = wallet({ tokens: 1 });
    expect(w.startRun()).toBe("paid");
    expect(w.tokens).toBe(0);
    expect(w.startRun()).toBe("free");
    expect(w.tokens).toBe(0);
  });
});

describe("settleRun", () => {
  test("a paid run pays 1 ticket per 100 points rounded down, at least 1", () => {
    expect(pointsPerTicket).toBe(100);
    for (const [score, tickets] of [
      [1420, 14],
      [250, 2],
      [1400, 14],
      [60, 1],
      [0, 1],
    ] as const) {
      const w = wallet({ tickets: 3 });
      expect(ticketsFor(score)).toBe(tickets);
      expect(w.settleRun("sweetSam", score, "paid")).toBe(tickets);
      expect(w.tickets).toBe(3 + tickets);
    }
  });

  test("free play and a direct start pay no tickets", () => {
    const w = wallet({ tickets: 3 });
    expect(w.settleRun("sweetSam", 1420, "free")).toBe(0);
    expect(w.settleRun("sweetSam", 1420, "direct")).toBe(0);
    expect(w.tickets).toBe(3);
  });

  test("a run keeps the best score as the player's high score on its own machine only", () => {
    const w = wallet({ highScores: { sweetSam: 500, firefly: 0, brassMonkey: 40 } });
    w.settleRun("sweetSam", 300, "paid");
    expect(w.highScore("sweetSam")).toBe(500);
    w.settleRun("sweetSam", 900, "free");
    expect(w.highScore("sweetSam")).toBe(900);
    w.settleRun("firefly", 1200, "direct");
    expect(w.toProgress().highScores).toEqual({ sweetSam: 900, firefly: 1200, brassMonkey: 40 });
  });
});

describe("the house high score", () => {
  test("is fixed per machine, the same for every wallet", () => {
    expect(houseHighScores).toEqual({ sweetSam: 30000, firefly: 40000, brassMonkey: 25000 });
  });

  test("a machine is beaten only once its player high score is above the house high score", () => {
    const w = wallet();
    w.settleRun("brassMonkey", 25000, "paid");
    expect(w.beaten("brassMonkey")).toBe(false);
    w.settleRun("brassMonkey", 25001, "paid");
    expect(w.beaten("brassMonkey")).toBe(true);
    expect(w.beaten("sweetSam")).toBe(false);
  });

  test("HI shows the house high score until the machine is beaten, then the player's", () => {
    const w = wallet();
    w.settleRun("firefly", 3000, "paid");
    expect(w.shownHighScore("firefly")).toBe(40000);
    w.settleRun("firefly", 40200, "paid");
    expect(w.shownHighScore("firefly")).toBe(40200);
  });
});

describe("the token at the counter", () => {
  test("costs 5 tickets", () => {
    expect(ticketsPerToken).toBe(5);
  });

  test("with 5 or more tickets a token costs 5 tickets, whatever the tokens", () => {
    for (const [before, after] of [
      [
        { tokens: 0, tickets: 5 },
        { tokens: 1, tickets: 0 },
      ],
      [
        { tokens: 3, tickets: 5 },
        { tokens: 4, tickets: 0 },
      ],
      [
        { tokens: 0, tickets: 12 },
        { tokens: 1, tickets: 7 },
      ],
      [
        { tokens: 2, tickets: 12 },
        { tokens: 3, tickets: 7 },
      ],
    ] as const) {
      const w = wallet(before);
      expect(w.counter().token).toBe("token");
      expect(w.buy("token")).toBe(true);
      expect(counts(w)).toEqual(after);
    }
  });

  test("with 0 tokens and 0 to 4 tickets the last-chance token takes all the tickets", () => {
    for (let tickets = 0; tickets < ticketsPerToken; tickets++) {
      const w = wallet({ tokens: 0, tickets });
      expect(w.counter().token).toBe("lastChance");
      expect(w.buy("token")).toBe(true);
      expect(counts(w)).toEqual({ tokens: 1, tickets: 0 });
    }
  });

  test("with 1 or more tokens and 0 to 4 tickets there is no sale", () => {
    for (const tokens of [1, 4]) {
      for (let tickets = 0; tickets < ticketsPerToken; tickets++) {
        const w = wallet({ tokens, tickets });
        expect(w.counter().token).toBe("short");
        expect(w.buy("token")).toBe(false);
        expect(counts(w)).toEqual({ tokens, tickets });
      }
    }
  });
});

describe("prizes at the counter", () => {
  test("a prize takes its price once and joins the owned prizes in catalogue order", () => {
    const w = wallet({ tickets: 130, prizes: ["sleepyBees"] });
    expect(w.buy("runningShoes")).toBe(true);
    expect(w.tickets).toBe(80);
    expect(w.prizes).toEqual(["runningShoes", "sleepyBees"]);
    expect(w.owns("runningShoes")).toBe(true);

    const b = wallet({ tickets: 175, prizes: ["oilCan", "honeyJar"] });
    expect(b.buy("pocketWatch")).toBe(true);
    expect(b.tickets).toBe(75);
    expect(b.prizes).toEqual(["honeyJar", "oilCan", "pocketWatch"]);
  });

  test("an owned prize can't be bought again", () => {
    const w = wallet({ tickets: 60 });
    expect(w.buy("honeyJar")).toBe(true);
    expect(w.tickets).toBe(35);
    expect(w.buy("honeyJar")).toBe(false);
    expect(w.tickets).toBe(35);
  });

  test("an unaffordable prize can't be bought", () => {
    for (const [tickets, owned, id] of [
      [24, [], "honeyJar"],
      [49, ["honeyJar"], "runningShoes"],
      [99, [], "sleepyBees"],
      [49, [], "springBoots"],
    ] as const) {
      const w = wallet({ tickets, prizes: [...owned] });
      expect(w.buy(id)).toBe(false);
      expect(w.owns(id)).toBe(false);
      expect(w.tickets).toBe(tickets);
    }
  });

  test("counter lists every prize's offer in catalogue order", () => {
    expect(wallet({ tickets: 60, prizes: ["honeyJar", "glowStick"] }).counter().prizes).toEqual([
      "owned",
      "buy",
      "short",
      "buy",
      "owned",
      "short",
      "buy",
      "buy",
      "short",
    ]);
    expect(wallet().counter().prizes).toHaveLength(prizes.length);
  });
});

describe("canBuy", () => {
  test("says whether the counter would sell an item", () => {
    const w = wallet({ tokens: 1, tickets: 60, prizes: ["honeyJar"] });
    expect(w.canBuy("token")).toBe(true);
    expect(w.canBuy("honeyJar")).toBe(false);
    expect(w.canBuy("glowStick")).toBe(true);
    expect(wallet({ tokens: 1, tickets: 3 }).canBuy("token")).toBe(false);
    expect(wallet({ tokens: 0, tickets: 3 }).canBuy("token")).toBe(true);
    expect(wallet({ tickets: 0 }).canBuy("glowStick")).toBe(false);
  });
});

describe("version", () => {
  test("goes up on every change and only then", () => {
    const w = wallet({ tokens: 1, tickets: 30 });
    const steps: [string, () => unknown, boolean][] = [
      ["paid start", () => w.startRun(), true],
      ["free start", () => w.startRun(), false],
      ["paid settle", () => w.settleRun("sweetSam", 0, "paid"), true],
      ["free settle, no new best", () => w.settleRun("sweetSam", 0, "free"), false],
      ["direct settle, new best", () => w.settleRun("sweetSam", 50, "direct"), true],
      ["token", () => w.buy("token"), true],
      ["prize", () => w.buy("honeyJar" satisfies PrizeId), true],
      ["owned prize", () => w.buy("honeyJar"), false],
      ["short token", () => w.buy("token"), false],
    ];
    for (const [name, act, changes] of steps) {
      const before = w.version;
      act();
      expect({ name, changed: w.version !== before }).toEqual({ name, changed: changes });
    }
  });

  test("a purchase that keeps the prize count the same still changes it", () => {
    const w = wallet({ tokens: 2, tickets: 10 });
    const before = w.version;
    w.buy("token");
    expect(w.prizes).toHaveLength(0);
    expect(w.version).not.toBe(before);
  });
});
