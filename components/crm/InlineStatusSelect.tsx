"use client";

import { useTransition } from "react";
import { statusTone, toneClass, statusLabel } from "@/lib/status";

export default function InlineStatusSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const tone = statusTone(value);

  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => startTransition(() => onChange(e.target.value))}
      className={`crm-badge ${toneClass[tone]} border cursor-pointer bg-transparent`}
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      {options.map((o) => (
        <option key={o} value={o} style={{ background: "var(--crm-panel-raised)", color: "var(--crm-text)" }}>
          {statusLabel(o)}
        </option>
      ))}
    </select>
  );
}
