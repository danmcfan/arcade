import { describe, expect, test } from "bun:test";
import { buyToken, ticketsPerToken, tokenOffer } from "./prizeCounter.ts";

describe("buyToken", () => {
  test("a token costs 5 tickets", () => {
    expect(ticketsPerToken).toBe(5);
  });

  test("with 5 or more tickets a token costs 5 tickets, whatever the tokens", () => {
    expect(buyToken({ tokens: 0, tickets: 5 })).toEqual({ tokens: 1, tickets: 0 });
    expect(buyToken({ tokens: 3, tickets: 5 })).toEqual({ tokens: 4, tickets: 0 });
    expect(buyToken({ tokens: 0, tickets: 12 })).toEqual({ tokens: 1, tickets: 7 });
    expect(buyToken({ tokens: 2, tickets: 12 })).toEqual({ tokens: 3, tickets: 7 });
  });

  test("with 0 tokens and 0 to 4 tickets the last-chance token takes all the tickets", () => {
    for (let tickets = 0; tickets < ticketsPerToken; tickets++) {
      expect(buyToken({ tokens: 0, tickets })).toEqual({ tokens: 1, tickets: 0 });
    }
  });

  test("with 1 or more tokens and 0 to 4 tickets there is no sale", () => {
    for (let tickets = 0; tickets < ticketsPerToken; tickets++) {
      expect(buyToken({ tokens: 1, tickets })).toBeNull();
      expect(buyToken({ tokens: 4, tickets })).toBeNull();
    }
  });
});

describe("tokenOffer", () => {
  test("names the deal buyToken makes", () => {
    expect(tokenOffer({ tokens: 2, tickets: 5 })).toBe("token");
    expect(tokenOffer({ tokens: 0, tickets: 9 })).toBe("token");
    expect(tokenOffer({ tokens: 0, tickets: 4 })).toBe("lastChance");
    expect(tokenOffer({ tokens: 0, tickets: 0 })).toBe("lastChance");
    expect(tokenOffer({ tokens: 1, tickets: 4 })).toBe("short");
  });
});
