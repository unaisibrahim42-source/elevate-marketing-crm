import { Suspense } from "react";
import { Panel, EmptyState } from "@/components/crm/ui";
import { fetchIndustryNews } from "@/lib/news";
import { formatUKDate } from "@/lib/dates";
import { ExternalLink } from "lucide-react";

async function NewsList() {
  const { items, error } = await fetchIndustryNews();

  if (error && items.length === 0) {
    return <EmptyState message={error} />;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i}>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-2 group"
          >
            <span className="text-sm group-hover:underline" style={{ color: "var(--crm-text)" }}>
              {item.title}
            </span>
            <ExternalLink size={12} className="shrink-0 mt-1" style={{ color: "var(--crm-text-faint)" }} />
          </a>
          {item.pubDate && (
            <p className="text-xs" style={{ color: "var(--crm-text-faint)" }}>
              {formatUKDate(new Date(item.pubDate))}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function NewsPanel() {
  return (
    <Panel title="Industry News">
      <Suspense
        fallback={
          <p className="text-sm" style={{ color: "var(--crm-text-faint)" }}>
            Loading news…
          </p>
        }
      >
        <NewsList />
      </Suspense>
    </Panel>
  );
}
