import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { ChannelCta } from "@/components/site/ChannelCta";
import { RelatedPosts } from "@/components/site/RelatedPosts";
import { SharePost } from "@/components/site/SharePost";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post, related: getRelatedPosts(params.slug) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post } = loaderData;
    const url = `https://aiprofigrup.ru/blog/${post.slug}`;
    const image = post.cover.startsWith("http")
      ? post.cover
      : `https://aiprofigrup.ru${post.cover}`;
    return {
      meta: [
        { title: `${post.title} — AI-Profigrup` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            image,
            url,
            author: { "@type": "Organization", name: "AI-Profigrup" },
          }),
        },
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { post, related } = Route.useLoaderData();
  const url = `https://aiprofigrup.ru/blog/${post.slug}`;
  return (
    <section className="container mx-auto px-4 md:px-6 py-20 max-w-3xl">
      <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
        ← Все статьи
      </Link>
      <div className="mt-6 text-xs text-muted-foreground">{post.dateLabel}</div>
      <h1 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">{post.title}</h1>
      <div
        className="glass rounded-3xl p-6 md:p-8 mt-10 blog-content"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
      <SharePost url={url} title={post.title} />
      <ChannelCta />
      <RelatedPosts posts={related} />
    </section>
  );
}
