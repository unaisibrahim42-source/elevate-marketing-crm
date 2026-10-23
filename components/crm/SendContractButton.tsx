"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendContractAction } from "@/lib/actions/contract-actions";

export default function SendContractButton({ contractId }: { contractId: string }) {
  const [pending, startTransition] = useTransition();
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  function handleSend() {
    startTransition(async () => {
      const res = await sendContractAction(contractId);
      setSentMessage(
        res.emailResult === "sent"
          ? "Emailed to all signatories."
          : res.emailResult === "failed"
          ? "Email send failed — use the signing link below."
          : "Email isn't configured — use the signing link below."
      );
    });
  }

  if (sentMessage) {
    return (
      <p className="text-xs" style={{ color: "var(--crm-cyan)" }}>
        {sentMessage}
      </p>
    );
  }

  return (
    <button onClick={handleSend} disabled={pending} className="crm-btn crm-btn-primary">
      <Send size={13} /> {pending ? "Sending…" : "Send for Signature"}
    </button>
  );
}
