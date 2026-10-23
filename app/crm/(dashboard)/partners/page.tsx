import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { Panel, EmptyState } from "@/components/crm/ui";
import { formatPence } from "@/lib/money";
import { formatUKDate } from "@/lib/dates";
import { createAllocationAction, toggleAllocationPaidAction, createExpenseAction } from "@/lib/actions/partner-actions";

export default async function PartnersPage() {
  const [partners, allocations, totalRevenue, totalExpenses, recentExpenses] = await Promise.all([
    prisma.partner.findMany({ orderBy: { createdAt: "asc" }, include: { tasks: { where: { status: { not: "COMPLETED" } } } } }),
    prisma.profitAllocation.findMany({ orderBy: { createdAt: "desc" }, include: { splits: { include: { partner: true } } }, take: 10 }),
    prisma.payment.aggregate({ where: { status: "CONFIRMED" }, _sum: { amountPence: true } }),
    prisma.expense.aggregate({ _sum: { amountPence: true } }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 6 }),
  ]);

  const shareholdingTotal = partners.reduce((s, p) => s + p.shareholdingPct, 0);
  const profitShareTotal = partners.reduce((s, p) => s + p.profitSharePct, 0);
  const revenue = totalRevenue._sum.amountPence ?? 0;
  const expenses = totalExpenses._sum.amountPence ?? 0;

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
        {partners.map((p) => (
          <Link key={p.id} href={`/crm/partners/${p.id}`} className="crm-panel p-4 hover:border-[var(--crm-cyan)] transition-colors">
            <p className="font-semibold" style={{ color: "var(--crm-cyan)" }}>
              {p.name}
            </p>
            <p className="text-xs" style={{ color: "var(--crm-text-dim)" }}>
              {p.role}
            </p>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span style={{ color: "var(--crm-text-faint)" }}>Shareholding</span>
              <span className="font-semibold">{p.shareholdingPct}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--crm-text-faint)" }}>Profit share</span>
              <span className="font-semibold">{p.profitSharePct}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--crm-text-faint)" }}>Open tasks</span>
              <span className="font-semibold">{p.tasks.length}</span>
            </div>
          </Link>
        ))}
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
              <span className="font-semibold">{formatPence(revenue - expenses)}</span>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--crm-text-faint)" }}>
            All-time figures — revenue received is not automatically profit. Decide the actual distributable
            amount below, after reserves and other costs.
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

        <Panel title="New Earnings Allocation" className="lg:col-span-2">
          <form action={createAllocationAction} className="flex flex-wrap gap-2 mb-4">
            <input name="periodLabel" placeholder="Period (e.g. October 2026)" required className="crm-input flex-1 min-w-40" />
            <input name="distributableAmount" type="number" step="0.01" placeholder="Distributable amount (£)" required className="crm-input w-56" />
            <button type="submit" className="crm-btn crm-btn-primary">
              Calculate & Create
            </button>
          </form>
          <p className="text-xs mb-4" style={{ color: "var(--crm-text-faint)" }}>
            Splits use each partner&apos;s current profit-share percentage at the moment of creation.
          </p>

          {allocations.length === 0 ? (
            <EmptyState message="No distributions recorded yet." />
          ) : (
            <ul className="space-y-3">
              {allocations.map((a) => (
                <li key={a.id} className="crm-panel-raised p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.periodLabel}</p>
                    <form action={toggleAllocationPaidAction.bind(null, a.id, !a.paid)}>
                      <button className="crm-badge" style={{ borderColor: a.paid ? "var(--crm-green)" : "var(--crm-amber)", color: a.paid ? "var(--crm-green)" : "var(--crm-amber)" }}>
                        {a.paid ? "Paid" : "Mark Paid"}
                      </button>
                    </form>
                  </div>
                  <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
                    {formatPence(a.distributableAmountPence)} · {formatUKDate(a.createdAt)}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs">
                    {a.splits.map((s) => (
                      <span key={s.id} style={{ color: "var(--crm-text-dim)" }}>
                        {s.partner.name}: <span style={{ color: "var(--crm-cyan)" }}>{formatPence(s.amountPence)}</span> ({s.pct}%)
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
