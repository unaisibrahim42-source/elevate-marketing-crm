import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateFreelancerAction } from "@/lib/actions/freelancer-actions";

const AVAILABILITY = ["AVAILABLE", "LIMITED", "BOOKED", "UNAVAILABLE"];
const RATE_TYPES = ["HOURLY", "DAILY", "PER_PROJECT", "OTHER"];

export default async function EditFreelancerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const freelancer = await prisma.freelancer.findUnique({ where: { id } });

  if (!freelancer) notFound();

  const action = updateFreelancerAction.bind(null, freelancer.id);

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="crm-heading text-lg">Edit: {freelancer.name}</h2>

      <form action={action} className="crm-panel p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label block mb-1.5">Name</label>
            <input name="name" defaultValue={freelancer.name} required className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Role</label>
            <input name="role" defaultValue={freelancer.role} required className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Specialty</label>
            <input name="specialty" defaultValue={freelancer.specialty ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Availability</label>
            <select name="availability" defaultValue={freelancer.availability} className="crm-input crm-select">
              {AVAILABILITY.map((a) => (
                <option key={a} value={a}>
                  {a.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Email</label>
            <input name="email" type="email" defaultValue={freelancer.email ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Phone</label>
            <input name="phone" defaultValue={freelancer.phone ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Location</label>
            <input name="location" defaultValue={freelancer.location ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Portfolio / Instagram link</label>
            <input name="portfolioUrl" defaultValue={freelancer.portfolioUrl ?? ""} className="crm-input" />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Rate (£)</label>
            <input
              name="rateAmount"
              type="number"
              step="0.01"
              defaultValue={freelancer.rateAmountPence != null ? freelancer.rateAmountPence / 100 : ""}
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label block mb-1.5">Rate type</label>
            <select name="rateType" defaultValue={freelancer.rateType ?? "HOURLY"} className="crm-input crm-select">
              {RATE_TYPES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="crm-label block mb-1.5">Rating</label>
            <select name="rating" defaultValue={freelancer.rating?.toString() ?? ""} className="crm-input crm-select">
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r} / 5
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="crm-label block mb-1.5">Notes — the important stuff</label>
          <textarea name="notes" defaultValue={freelancer.notes ?? ""} rows={4} className="crm-input resize-none" />
        </div>
        <button type="submit" className="crm-btn crm-btn-primary px-6 py-2.5">
          Save Changes
        </button>
      </form>
    </div>
  );
}
