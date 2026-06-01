import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";

type Cat = "Все" | "Сайты" | "Telegram-боты" | "Авито";

type Case = {
  cat: "Сайты" | "Telegram-боты" | "Авито";
  tag: string;
  metric: string;
  client: string;
  title: string;
  tags: string[];
  description?: string;
  url?: string;
  featured?: boolean;
  image?: string;
};

const cases: Case[] = [
  {
    cat: "Сайты",
    tag: "Маркетплейс",
    metric: "Каталог + корзина + оплата",
    client: "E-commerce проект",
    title: "Маркетплейс с каталогом товаров и корзиной",
    tags: ["E-commerce", "Корзина", "Каталог", "Оплата"],
    description:
      "Полноценный маркетплейс: каталог товаров с фильтрами, корзина, оформление заказа и интеграция с платёжной системой. Готов к масштабированию.",
    url: "https://cart-product-marketplace.lovable.app",
    featured: true,
    image: "/cases/marketplace.jpg",
  },
  {
    cat: "Сайты",
    tag: "CRM",
    metric: "Воронка + клиенты + аналитика",
    client: "CRM · автоматизация",
    title: "CRM-система с воронкой продаж",
    tags: ["CRM", "Воронка продаж", "Автоматизация", "Аналитика"],
    description:
      "CRM с полной воронкой продаж, управлением клиентами, задачами и аналитикой. В планах: подключение сайта, Telegram-бота и AI-ассистента.",
    url: "https://pixel-perfect-clone-82870.lovable.app",
    featured: true,
    image: "/cases/crm.jpg",
  },
  {
    cat: "Telegram-боты",
    tag: "Наш бот",
    metric: "AI-консультант 24/7",
    client: "AI-Profigrup · собственный кейс",
    title: "Telegram-бот студии с AI внутри",
    tags: ["Telegram", "AI GPT", "Приём заявок", "Авто-ответы"],
    description:
      "Наш рабочий бот: отвечает на вопросы клиентов, квалифицирует лида, считает примерную стоимость и передаёт заявку в работу. Можно потрогать прямо сейчас.",
    url: "https://t.me/AiProfiGrup_bot",
    featured: true,
  },
  {
    cat: "Сайты",
    tag: "Наш сайт",
    metric: "Запуск за 5 дней",
    client: "AI-Profigrup · этот сайт",
    title: "Сайт студии с AI-ассистентом и калькулятором",
    tags: ["AI-ассистент Max", "Калькулятор", "Квиз-воронка", "SSR/SEO", "TanStack Start"],
    description:
      "То, что вы сейчас смотрите. AI-ассистент Max консультирует прямо на странице, калькулятор считает стоимость в реальном времени, квиз собирает заявки, SSR даёт быструю загрузку и индексацию.",
    url: "https://ai-profigrup-studia.lovable.app",
    featured: true,
  },
  {
    cat: "Telegram-боты",
    tag: "Наш бот",
    metric: "Персональный нутрициолог 24/7",
    client: "AI-Profigrup · собственный кейс",
    title: "AI-Лина — Telegram-бот нутрициолог",
    tags: ["Telegram", "AI GPT", "Распознавание фото", "Меню на неделю"],
    description:
      "Наш рабочий бот: отправь фото еды — она посчитает калории и КБЖУ, даст персональные рекомендации по питанию и составит меню на неделю. Попробуй прямо сейчас.",
    url: "https://t.me/AilanaAI_bot",
    featured: true,
  },
  { cat: "Сайты", tag: "Сайт", metric: "+312% заявок за 2 месяца", client: "СтройПрофи · Москва", title: "Лендинг для строительной компании", tags: ["Лендинг", "AI-квиз", "CRM"] },
  { cat: "Telegram-боты", tag: "Бот", metric: "1200+ диалогов в месяц", client: "KuhniLab", title: "Telegram-бот для салона кухонь", tags: ["Telegram", "AI-консультант"] },
  { cat: "Сайты", tag: "Сайт", metric: "Стоимость лида −58%", client: "ОкнаПро", title: "AI-воронка для производителя окон", tags: ["Воронка", "AI", "Аналитика"] },
  { cat: "Авито", tag: "Авито", metric: "+4 заявки в день стабильно", client: "MebelFort", title: "Авито под ключ для мебельной фабрики", tags: ["Авито", "Автоворонка"] },
  { cat: "Сайты", tag: "Сайт", metric: "Запуск за 4 дня", client: "Анна К.", title: "Сайт для эксперта-коуча", tags: ["Личный бренд", "Платежи"] },
  { cat: "Telegram-боты", tag: "Бот", metric: "−70% нагрузки на менеджеров", client: "ServisePro", title: "AI-бот поддержки для сервиса", tags: ["AI", "GPT", "Поддержка"] },
];

const cats: Cat[] = ["Все", "Сайты", "Telegram-боты", "Авито"];

export function CasesSection() {
  const [cat, setCat] = useState<Cat>("Все");
  const list = cat === "Все" ? cases : cases.filter((c) => c.cat === cat);

  return (
    <section className="container mx-auto px-4 md:px-6 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-block rounded-full glass px-3 py-1 text-xs text-muted-foreground">Кейсы</div>
        <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
          Цифры, <span className="text-gradient">а не красивые слова</span>
        </h2>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              cat === c
                ? "bg-gradient-brand text-primary-foreground shadow-glow"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div
            key={c.title}
            className={`glass rounded-3xl p-6 flex flex-col ${
              c.featured ? "border-primary/40 shadow-glow" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
                  c.featured
                    ? "bg-gradient-brand text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {c.featured && <Sparkles className="h-3 w-3" />}
                {c.tag}
              </span>
              <span className="text-muted-foreground">{c.client}</span>
            </div>
            <div className="mt-5 text-2xl font-bold text-gradient">{c.metric}</div>
            <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
            {c.description && (
              <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 flex-1 flex items-end">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition"
                >
                  Открыть пример <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <Link to="/cases" className="inline-flex items-center gap-1 text-sm font-medium">
                  Смотреть кейс <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
