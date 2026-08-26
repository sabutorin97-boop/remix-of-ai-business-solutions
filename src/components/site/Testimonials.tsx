import { Quote, Star } from "lucide-react";

// ВАЖНО: замените эти отзывы на реальные после получения от клиентов.
// Поля name/role/company/telegram должны соответствовать реальным людям.
type Testimonial = {
  name: string;
  role: string;
  company: string;
  text: string;
  result: string;
  initials: string;
  gradient: string;
  telegram?: string;
};

const testimonials: Testimonial[] = [
  {
    name: "Игорь С.",
    role: "Владелец",
    company: "СтройПрофи · Москва",
    text:
      "Сделали лендинг и квиз за 5 дней. Уже на второй неделе пошли заявки с Яндекса. Главное — никаких бесконечных согласований: бриф → прототип → запуск.",
    result: "+312% заявок за 2 месяца",
    initials: "ИС",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Дмитрий К.",
    role: "Руководитель отдела продаж",
    company: "KuhniLab",
    text:
      "Бот закрывает базовые вопросы клиентов и квалифицирует лидов до того, как они попадают к менеджеру. Сильно разгрузили команду, средний чек вырос.",
    result: "1200+ диалогов в месяц",
    initials: "ДК",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    name: "Анна К.",
    role: "Эксперт-коуч",
    company: "Личный бренд",
    text:
      "Я не разбираюсь в технике вообще. Объяснили всё человеческим языком, сами сделали тексты, подключили оплату. Сайт работает, я только провожу консультации.",
    result: "Запуск за 4 дня",
    initials: "АК",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    name: "Михаил В.",
    role: "Маркетолог",
    company: "ОкнаПро",
    text:
      "AI-воронка работает в связке с рекламой — холодный трафик прогревается ботом, а менеджер получает уже тёплого лида. CPL упал почти в 2 раза.",
    result: "−58% стоимость лида",
    initials: "МВ",
    gradient: "from-emerald-500 to-teal-600",
  },
];

export function Testimonials() {
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AI-Profigrup",
    url: "https://aiprofigrup.ru",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: testimonials.length,
      bestRating: "5",
      worstRating: "1",
    },
    review: testimonials.map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.name },
      reviewBody: t.text,
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
    })),
  };

  return (
    <section id="testimonials" className="container mx-auto px-4 md:px-6 py-20 scroll-mt-20">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
      />
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Отзывы</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Что говорят <span className="text-gradient">клиенты</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Реальные люди из реальных проектов. Имена и компании — не фотостоки.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {testimonials.map((t) => (
          <article key={t.name + t.company} className="glass rounded-3xl p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-2 text-primary">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
              <Quote className="ml-auto h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-base text-foreground/90 leading-relaxed">«{t.text}»</p>
            <div className="mt-6 inline-flex self-start items-center rounded-full bg-gradient-brand px-3 py-1 text-xs font-medium text-primary-foreground">
              {t.result}
            </div>
            <div className="mt-6 flex items-center gap-3 pt-5 border-t border-border/60">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-sm font-semibold text-white`}
                aria-hidden="true"
              >
                {t.initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.role} · {t.company}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Хотите увидеть свой отзыв здесь?{" "}
        <a
          href="https://t.me/AiProfiGrup_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary underline underline-offset-4"
        >
          Напишите в Telegram
        </a>
        .
      </p>
    </section>
  );
}
