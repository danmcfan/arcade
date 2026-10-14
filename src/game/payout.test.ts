import { describe, expect, test } from "bun:test";
import { digitReelDurationFrames } from "../ui/digitReel.ts";
import { Payout, ticksPerTicket } from "./payout.ts";

/** Step until `done` or `limit` ticks; returns the ticks on which a ticket was paid. */
function runOut(p: Payout, limit = 10_000): number[] {
  const paid: number[] = [];
  for (let t = 1; t <= limit && p.counting; t++) {
    if (p.step(false)) paid.push(t);
  }
  return paid;
}

describe("Payout: a paid run", () => {
  test("a tick between tickets outlasts a digit spin, so no reel misses its new target", () => {
    expect(ticksPerTicket).toBeGreaterThan(digitReelDurationFrames);
  });

  test("opens on the score and 0 tickets, counting", () => {
    const p = new Payout(1420, 14, false);
    expect(p.snapshot()).toEqual({ score: 1420, tickets: 0, total: 14, freePlay: false, counting: true });
  });

  test("each interval the score drops 100 and the tickets rise 1, with a ticket sound", () => {
    const p = new Payout(1420, 14, false);
    for (let t = 1; t < ticksPerTicket; t++) expect(p.step(false)).toBe(false);
    expect(p.step(false)).toBe(true);
    expect([p.score, p.tickets]).toEqual([1320, 1]);
    for (let t = 1; t < ticksPerTicket; t++) p.step(false);
    expect(p.step(false)).toBe(true);
    expect([p.score, p.tickets]).toEqual([1220, 2]);
  });

  test("1420 pays 14 tickets, then the 20 left over spins to 0 with no ticket", () => {
    const p = new Payout(1420, 14, false);
    const paid = runOut(p);
    expect(paid).toEqual(Array.from({ length: 14 }, (_, i) => (i + 1) * ticksPerTicket));
    expect(p.snapshot()).toEqual({ score: 0, tickets: 14, total: 14, freePlay: false, counting: false });
  });

  test("the leftover spin happens one interval after the last ticket", () => {
    const p = new Payout(120, 1, false);
    for (let t = 0; t < ticksPerTicket; t++) p.step(false);
    expect([p.score, p.tickets]).toEqual([20, 1]);
    for (let t = 0; t < ticksPerTicket; t++) p.step(false);
    expect([p.score, p.tickets]).toEqual([0, 1]);
  });

  test("a score under 100 spins straight to 0 and pays 1 ticket", () => {
    const p = new Payout(60, 1, false);
    expect(runOut(p)).toEqual([ticksPerTicket]);
    expect([p.score, p.tickets]).toEqual([0, 1]);
  });

  test("counting ends only once the reels have settled", () => {
    const p = new Payout(60, 1, false);
    for (let t = 0; t < ticksPerTicket; t++) p.step(false);
    expect(p.counting).toBe(true);
    expect(p.scoreReels[4].active).toBe(true);
    for (let t = 0; t < digitReelDurationFrames; t++) p.step(false);
    expect(p.counting).toBe(false);
  });

  test("the reels spin towards the shown values", () => {
    const p = new Payout(1420, 14, false);
    for (let t = 0; t < ticksPerTicket; t++) p.step(false);
    expect(p.scoreReels[3].active).toBe(true);
    expect([p.scoreReels[3].from, p.scoreReels[3].to]).toEqual([4, 3]);
    expect(p.ticketReels[5].active).toBe(true);
    expect([p.ticketReels[5].from, p.ticketReels[5].to]).toEqual([0, 1]);
  });

  test("Space during the count jumps to the totals, reels settled; Space again closes", () => {
    const p = new Payout(1420, 14, false);
    for (let t = 0; t < 30; t++) p.step(false);
    expect(p.step(true)).toBe(false);
    expect(p.snapshot()).toEqual({ score: 0, tickets: 14, total: 14, freePlay: false, counting: false });
    expect(p.scoreReels.every((r) => !r.active && r.settledDigit === 0)).toBe(true);
    expect(p.ticketReels.map((r) => r.settledDigit)).toEqual([0, 0, 0, 0, 1, 4]);
    p.step(false);
    expect(p.done).toBe(false);
    p.step(true);
    expect(p.done).toBe(true);
  });

  test("Space after the count closes it", () => {
    const p = new Payout(60, 1, false);
    runOut(p);
    p.step(true);
    expect(p.done).toBe(true);
  });
});

describe("Payout: free play", () => {
  test("shows the score, pays nothing and one Space closes it", () => {
    const p = new Payout(1420, 0, true);
    expect(p.snapshot()).toEqual({ score: 1420, tickets: 0, total: 0, freePlay: true, counting: false });
    for (let t = 0; t < 100; t++) expect(p.step(false)).toBe(false);
    expect(p.score).toBe(1420);
    p.step(true);
    expect(p.done).toBe(true);
  });
});
