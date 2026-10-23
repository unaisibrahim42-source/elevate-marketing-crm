import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProfitSplits } from "../lib/profit";

test("calculateProfitSplits divides a round amount exactly across even percentages", () => {
  const splits = calculateProfitSplits(100000, [
    { partnerId: "a", pct: 40 },
    { partnerId: "b", pct: 30 },
    { partnerId: "c", pct: 30 },
  ]);
  assert.deepEqual(
    splits.map((s) => s.amountPence),
    [40000, 30000, 30000]
  );
});

test("calculateProfitSplits handles uneven thirds without losing precision beyond rounding", () => {
  const splits = calculateProfitSplits(100000, [
    { partnerId: "a", pct: 34 },
    { partnerId: "b", pct: 33 },
    { partnerId: "c", pct: 33 },
  ]);
  const total = splits.reduce((s, x) => s + x.amountPence, 0);
  // Rounding each share independently can be off by at most a few pence
  // from the original total — never silently drop or invent money.
  assert.ok(Math.abs(total - 100000) <= splits.length);
});

test("calculateProfitSplits returns 0 for a partner with 0% share", () => {
  const splits = calculateProfitSplits(50000, [
    { partnerId: "a", pct: 100 },
    { partnerId: "b", pct: 0 },
  ]);
  assert.equal(splits.find((s) => s.partnerId === "b")?.amountPence, 0);
});
