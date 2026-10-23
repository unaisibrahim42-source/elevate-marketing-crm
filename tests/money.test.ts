import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPence, poundsToPence, penceToPounds } from "../lib/money";

test("formatPence renders GBP with two decimal places", () => {
  assert.equal(formatPence(123456), "£1,234.56");
  assert.equal(formatPence(0), "£0.00");
  assert.equal(formatPence(null), "£0.00");
});

test("poundsToPence and penceToPounds round-trip without drift", () => {
  assert.equal(poundsToPence(19.99), 1999);
  assert.equal(penceToPounds(1999), 19.99);
  assert.equal(poundsToPence(0.1) + poundsToPence(0.2), 30); // classic float trap, must not appear
});
