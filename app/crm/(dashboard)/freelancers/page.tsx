import Link from "next/link";
import { Plus, Star, Trash2, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { createFreelancerAction, setFreelancerAvailabilityAction, deleteFreelancerAction } from "@/lib/actions/freelancer-actions";
import InlineStatusSelect from "@/components/crm/InlineStatusSelect";
import { FREELANCER_ROLES, freelancerRoleLabel, freelancerRoleGroupLabel } from "@/lib/freelancer-roles";

const AVAILABILITY = ["AVAILABLE", "LIMITED", "BOOKED", "UNAVAILABLE"];
const RATE_TYPES = ["HOURLY", "DAILY", "PER_PROJECT", "OTHER"];

function rateTypeSuffix(rateType: string | null): string {
  switch (rateType) {
    case "HOURLY":
      return "/hr";
    case "DAILY":
      return "/day";
    case "PER_PROJECT":
      return "/project";
    default:
      return "";
  }
}

export default async function FreelancersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; availability?: string }>;
}) {
  const { q = "", availability } = await searchParams;

  const freelancers = await prisma.freelancer.findMany({
    where: {
      ...(availability ? { availability } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { role: { contains: q, mode: "insensitive" } },
              { specialty: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ availability: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div className="crm-panel p-4">
        <p className="crm-label mb-3">Add Freelancer</p>
        <form action={createFreelancerAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input name="name" placeholder="Name" required className="crm-input" />
          <select name="role" defaultValue="VIDEO_EDITOR" required className="crm-input crm-select">
            {FREELANCER_ROLES.map((r) => (
              <option key={r} value={r}>
                {freelancerRoleLabel(r)}
              </option>
            ))}
          </select>
          <input name="specialty" placeholder="Specialty (optional)" className="crm-input" />
          <select name="availability" defaultValue="AVAILABLE" className="crm-input crm-select">
            {AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {a.replace("_", " ")}
              </option>
            ))}
          </select>
          <input name="email" type="email" placeholder="Email" className="crm-input" />
          <input name="phone" placeholder="Phone" className="crm-input" />
          <input name="location" placeholder="Location" className="crm-input" />
          <input name="portfolioUrl" placeholder="Portfolio / Instagram link" className="crm-input" />
          <input name="rateAmount" type="number" step="0.01" placeholder="Rate (£)" className="crm-input" />
          <select name="rateType" defaultValue="HOURLY" className="crm-input crm-select">
            {RATE_TYPES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
          <select name="rating" defaultValue="" className="crm-input crm-select">
            <option value="">Rating (optional)</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r} / 5
              </option>
            ))}
          </select>
          <input name="notes" placeholder="Notes — the important stuff" className="crm-input sm:col-span-2 lg:col-span-1" />
          <button type="submit" className="crm-btn crm-btn-primary">
            <Plus size={14} /> Add
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex-1 max-w-sm" method="get">
          <input name="q" defaultValue={q} placeholder="Search name, role, specialty…" className="crm-input" />
          <input type="hidden" name="availability" value={availability ?? ""} />
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/crm/freelancers?q=${encodeURIComponent(q)}`}
            className="crm-badge"
            style={{ borderColor: !availability ? "var(--crm-lime)" : "var(--crm-border-strong)", color: !availability ? "var(--crm-lime)" : "var(--crm-text-dim)" }}
          >
            All
          </Link>
          {AVAILABILITY.map((a) => (
            <Link
              key={a}
              href={`/crm/freelancers?q=${encodeURIComponent(q)}&availability=${a}`}
              className="crm-badge"
              style={{ borderColor: availability === a ? "var(--crm-lime)" : "var(--crm-border-strong)", color: availability === a ? "var(--crm-lime)" : "var(--crm-text-dim)" }}
            >
              {a.replace("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      {freelancers.length === 0 ? (
        <div className="crm-panel">
          <EmptyState message="No freelancers in the roster yet." />
        </div>
      ) : (
        <div className="space-y-6">
          {FREELANCER_ROLES.map((roleKey) => {
            const group =
              roleKey === "OTHER"
                ? freelancers.filter((f) => !FREELANCER_ROLES.includes(f.role as (typeof FREELANCER_ROLES)[number]))
                : freelancers.filter((f) => f.role === roleKey);
            if (group.length === 0) return null;

            return (
              <div key={roleKey}>
                <p className="crm-label mb-2.5" style={{ color: "var(--crm-cyan)" }}>
                  {freelancerRoleGroupLabel(roleKey)} <span style={{ color: "var(--crm-text-faint)" }}>({group.length})</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {group.map((f) => (
                    <div key={f.id} className="crm-panel p-4 flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: "var(--crm-text)" }}>
                            {f.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--crm-text-dim)" }}>
                            {freelancerRoleLabel(f.role)}
                            {f.specialty ? ` · ${f.specialty}` : ""}
                          </p>
                        </div>
                        <InlineStatusSelect
                          value={f.availability}
                          options={AVAILABILITY}
                          onChange={setFreelancerAvailabilityAction.bind(null, f.id)}
                        />
                      </div>

                      {f.rating && (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i <= f.rating! ? "var(--crm-amber)" : "none"}
                              style={{ color: "var(--crm-amber)" }}
                            />
                          ))}
                        </div>
                      )}

                      <div className="text-xs space-y-1" style={{ color: "var(--crm-text-dim)" }}>
                        {f.rateAmountPence != null && (
                          <p>
                            Rate: <span style={{ color: "var(--crm-text)" }}>{formatPence(f.rateAmountPence)}{rateTypeSuffix(f.rateType)}</span>
                          </p>
                        )}
                        {f.location && <p>{f.location}</p>}
                        {f.email && <p className="truncate">{f.email}</p>}
                        {f.phone && <p>{f.phone}</p>}
                        {f.portfolioUrl && (
                          <a href={f.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: "var(--crm-cyan)" }}>
                            Portfolio <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      {f.notes && (
                        <p className="text-xs pt-2 border-t" style={{ borderColor: "var(--crm-border)", color: "var(--crm-text-faint)" }}>
                          {f.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 mt-auto border-t" style={{ borderColor: "var(--crm-border)" }}>
                        <Link href={`/crm/freelancers/${f.id}/edit`} className="text-xs hover:underline" style={{ color: "var(--crm-cyan)" }}>
                          Edit
                        </Link>
                        <form action={deleteFreelancerAction.bind(null, f.id)}>
                          <button className="crm-btn-ghost crm-btn p-1.5" aria-label="Remove">
                            <Trash2 size={12} />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
