import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MaxAssistant } from "@/components/site/MaxAssistant";
import { YandexMetrika } from "@/components/site/YandexMetrika";
import { CookieConsent } from "@/components/site/CookieConsent";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">Возможно, ссылка устарела или была перенесена.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Эта страница не загрузилась</h1>
        <p className="mt-2 text-sm text-muted-foreground">Попробуйте обновить или вернуться на главную.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Попробовать снова
          </button>
          <a href="/" className="rounded-full border border-border bg-secondary px-5 py-2 text-sm">На главную</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI-Profigrup — AI-сайты, Telegram-боты и автоматизация бизнеса" },
      { name: "description", content: "AI-студия: сайты, Telegram-боты и AI-автоматизация для бизнеса. Запуск за 3–7 дней, экономия до 70%." },
      { name: "author", content: "AI-Profigrup" },
      { property: "og:title", content: "AI-Profigrup — AI-сайты, Telegram-боты и автоматизация бизнеса" },
      { property: "og:description", content: "AI-студия: сайты, Telegram-боты и AI-автоматизация для бизнеса. Запуск за 3–7 дней, экономия до 70%." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AI-Profigrup — AI-сайты, Telegram-боты и автоматизация бизнеса" },
      { name: "twitter:description", content: "AI-студия: сайты, Telegram-боты и AI-автоматизация для бизнеса. Запуск за 3–7 дней, экономия до 70%." },
      { property: "og:image", content: "https://aiprofigrup.ru/cases/own-site.jpg" },
      { property: "og:image:width", content: "1366" },
      { property: "og:image:height", content: "583" },
      { name: "twitter:image", content: "https://aiprofigrup.ru/cases/own-site.jpg" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <YandexMetrika />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <MaxAssistant />
      <CookieConsent />
      <Toaster />
    </QueryClientProvider>
  );
}
