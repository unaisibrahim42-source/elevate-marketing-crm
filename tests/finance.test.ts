import { test } from "node:test";
import assert from "node:assert/strict";
import { paidAmountForInvoice, outstandingForInvoice, isInvoiceOverdue, deriveInvoiceStatus } from "../lib/finance";

function makeInvoice(overrides: Partial<Parameters<typeof outstandingForInvoice>[0]> = {}) {
  return {
    totalPence: 10000,
    status: "UNPAID",
    dueDate: null as Date | null,
    payments: [] as { amountPence: number; status: string }[],
    ...overrides,
  };
}

test("paidAmountForInvoice sums only CONFIRMED payments", () => {
  const invoice = makeInvoice({
    payments: [
      { amountPence: 3000, status: "CONFIRMED" },
      { amountPence: 2000, status: "REVERSED" },
      { amountPence: 1000, status: "CONFIRMED" },
    ],
  });
  assert.equal(paidAmountForInvoice(invoice), 4000);
});

test("outstandingForInvoice never goes negative", () => {
  const invoice = makeInvoice({
    totalPence: 1000,
    payments: [{ amountPence: 5000, status: "CONFIRMED" }],
  });
  assert.equal(outstandingForInvoice(invoice), 0);
});

test("outstandingForInvoice is 0 for VOID invoices regardless of payments", () => {
  const invoice = makeInvoice({ status: "VOID", totalPence: 10000, payments: [] });
  assert.equal(outstandingForInvoice(invoice), 0);
});

test("a partial payment leaves the remaining balance outstanding, not the full total", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    payments: [{ amountPence: 4000, status: "CONFIRMED" }],
  });
  assert.equal(outstandingForInvoice(invoice), 6000);
});

test("isInvoiceOverdue is false once an invoice is fully paid", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    dueDate: new Date("2020-01-01"),
    status: "PAID",
    payments: [{ amountPence: 10000, status: "CONFIRMED" }],
  });
  assert.equal(isInvoiceOverdue(invoice), false);
});

test("isInvoiceOverdue is true for a past due date with an outstanding balance", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    dueDate: new Date("2020-01-01"),
    status: "UNPAID",
    payments: [],
  });
  assert.equal(isInvoiceOverdue(invoice), true);
});

test("isInvoiceOverdue is false when nothing is owed yet is due in the future", () => {
  const future = new Date();
  future.setDate(future.getDate() + 10);
  const invoice = makeInvoice({ dueDate: future });
  assert.equal(isInvoiceOverdue(invoice), false);
});

test("deriveInvoiceStatus reflects a partial payment as PARTIALLY_PAID, never double counted", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    status: "SENT",
    payments: [
      { amountPence: 3000, status: "CONFIRMED" },
      { amountPence: 3000, status: "REVERSED" }, // reversed payment must not count
    ],
  });
  assert.equal(deriveInvoiceStatus(invoice), "PARTIALLY_PAID");
  assert.equal(outstandingForInvoice(invoice), 7000);
});

test("deriveInvoiceStatus is PAID once the full balance is confirmed", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    status: "SENT",
    payments: [{ amountPence: 10000, status: "CONFIRMED" }],
  });
  assert.equal(deriveInvoiceStatus(invoice), "PAID");
});

test("deriveInvoiceStatus is OVERDUE when unpaid past the due date", () => {
  const invoice = makeInvoice({
    totalPence: 10000,
    status: "SENT",
    dueDate: new Date("2020-01-01"),
    payments: [],
  });
  assert.equal(deriveInvoiceStatus(invoice), "OVERDUE");
});

test("deriveInvoiceStatus leaves DRAFT and VOID invoices untouched", () => {
  assert.equal(deriveInvoiceStatus(makeInvoice({ status: "DRAFT" })), "DRAFT");
  assert.equal(deriveInvoiceStatus(makeInvoice({ status: "VOID" })), "VOID");
});
