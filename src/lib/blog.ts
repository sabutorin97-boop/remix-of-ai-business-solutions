import { marked } from "marked";

export type BlogPostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  dateLabel: string;
  cover: string;
};

export type BlogPost = BlogPostMeta & { html: string };

type InternalPost = BlogPost & { draft: boolean };

const DEFAULT_COVER = "/cases/own-site.jpg";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

function parseFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { fields: {}, body: raw };
  const [, block, body] = match;
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    fields[key] = value;
  }
  return { fields, body };
}

function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

const files = import.meta.glob("../content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const allPosts: InternalPost[] = Object.entries(files).map(([path, raw]) => {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  const { fields, body } = parseFrontmatter(raw);
  const date = fields.date ?? "";
  return {
    slug,
    title: fields.title ?? slug,
    excerpt: fields.excerpt ?? "",
    date,
    dateLabel: formatDateLabel(date),
    cover: fields.cover || DEFAULT_COVER,
    html: marked.parse(body, { async: false }),
    draft: fields.draft === "true",
  };
});

export function getAllPosts(): BlogPostMeta[] {
  return allPosts
    .filter((p) => !p.draft)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ slug, title, excerpt, date, dateLabel, cover }) => ({ slug, title, excerpt, date, dateLabel, cover }));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  const post = allPosts.find((p) => p.slug === slug && !p.draft);
  if (!post) return undefined;
  const { draft: _draft, ...rest } = post;
  return rest;
}
