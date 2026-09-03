import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPostBySlug } from "@/lib/blog";
import { ChannelCta } from "@/components/site/ChannelCta";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = `https://aiprofigrup.ru/blog/${loaderData.slug}`;
    const image = loaderData.cover.startsWith("http")
      ? loaderData.cover
      : `https://aiprofigrup.ru${loaderData.cover}`;
    return {
      meta: [
        { title: `${loaderData.title} — AI-Profigrup` },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
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
            headline: loaderData.title,
            description: loaderData.excerpt,
            datePublished: loaderData.date,
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
  const post = Route.useLoaderData();
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
      <ChannelCta />
    </section>
  );
}
