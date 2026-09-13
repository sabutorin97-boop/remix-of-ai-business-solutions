import { Link } from "@tanstack/react-router";
import type { BlogPostMeta } from "@/lib/blog";

/**
 * Блок «Читайте также» под статьёй: ссылки на другие посты блога.
 * Улучшает внутреннюю перелинковку (SEO) и удерживает читателя на сайте.
 */
export function RelatedPosts({ posts }: { posts: BlogPostMeta[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold tracking-tight">Читайте также</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {posts.map((p) => (
          <article key={p.slug} className="glass rounded-3xl p-6">
            <div className="text-xs text-muted-foreground">{p.dateLabel}</div>
            <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
            <Link
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="mt-4 inline-block text-sm font-medium text-gradient"
            >
              Читать →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
