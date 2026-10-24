import Link from "next/link";
import { AlertTriangle, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { createExpenseAction, createWithdrawalAction, deleteWithdrawalAction } from "@/lib/actions/partner-actions";

export default async function PartnersPage() {
  const [partners, totalRevenue, totalExpenses, recentExpenses, withdrawals] = await Promise.all([
    prisma.partner.findMany({ orderBy: { createdAt: "asc" }, include: { tasks: { where: { status: { not: "COMPLETED" } } } } }),
    prisma.payment.aggregate({ where: { status: "CONFIRMED" }, _sum: { amountPence: true } }),
    prisma.expense.aggregate({ _sum: { amountPence: true } }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 6 }),
    prisma.partnerWithdrawal.findMany({ orderBy: { date: "desc" }, include: { partner: true }, take: 20 }),
  ]);

  const shareholdingTotal = partners.reduce((s, p) => s + p.shareholdingPct, 0);
  const profitShareTotal = partners.reduce((s, p) => s + p.profitSharePct, 0);
  const revenue = totalRevenue._sum.amountPence ?? 0;
  const expenses = totalExpenses._sum.amountPence ?? 0;
  const distributable = revenue - expenses;

  const totalsByPartner = new Map<string, { withdrawn: number; reinvested: number }>();
  for (const w of withdrawals) {
    const existing = totalsByPartner.get(w.partnerId) ?? { withdrawn: 0, reinvested: 0 };
    existing.withdrawn += w.amountPence;
    existing.reinvested += w.reinvestedPence;
    totalsByPartner.set(w.partnerId, existing);
  }

  return (
    <div className="space-y-5">
      {(Math.round(shareholdingTotal) !== 100 || Math.round(profitShareTotal) !== 100) && (
        <div className="crm-panel p-3 flex items-center gap-2" style={{ borderColor: "var(--crm-amber)" }}>
          <AlertTriangle size={14} style={{ color: "var(--crm-amber)" }} />
          <p className="text-sm" style={{ color: "var(--crm-amber)" }}>
            {Math.round(shareholdingTotal) !== 100 && `Shareholding totals ${shareholdingTotal}%, not 100%. `}
            {Math.round(profitShareTotal) !== 100 && `Profit-share totals ${profitShareTotal}%, not 100%.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {partners.map((p) => {
          const totals = totalsByPartner.get(p.id) ?? { withdrawn: 0, reinvested: 0 };
          return (
            <Link key={p.id} href={`/crm/partners/${p.id}`} className="crm-panel p-4 hover:border-[var(--crm-cyan)] transition-colors">
              <p className="font-semibold" style={{ color: "var(--crm-cyan)" }}>
                {p.name}
              </p>
              <p className="text-xs" style={{ color: "var(--crm-text-dim)" }}>
                {p.role}
              </p>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span style={{ color: "var(--crm-text-faint)" }}>Profit share</span>
                <span className="font-semibold">{p.profitSharePct}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--crm-text-faint)" }}>Taken out (all time)</span>
                <span className="font-semibold">{formatPence(totals.withdrawn)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--crm-text-faint)" }}>Reinvested (all time)</span>
                <span className="font-semibold" style={{ color: "var(--crm-green)" }}>
                  {formatPence(totals.reinvested)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel title="Revenue & Expenses" className="lg:col-span-1">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--crm-text-dim)" }}>Total revenue received</span>
              <span style={{ color: "var(--crm-green)" }}>{formatPence(revenue)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--crm-text-dim)" }}>Total expenses logged</span>
              <span style={{ color: "var(--crm-red)" }}>{formatPence(expenses)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
              <span style={{ color: "var(--crm-text)" }}>Potentially distributable</span>
              <span className="font-semibold">{formatPence(distributable)}</span>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--crm-text-faint)" }}>
            All-time figures, shown for reference only — logging a withdrawal never changes these or the
            Finance page. Revenue received is not automatically profit.
          </p>

          <form action={createExpenseAction} className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "var(--crm-border)" }}>
            <p className="crm-label">Log Expense</p>
            <input name="description" placeholder="Description" required className="crm-input" />
            <div className="flex gap-2">
              <input name="amount" type="number" step="0.01" placeholder="£" required className="crm-input" />
              <input name="date" type="date" className="crm-input" />
            </div>
            <input name="category" placeholder="Category (optional)" className="crm-input" />
            <button className="crm-btn crm-btn-ghost w-full justify-center">Add Expense</button>
          </form>

          {recentExpenses.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-xs">
              {recentExpenses.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span style={{ color: "var(--crm-text-dim)" }}>{e.description}</span>
                  <span style={{ color: "var(--crm-text-faint)" }}>{formatPence(e.amountPence)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Partner Withdrawals" className="lg:col-span-2">
          <p className="text-xs mb-4" style={{ color: "var(--crm-text-faint)" }}>
            Each partner decides their own amount here — nothing is calculated for you. Your profit-share %
            is shown as a reference only. What you take out and what you leave in the business are both
            entirely up to you, and never change the Finance page.
          </p>

          <div className="space-y-3 mb-5">
            {partners.map((p) => {
              const suggested = Math.round((distributable * p.profitSharePct) / 100);
              return (
                <form
                  key={p.id}
                  action={createWithdrawalAction.bind(null, p.id)}
                  className="crm-panel-raised p-3 flex flex-wrap items-end gap-2"
                >
                  <div className="min-w-24">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                      {p.profitSharePct}% · suggested ref. {formatPence(suggested)}
                    </p>
                  </div>
                  <div>
                    <label className="crm-label block mb-1">Taking out (£)</label>
                    <input name="amount" type="number" step="0.01" required className="crm-input w-32" />
                  </div>
                  <div>
                    <label className="crm-label block mb-1">Reinvesting (£)</label>
                    <input name="reinvested" type="number" step="0.01" defaultValue="0" className="crm-input w-32" />
                  </div>
                  <div>
                    <label className="crm-label block mb-1">Date</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="crm-input w-auto" />
                  </div>
                  <div className="flex-1 min-w-32">
                    <label className="crm-label block mb-1">Note</label>
                    <input name="note" placeholder="Optional" className="crm-input" />
                  </div>
                  <button type="submit" className="crm-btn crm-btn-primary">
                    Log
                  </button>
                </form>
              );
            })}
          </div>

          <div className="pt-4 border-t" style={{ borderColor: "var(--crm-border)" }}>
            <p className="crm-label mb-2">History</p>
            {withdrawals.length === 0 ? (
              <EmptyState message="No withdrawals logged yet." />
            ) : (
              <ul className="space-y-2.5">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span style={{ color: "var(--crm-text)" }}>{w.partner.name}</span>{" "}
                      <span style={{ color: "var(--crm-text-faint)" }}>· {formatUKDate(w.date)}</span>
                      {w.note && (
                        <p className="text-xs truncate" style={{ color: "var(--crm-text-faint)" }}>
                          {w.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span style={{ color: "var(--crm-amber)" }}>{formatPence(w.amountPence)} out</span>
                      {w.reinvestedPence > 0 && <span style={{ color: "var(--crm-green)" }}>{formatPence(w.reinvestedPence)} in</span>}
                      <form action={deleteWithdrawalAction.bind(null, w.partnerId, w.id)}>
                        <button className="crm-btn-ghost crm-btn p-1.5" aria-label="Delete">
                          <Trash2 size={12} />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
