"use client";

import { useState, useTransition } from "react";
import SignaturePad from "./SignaturePad";

type Signatory = { id: string; name: string; email: string; status: string };

export default function SigningForm({
  signatories,
  onSign,
  onDecline,
}: {
  signatories: Signatory[];
  onSign: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  onDecline: (formData: FormData) => Promise<void>;
}) {
  const pendingSignatories = signatories.filter((s) => s.status === "PENDING");
  const [signatoryId, setSignatoryId] = useState(pendingSignatories[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [declined, setDeclined] = useState(false);

  // Check local completion state first — the server-refreshed `signatories`
  // prop also flips to "0 pending" right after a successful submission, and
  // the person who just signed should see their own confirmation, not the
  // generic "someone already handled this" message.
  if (done) {
    return (
      <div className="crm-panel-raised p-5 text-center crm-glow-green">
        <p className="font-semibold" style={{ color: "var(--crm-green)" }}>
          Signed successfully.
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--crm-text-dim)" }}>
          A record of this signature has been saved.
        </p>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="crm-panel-raised p-5 text-center">
        <p className="font-semibold" style={{ color: "var(--crm-red)" }}>
          You&rsquo;ve declined this contract.
        </p>
      </div>
    );
  }

  if (pendingSignatories.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--crm-green)" }}>
        All signatories have already responded to this contract.
      </p>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await onSign(formData);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong.");
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {pendingSignatories.length > 1 && (
        <div>
          <label className="crm-label block mb-1.5">I am signing as</label>
          <select value={signatoryId} onChange={(e) => setSignatoryId(e.target.value)} className="crm-input crm-select">
            {pendingSignatories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
        </div>
      )}
      <input type="hidden" name="signatoryId" value={signatoryId} />

      <div>
        <label className="crm-label block mb-1.5">Type your full legal name</label>
        <input name="typedSignature" required className="crm-input" placeholder="Full name" />
      </div>

      <SignaturePad name="drawnSignature" />

      <label className="flex items-start gap-2 text-sm" style={{ color: "var(--crm-text-dim)" }}>
        <input type="checkbox" name="consent" required className="mt-0.5" />
        I confirm I have read this agreement and intend this as my legally binding electronic signature.
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--crm-red)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="crm-btn crm-btn-primary px-6 py-2.5">
          {pending ? "Submitting…" : "Sign Contract"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("signatoryId", signatoryId);
            startTransition(async () => {
              await onDecline(fd);
              setDeclined(true);
            });
          }}
          className="crm-btn crm-btn-danger px-6 py-2.5"
        >
          Decline
        </button>
      </div>
    </form>
  );
}
