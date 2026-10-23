// Derives the real, date-aware status of a contract. A contract should
// only ever display as "active" once it is signed AND today falls
// within its start/end dates — never just because someone set a field.

export type ContractLike = {
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

export function deriveContractStatus(contract: ContractLike): {
  effectiveStatus: string;
  notYetActive: boolean;
} {
  const now = new Date();

  if (contract.status === "TERMINATED") return { effectiveStatus: "TERMINATED", notYetActive: false };
  if (contract.status === "DECLINED") return { effectiveStatus: "DECLINED", notYetActive: false };

  if (contract.status === "SIGNED") {
    if (contract.endDate && contract.endDate < now) {
      return { effectiveStatus: "EXPIRED", notYetActive: false };
    }
    if (contract.startDate && contract.startDate > now) {
      return { effectiveStatus: "SIGNED", notYetActive: true };
    }
    return { effectiveStatus: "ACTIVE", notYetActive: false };
  }

  if (contract.status === "EXPIRED" || contract.status === "DRAFT") {
    return { effectiveStatus: contract.status, notYetActive: false };
  }

  // SENT, VIEWED, PARTIALLY_SIGNED, READY — surfaced as-is, but flag
  // an expiry if an end date has silently passed while still unsigned.
  if (contract.endDate && contract.endDate < now) {
    return { effectiveStatus: "EXPIRED", notYetActive: false };
  }
  return { effectiveStatus: contract.status, notYetActive: false };
}

export function isAwaitingSignature(status: string): boolean {
  return ["SENT", "VIEWED", "PARTIALLY_SIGNED", "READY"].includes(status);
}
