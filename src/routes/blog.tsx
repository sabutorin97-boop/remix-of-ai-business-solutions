import { createFileRoute, Link } from "@tanstack/react-router";

const posts = [
  { slug: "ai-vs-classic", title: "Почему AI-разработка обгоняет классику в 5 раз", excerpt: "Разбираем стек, который позволяет запускать сайты за 3–7 дней без потери качества.", date: "12 мая 2026" },
  { slug: "telegram-bots-2026", title: "Telegram-боты в 2026: что реально работает", excerpt: "AI-консультанты, CRM-интеграции и автоворонки, которые приносят заявки.", date: "28 апреля 2026" },
  { slug: "avito-automation", title: "Авито под ключ: как получать +4 заявки в день", excerpt: "Прокачка аккаунта, автоответы и аналитика — пошаговый разбор.", date: "10 апреля 2026" },
];

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Блог — AI-Profigrup" },
      { name: "description", content: "Статьи об AI-разработке, Telegram-ботах и автоматизации продаж." },
      { property: "og:title", content: "Блог AI-Profigrup" },
      { property: "og:description", content: "Полезные статьи об AI в бизнесе." },
      { property: "og:url", content: "https://aiprofigrup.ru/blog" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Блог AI-Profigrup",
          url: "https://aiprofigrup.ru/blog",
          description: "Статьи об AI-разработке, Telegram-ботах и автоматизации продаж.",
        }),
      },
    ],
  }),
  component: () => (
    <section className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Блог</div>
        <h1 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight">
          Идеи и <span className="text-gradient">практика AI</span>
        </h1>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {posts.map((p) => (
          <article key={p.slug} className="glass rounded-3xl p-6">
            <div className="text-xs text-muted-foreground">{p.date}</div>
            <h2 className="mt-3 text-xl font-semibold">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
            <Link to="/contact" className="mt-4 inline-block text-sm font-medium text-gradient">Читать →</Link>
          </article>
        ))}
      </div>
    </section>
  ),
});
