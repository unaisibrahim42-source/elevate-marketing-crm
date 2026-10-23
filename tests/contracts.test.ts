import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveContractStatus, isAwaitingSignature } from "../lib/contracts";

test("a signed contract with a past start date and no end date is ACTIVE", () => {
  const { effectiveStatus, notYetActive } = deriveContractStatus({
    status: "SIGNED",
    startDate: new Date("2020-01-01"),
    endDate: null,
  });
  assert.equal(effectiveStatus, "ACTIVE");
  assert.equal(notYetActive, false);
});

test("a signed contract with a future start date is not yet active", () => {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const { effectiveStatus, notYetActive } = deriveContractStatus({
    status: "SIGNED",
    startDate: future,
    endDate: null,
  });
  assert.equal(effectiveStatus, "SIGNED");
  assert.equal(notYetActive, true);
});

test("a signed contract past its end date auto-expires", () => {
  const { effectiveStatus } = deriveContractStatus({
    status: "SIGNED",
    startDate: new Date("2020-01-01"),
    endDate: new Date("2020-06-01"),
  });
  assert.equal(effectiveStatus, "EXPIRED");
});

test("TERMINATED and DECLINED always win regardless of dates", () => {
  assert.equal(
    deriveContractStatus({ status: "TERMINATED", startDate: new Date("2020-01-01"), endDate: null }).effectiveStatus,
    "TERMINATED"
  );
  assert.equal(
    deriveContractStatus({ status: "DECLINED", startDate: null, endDate: null }).effectiveStatus,
    "DECLINED"
  );
});

test("an unsigned contract never displays as active just because dates are set", () => {
  const { effectiveStatus } = deriveContractStatus({
    status: "SENT",
    startDate: new Date("2020-01-01"),
    endDate: null,
  });
  assert.notEqual(effectiveStatus, "ACTIVE");
  assert.equal(effectiveStatus, "SENT");
});

test("isAwaitingSignature covers sent/viewed/partially-signed/ready only", () => {
  assert.equal(isAwaitingSignature("SENT"), true);
  assert.equal(isAwaitingSignature("VIEWED"), true);
  assert.equal(isAwaitingSignature("PARTIALLY_SIGNED"), true);
  assert.equal(isAwaitingSignature("READY"), true);
  assert.equal(isAwaitingSignature("SIGNED"), false);
  assert.equal(isAwaitingSignature("DRAFT"), false);
});
