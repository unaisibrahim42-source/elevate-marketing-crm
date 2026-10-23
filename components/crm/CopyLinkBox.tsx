"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyLinkBox({ path, label }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const full = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="crm-panel-raised p-3 space-y-1.5">
      {label && (
        <p className="text-xs" style={{ color: "var(--crm-text-dim)" }}>
          {label}
        </p>
      )}
      <div className="flex items-center gap-2">
        <code className="crm-input text-xs flex-1 truncate" style={{ display: "block" }}>
          {path}
        </code>
        <button type="button" onClick={copy} className="crm-btn crm-btn-ghost p-2">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}
