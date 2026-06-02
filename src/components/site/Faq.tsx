import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "За сколько реально запустить сайт или бота?",
    a: "Лендинг — 3–5 дней, корпоративный сайт — 5–7 дней, Telegram-бот — 5–10 дней, CRM — 7–14 дней. Сроки фиксируем в смете до начала работ.",
  },
  {
    q: "Почему так дёшево по сравнению с агентствами?",
    a: "Используем AI на всех этапах: дизайн, вёрстка, тексты, интеграции. Команда из двух человек без офиса и менеджеров. Экономия 60–70% — это не демпинг, а другая модель работы.",
  },
  {
    q: "Что если результат не понравится?",
    a: "Работаем поэтапно. Показываем макеты до вёрстки и прогресс каждый день. Если на любом этапе что-то идёт не так — корректируем без доплат. 30 дней бесплатных правок после запуска.",
  },
  {
    q: "Как происходит оплата?",
    a: "50% — предоплата после подписания договора, 50% — после сдачи проекта. Работаем как самозанятые с закрывающими документами. Возможна оплата по счёту на ИП/ООО.",
  },
  {
    q: "Кто владеет сайтом и кодом?",
    a: "Вы. Передаём все доступы, исходники и аккаунты. Никакой привязки к нашей платформе или подписке.",
  },
  {
    q: "Делаете ли вы продвижение и трафик?",
    a: "Наша зона — сайт, бот, CRM и автоворонка. По трафику (Яндекс.Директ, Telegram Ads, SEO) подключаем проверенных партнёров и помогаем с ТЗ.",
  },
  {
    q: "Можно ли доработать существующий сайт или бота?",
    a: "Да. Делаем аудит бесплатно, говорим, что реально улучшить и сколько это стоит. Иногда дешевле переделать с нуля — скажем честно.",
  },
];

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section id="faq" className="container mx-auto px-4 md:px-6 py-20 scroll-mt-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">
          Вопросы и ответы
        </div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Частые <span className="text-gradient">вопросы</span>
        </h2>
      </div>

      <div className="mt-10 max-w-3xl mx-auto glass rounded-3xl p-2 md:p-4">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left text-base md:text-lg font-medium px-4">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground px-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
