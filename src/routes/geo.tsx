import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FinalCta } from "@/components/site/FinalCta";

const practices = [
  "Структурированные FAQ-блоки с разметкой schema.org (FAQPage) — нейросети умеют считывать такой формат напрямую",
  "Общая разметка Organization и разметка Service/Article на страницах услуг и в блоге",
  "Файл llms.txt — краткое описание сайта специально для AI-краулеров",
  "robots.txt без блокировок для GPTBot, ClaudeBot, PerplexityBot и других AI-краулеров",
  "Прямые ответы на реальные вопросы клиентов вместо общих фраз вроде «индивидуальный подход»",
  "Актуальные даты публикации и регулярное обновление контента — устаревшие цены и акции сбивают модели с толку",
];

export const Route = createFileRoute("/geo")({
  head: () => ({
    meta: [
      { title: "GEO и AIO: видимость бизнеса в нейросетях — AI-Profigrup" },
      {
        name: "description",
        content:
          "Что такое GEO и AIO, почему классического SEO уже недостаточно, и что AI-Profigrup делает бесплатно в каждом проекте, чтобы бизнес был виден ChatGPT, Alice и другим нейросетям.",
      },
      { property: "og:title", content: "GEO и AIO: видимость бизнеса в нейросетях" },
      {
        property: "og:description",
        content: "Почему всё больше клиентов находят бизнес через ответы нейросетей, а не поисковую выдачу — и что с этим делать.",
      },
      { property: "og:url", content: "https://aiprofigrup.ru/geo" },
    ],
    links: [{ rel: "canonical", href: "https://aiprofigrup.ru/geo" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "GEO/AIO-оптимизация",
          provider: { "@type": "Organization", name: "AI-Profigrup", url: "https://aiprofigrup.ru" },
          areaServed: "RU",
          description:
            "Оптимизация сайтов и ботов под видимость в ответах нейросетей (ChatGPT, Perplexity, Алиса, Gemini) — входит бесплатно в каждый проект AI-Profigrup.",
          url: "https://aiprofigrup.ru/geo",
        }),
      },
    ],
  }),
  component: () => (
    <>
      <section className="container mx-auto px-4 md:px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            Бесплатно в каждом проекте
          </div>
          <h1 className="mt-4 text-5xl md:text-6xl font-bold tracking-tight">
            Вас находят не только в <span className="text-gradient">Google и Яндексе</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Всё больше людей вместо поиска по ссылкам спрашивают у ChatGPT, Алисы или Perplexity
            напрямую — «где сделать...», «кому заказать...», «какую компанию выбрать». Если
            нейросеть не знает о вашем бизнесе, вас просто не называют в ответе.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GEO</div>
            <h2 className="mt-2 text-xl font-semibold">Generative Engine Optimization</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Работа над тем, чтобы бренд попадал в сам текст ответа нейросети — с упоминанием и
              точной цитатой, а не в список синих ссылок. Если в SEO компании борются за место в
              выдаче, то в GEO — за место внутри ответа модели.
            </p>
          </div>
          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AIO</div>
            <h2 className="mt-2 text-xl font-semibold">AI Optimization</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Более широкая задача: как ИИ в принципе воспринимает, классифицирует и цитирует
              бизнес во всех точках касания — не только в чатах, но и в RAG-поиске, голосовых
              ассистентах и внутренних AI-инструментах ваших же клиентов.
            </p>
          </div>
        </div>

        <div className="mt-10 glass rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-semibold">Это уже происходит, а не только начинается</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            По данным крупного исследования SparkToro и Similarweb (панель Similarweb,
            январь–апрель 2026), доля поисковых запросов в Google (США), которые завершаются без
            перехода на какой-либо сайт, выросла с 60,45% в 2024 году до 68,01% в начале 2026 —
            а по информационным запросам («что такое», «как сделать») этот показатель достигает
            74–79%. В России картина похожа: доля людей, которые уже привычно спрашивают у
            голосовых и чат-ассистентов вроде Алисы, вместо того чтобы листать поисковую выдачу,
            заметно и быстро растёт.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Что мы делаем бесплатно в каждом проекте
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Это не отдельная платная опция, которую нужно доплачивать — GEO/AIO-практики
            встроены в то, как мы вообще собираем сайты и ботов.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {practices.map((p) => (
              <div key={p} className="glass rounded-2xl px-5 py-4 flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  ),
});
