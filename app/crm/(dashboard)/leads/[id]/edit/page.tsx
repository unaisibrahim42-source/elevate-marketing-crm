import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateLeadAction } from "@/lib/actions/lead-actions";

const STAGES = ["NEW_LEAD", "NEGOTIATION", "PROPOSAL_SENT", "WON", "LOST"];

function toInputDate(d?: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, teamMembers] = await Promise.all([
    prisma.lead.findUnique({ where: { id } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  if (!lead) notFound();

  const action = updateLeadAction.bind(null, lead.id);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">Edit Lead: {lead.companyName}</h2>

      <form action={action} className="crm-panel p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label block mb-1.5">Lead / Company</label>
            <input name="companyName" defaultValue={lead.companyName} required className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Contact name</label>
            <input name="contactName" defaultValue={lead.contactName ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Source</label>
            <input name="source" defaultValue={lead.source ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Stage</label>
            <select name="stage" defaultValue={lead.stage} className="crm-input crm-select">
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Est. value (£/month)</label>
            <input
              name="estValuePerMonth"
              type="number"
              step="0.01"
              defaultValue={lead.estValuePerMonthPence != null ? lead.estValuePerMonthPence / 100 : ""}
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Owner</label>
            <select name="ownerId" defaultValue={lead.ownerId ?? ""} className="crm-input crm-select">
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Start date</label>
            <input name="startDate" type="date" defaultValue={toInputDate(lead.startDate)} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Contract sent</label>
            <input name="contractSentDate" type="date" defaultValue={toInputDate(lead.contractSentDate)} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Next follow-up</label>
            <input name="nextFollowUpDate" type="date" defaultValue={toInputDate(lead.nextFollowUpDate)} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Contact no.</label>
            <input name="contactNo" defaultValue={lead.contactNo ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Email</label>
            <input name="email" type="email" defaultValue={lead.email ?? ""} className="crm-input" />
          </div>
        </div>
        <div>
          <label className="crm-label block mb-1.5">Other info</label>
          <textarea name="otherInfo" defaultValue={lead.otherInfo ?? ""} rows={3} className="crm-input resize-none" />
        </div>
        <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
          Save Changes
        </button>
      </form>
    </div>
  );
}
