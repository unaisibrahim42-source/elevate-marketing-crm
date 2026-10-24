import Link from "next/link";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate, isOverdue } from "@/lib/dates";
import { createLeadAction, setLeadStageAction, deleteLeadAction } from "@/lib/actions/lead-actions";
import InlineStatusSelect from "@/components/crm/InlineStatusSelect";

const STAGES = ["NEW_LEAD", "NEGOTIATION", "PROPOSAL_SENT", "WON", "LOST"];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;

  const [leads, teamMembers] = await Promise.all([
    prisma.lead.findMany({
      where: stage ? { stage } : undefined,
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Add Lead</p>
        <form action={createLeadAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input name="companyName" placeholder="Lead / Company" required className="crm-input" />
          <input name="contactName" placeholder="Contact name" className="crm-input" />
          <input name="source" placeholder="Source (e.g. Instagram)" className="crm-input" />
          <select name="stage" defaultValue="NEW_LEAD" className="crm-input crm-select">
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <input name="estValuePerMonth" type="number" step="0.01" placeholder="Est. value £/month" className="crm-input" />
          <input name="startDate" type="date" placeholder="Start date" className="crm-input" title="Start date" />
          <input name="contractSentDate" type="date" placeholder="Contract sent" className="crm-input" title="Contract sent" />
          <input name="nextFollowUpDate" type="date" placeholder="Next follow-up" className="crm-input" title="Next follow-up" />
          <select name="ownerId" defaultValue="" className="crm-input crm-select">
            <option value="">Owner (optional)</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input name="contactNo" placeholder="Contact no." className="crm-input" />
          <input name="email" type="email" placeholder="Email" className="crm-input" />
          <input name="otherInfo" placeholder="Other info" className="crm-input" />
          <button type="submit" className="crm-btn crm-btn-primary sm:col-span-2 lg:col-span-1">
            Add Lead
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link href="/crm/leads" className="crm-badge" style={{ borderColor: !stage ? "var(--crm-lime)" : "var(--crm-border-strong)", color: !stage ? "var(--crm-lime)" : "var(--crm-text-dim)" }}>
          All
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s}
            href={`/crm/leads?stage=${s}`}
            className="crm-badge"
            style={{ borderColor: stage === s ? "var(--crm-lime)" : "var(--crm-border-strong)", color: stage === s ? "var(--crm-lime)" : "var(--crm-text-dim)" }}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No leads yet." />
        </div>
      ) : (
        <div className="crm-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "var(--crm-border)" }}>
                <Th>Lead / Company</Th>
                <Th>Contact Name</Th>
                <Th>Source</Th>
                <Th>Stage</Th>
                <Th>Est. Value/Month</Th>
                <Th>Start Date</Th>
                <Th>Contract Sent</Th>
                <Th>Next Follow-up</Th>
                <Th>Owner</Th>
                <Th>Contact No</Th>
                <Th>Email</Th>
                <Th>Other Info</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: "var(--crm-border)" }}>
                  <td className="px-3 py-2.5">
                    <Link href={`/crm/leads/${lead.id}/edit`} className="hover:underline font-medium" style={{ color: "var(--crm-cyan)" }}>
                      {lead.companyName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{lead.contactName ?? "—"}</td>
                  <td className="px-3 py-2.5">{lead.source ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <InlineStatusSelect value={lead.stage} options={STAGES} onChange={setLeadStageAction.bind(null, lead.id)} />
                  </td>
                  <td className="px-3 py-2.5">{lead.estValuePerMonthPence != null ? formatPence(lead.estValuePerMonthPence) : "—"}</td>
                  <td className="px-3 py-2.5">{formatUKDate(lead.startDate)}</td>
                  <td className="px-3 py-2.5">{formatUKDate(lead.contractSentDate)}</td>
                  <td
                    className="px-3 py-2.5"
                    style={{ color: isOverdue(lead.nextFollowUpDate) && lead.stage !== "WON" && lead.stage !== "LOST" ? "var(--crm-red)" : undefined }}
                  >
                    {formatUKDate(lead.nextFollowUpDate)}
                  </td>
                  <td className="px-3 py-2.5">{lead.owner?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{lead.contactNo ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{lead.email ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs max-w-48 truncate" title={lead.otherInfo ?? ""}>
                    {lead.otherInfo ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <form action={deleteLeadAction.bind(null, lead.id)}>
                      <button className="crm-btn-ghost crm-btn p-1.5" aria-label="Delete lead">
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 crm-label font-semibold whitespace-nowrap" style={{ fontSize: "0.6875rem" }}>
      {children}
    </th>
  );
}
