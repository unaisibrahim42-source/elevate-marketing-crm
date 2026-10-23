import { XMLParser } from "fast-xml-parser";

export type NewsItem = { title: string; link: string; pubDate?: string };

export async function fetchIndustryNews(): Promise<{ items: NewsItem[]; error: string | null }> {
  const url = process.env.CRM_NEWS_RSS_URL;
  if (!url) return { items: [], error: "No RSS feed configured — set CRM_NEWS_RSS_URL in Settings." };

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "ElevateCRM/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return { items: [], error: `Feed returned ${res.status}.` };

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];

    const items: NewsItem[] = list
      .filter(Boolean)
      .slice(0, 6)
      .map((item: Record<string, unknown>) => ({
        title: String(item.title ?? "Untitled"),
        link: typeof item.link === "string" ? item.link : (item.link as { "@_href"?: string })?.["@_href"] ?? "#",
        pubDate: item.pubDate ? String(item.pubDate) : undefined,
      }));

    return { items, error: items.length === 0 ? "Feed returned no items." : null };
  } catch {
    return { items: [], error: "Couldn't reach the news feed right now." };
  }
}
