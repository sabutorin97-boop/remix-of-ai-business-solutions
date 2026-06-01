import { Link, useRouterState } from "@tanstack/react-router";
import { Send, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

const nav = [
  { hash: "services", label: "Услуги" },
  { hash: "calculator", label: "Калькулятор" },
  { hash: "cases", label: "Кейсы" },
  { hash: "contact", label: "Контакты" },
  { to: "/blog", label: "Блог" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const hrefFor = (n: (typeof nav)[number]) =>
    "hash" in n ? (isHome ? `#${n.hash}` : `/#${n.hash}`) : n.to;
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (hoverIdx === null) {
      setPillStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const el = itemRefs.current[hoverIdx];
    if (el) {
      setPillStyle({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    }
  }, [hoverIdx]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link
          to="/"
          className="flex items-center gap-3 animate-fade-in transition-transform duration-300 hover:scale-[1.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow">
            AI
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-foreground">AI-Profigrup</div>
            <div className="text-[11px] text-muted-foreground">АИ-студия разработки</div>
          </div>
        </Link>

        <nav
          className="relative hidden items-center gap-1 md:flex"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-9 rounded-full bg-secondary transition-all duration-300 ease-out"
            style={{
              left: pillStyle.left,
              width: pillStyle.width,
              opacity: pillStyle.opacity,
            }}
          />
          {nav.map((n, i) => (
            <a
              key={n.label}
              href={hrefFor(n)}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              onMouseEnter={() => setHoverIdx(i)}
              className="relative z-10 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <a
            href="https://t.me/AiProfiGrup_bot"
            target="_blank"
            rel="noreferrer"
            aria-label="Написать в Telegram"
          >
            <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-glow rounded-full">
              <Send className="mr-2 h-4 w-4" /> Написать в Telegram
            </Button>
          </a>
        </div>

        <button
          className="md:hidden rounded-md p-2 text-foreground transition-transform active:scale-90"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/40 bg-background/95 px-4 py-4">
          <div className="flex flex-col gap-2">
            {nav.map((n) => (
              <a
                key={n.label}
                href={hrefFor(n)}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
            <a
              href="https://t.me/AiProfiGrup_bot"
              target="_blank"
              rel="noreferrer"
              aria-label="Написать в Telegram"
              className="mt-2"
            >
              <Button className="w-full bg-gradient-brand text-primary-foreground rounded-full">
                <Send className="mr-2 h-4 w-4" /> Написать в Telegram
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
