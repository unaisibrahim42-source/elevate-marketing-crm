"use client";

import { useState, useTransition } from "react";
import { changePasswordAction } from "@/lib/actions/settings-actions";

export default function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await changePasswordAction(formData);
      if (res.ok) setMessage({ ok: true, text: "Password updated." });
      else setMessage({ ok: false, text: res.error ?? "Something went wrong." });
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className="crm-label block mb-1.5">Current password</label>
        <input name="currentPassword" type="password" required className="crm-input" />
      </div>
      <div>
        <label className="crm-label block mb-1.5">New password</label>
        <input name="newPassword" type="password" required minLength={8} className="crm-input" />
      </div>
      {message && (
        <p className="text-sm" style={{ color: message.ok ? "var(--crm-green)" : "var(--crm-red)" }}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={pending} className="crm-btn crm-btn-primary">
        {pending ? "Saving…" : "Change Password"}
      </button>
    </form>
  );
}
