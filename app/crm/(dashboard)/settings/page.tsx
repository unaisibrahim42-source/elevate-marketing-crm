import Link from "next/link";
import { X } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/crm/ui";
import { isEmailConfigured } from "@/lib/mailer";
import {
  getSetting,
  updateGeneralSettingsAction,
  updateDashboardPanelsAction,
  addServicePackageAction,
  removeServicePackageAction,
} from "@/lib/actions/settings-actions";
import ChangePasswordForm from "@/components/crm/ChangePasswordForm";

type DashboardPanels = { activity: boolean; deadlines: boolean; clients: boolean; finance: boolean; feed: boolean; news: boolean };

export default async function SettingsPage() {
  const [agencyName, paymentTerms, panels, servicePackages, templates] = await Promise.all([
    getSetting("agency_name", "Elevate Marketing"),
    getSetting("default_payment_terms_days", 14),
    getSetting<DashboardPanels>("dashboard_panels", { activity: true, deadlines: true, clients: true, finance: true, feed: true, news: true }),
    getSetting<string[]>("service_packages", []),
    prisma.contractTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Agency Settings">
          <form action={updateGeneralSettingsAction} className="space-y-3">
            <div>
              <label className="crm-label block mb-1.5">Agency name</label>
              <input name="agency_name" defaultValue={agencyName} className="crm-input" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Currency</label>
              <input value="GBP (£)" disabled className="crm-input opacity-60" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Date format</label>
              <input value="DD/MM/YYYY (UK)" disabled className="crm-input opacity-60" />
            </div>
            <div>
              <label className="crm-label block mb-1.5">Default invoice payment terms (days)</label>
              <input name="default_payment_terms_days" type="number" defaultValue={paymentTerms} className="crm-input" />
            </div>
            <button type="submit" className="crm-btn crm-btn-primary">
              Save
            </button>
          </form>
        </Panel>

        <Panel title="Dashboard Panels">
          <form action={updateDashboardPanelsAction} className="space-y-2.5">
            {([
              ["panel_activity", "Business activity", panels.activity],
              ["panel_deadlines", "Upcoming deadlines", panels.deadlines],
              ["panel_clients", "Client overview", panels.clients],
              ["panel_finance", "Finance snapshot", panels.finance],
              ["panel_feed", "Recent activity feed", panels.feed],
              ["panel_news", "Industry news", panels.news],
            ] as const).map(([name, label, checked]) => (
              <label key={name} className="flex items-center gap-2 text-sm" style={{ color: "var(--crm-text-dim)" }}>
                <input type="checkbox" name={name} defaultChecked={checked} /> {label}
              </label>
            ))}
            <button type="submit" className="crm-btn crm-btn-ghost mt-2">
              Save Panel Visibility
            </button>
          </form>
        </Panel>

        <Panel title="Service Packages">
          <form action={addServicePackageAction} className="flex gap-2 mb-3">
            <input name="name" placeholder="e.g. Momentum Package" required className="crm-input" />
            <button className="crm-btn crm-btn-ghost">Add</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {servicePackages.map((s) => (
              <span key={s} className="crm-badge crm-badge-cyan flex items-center gap-1.5">
                {s}
                <form action={removeServicePackageAction.bind(null, s)}>
                  <button aria-label="Remove">
                    <X size={11} />
                  </button>
                </form>
              </span>
            ))}
            {servicePackages.length === 0 && (
              <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                No packages defined yet.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Contract Templates">
          <ul className="space-y-1.5 text-sm">
            {templates.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
            {templates.length === 0 && (
              <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                No templates yet — create one from Documents → New Contract.
              </p>
            )}
          </ul>
        </Panel>

        <Panel title="Users, Partners & Permissions">
          <p className="text-sm mb-3" style={{ color: "var(--crm-text-dim)" }}>
            Manage team accounts and shareholder settings from their own sections.
          </p>
          <div className="flex gap-2">
            <Link href="/crm/people" className="crm-btn crm-btn-ghost">
              People
            </Link>
            <Link href="/crm/partners" className="crm-btn crm-btn-ghost">
              Partners
            </Link>
          </div>
        </Panel>

        <Panel title="Integrations">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--crm-text-dim)" }}>Email (SMTP)</span>
              <span className="crm-badge" style={{ borderColor: isEmailConfigured() ? "var(--crm-green)" : "var(--crm-amber)", color: isEmailConfigured() ? "var(--crm-green)" : "var(--crm-amber)" }}>
                {isEmailConfigured() ? "Configured" : "Not configured"}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Set CRM_SMTP_HOST / CRM_SMTP_USER / CRM_SMTP_PASS / CRM_SMTP_FROM as environment variables to
              enable emailing signing links automatically. Until then, signing links are generated and can be
              shared manually — nothing is faked.
            </p>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
              <span style={{ color: "var(--crm-text-dim)" }}>E-signature</span>
              <span className="crm-badge crm-badge-green">Built-in (active)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Contracts use a self-hosted signing flow — secure per-contract links, typed + drawn signature
              capture, consent, timestamp and an audit trail. No third-party e-signature account is required.
            </p>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
              <span style={{ color: "var(--crm-text-dim)" }}>Invoice OCR</span>
              <span className="crm-badge crm-badge-green">Built-in (active)</span>
            </div>
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Uploaded invoice images are scanned on-device with Tesseract OCR — no external API or key needed.
              PDF scanning isn&apos;t supported yet; enter those details manually.
            </p>

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
              <span style={{ color: "var(--crm-text-dim)" }}>File storage</span>
              <span className="crm-badge crm-badge-cyan">Local disk</span>
            </div>
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              Files are stored on the server and served only to logged-in users. For production, point this at
              cloud storage (e.g. Supabase Storage / S3).
            </p>
          </div>
        </Panel>

        <Panel title="Change My Password">
          <ChangePasswordForm />
        </Panel>
      </div>
    </div>
  );
}
