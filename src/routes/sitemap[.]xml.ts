import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://aiprofigrup.ru";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  /** Дата последнего изменения, YYYY-MM-DD. Ставим только там, где знаем её
   *  наверняка: выдуманная дата для поисковика хуже, чем её отсутствие. */
  lastmod?: string;
}

/** Дата в формате YYYY-MM-DD или пусто, если её нет или она нечитаема. */
function isoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : undefined;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const posts = getAllPosts();
        // getAllPosts отдаёт записи от свежих к старым.
        const latestPost = isoDate(posts[0]?.date);

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/services", changefreq: "monthly", priority: "0.9" },
          { path: "/ai-websites", changefreq: "monthly", priority: "0.8" },
          { path: "/telegram-bots", changefreq: "monthly", priority: "0.8" },
          { path: "/crm", changefreq: "monthly", priority: "0.8" },
          { path: "/geo", changefreq: "monthly", priority: "0.8" },
          { path: "/cases", changefreq: "monthly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7", lastmod: latestPost },
          { path: "/contact", changefreq: "yearly", priority: "0.6" },
          { path: "/tg", changefreq: "monthly", priority: "0.5" },
          ...posts.map((p) => ({
            path: `/blog/${p.slug}`,
            changefreq: "monthly" as const,
            priority: "0.6",
            lastmod: isoDate(p.date),
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
