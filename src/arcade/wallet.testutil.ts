import { Wallet } from "./wallet.ts";

/** The tickets a paid run scoring `score` pays, by the Wallet's one ticket rule. */
export function paidTickets(score: number): number {
  return new Wallet().settleRun(score, "paid");
}
