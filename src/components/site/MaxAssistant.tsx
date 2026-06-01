import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Send, Sparkles, X, Gift, MessageCircle } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import assistantAvatar from "@/assets/assistant-avatar.jpg";
import { Button } from "@/components/ui/button";

const MAX_SHOWS = 3;
const STORAGE_KEY = "max-promo-shown-v1";
const FIRST_DELAY_MS = 10_000;
const DRAG_THRESHOLD_PX = 5;

function readShownCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}
function bumpShownCount(n: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* noop */
  }
}

function MaxChatPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [
      {
        id: "greeting",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Привет! Я Макс — AI-ассистент AI-Profigrup. Расскажите задачу: сайт, бот, автоматизация? Подберу решение и сроки.",
          },
        ],
      } as UIMessage,
    ],
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  };

  return (
    <div
      className="fixed z-[65] right-4 bottom-4 sm:right-6 sm:bottom-6 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[80vh] glass rounded-2xl shadow-glow flex flex-col overflow-hidden border border-border/60 animate-scale-in"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/40">
        <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-background">
          <img src={assistantAvatar} alt="" className="h-full w-full object-cover" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Макс · AI-ассистент</div>
          <div className="text-[11px] text-muted-foreground">Онлайн · отвечает мгновенно</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {messages.map((m) => {
          const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${
                  mine
                    ? "bg-gradient-brand text-primary-foreground rounded-br-sm"
                    : "bg-secondary/60 text-foreground rounded-bl-sm"
                }`}
              >
                {text || (m.role === "assistant" && busy ? "…" : "")}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="bg-secondary/60 rounded-2xl rounded-bl-sm px-3 py-2 text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive">
            Не удалось получить ответ. Напишите напрямую в Telegram:{" "}
            <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer" className="underline">
              @sabutorin45
            </a>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-border/60 p-3 flex gap-2 bg-background/40">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Опишите задачу…"
          className="flex-1 rounded-full bg-secondary/60 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          className="rounded-full bg-gradient-brand text-primary-foreground shadow-glow disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export function MaxAssistant() {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [open, setOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const shownCountRef = useRef(0);
  const lastMouseYRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    shownCountRef.current = readShownCount();
    const place = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const widgetW = widgetRef.current?.offsetWidth ?? 220;
      const widgetH = widgetRef.current?.offsetHeight ?? 56;
      const margin = 20;
      setPos({
        x: Math.max(margin, w - widgetW - margin),
        y: Math.max(margin, h - widgetH - Math.round(h / 7)),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const tryShow = () => {
      if (shownCountRef.current >= MAX_SHOWS || showPromo || open) return;
      setShowPromo(true);
      shownCountRef.current += 1;
      bumpShownCount(shownCountRef.current);
    };
    const timer = window.setTimeout(tryShow, FIRST_DELAY_MS);
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) tryShow();
    };
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const prevY = lastMouseYRef.current;
      const dt = now - lastTimeRef.current;
      if (prevY !== null && dt > 0) {
        const dy = e.clientY - prevY;
        const speed = dy / dt;
        if (speed < -1.6 && e.clientY < 120) tryShow();
      }
      lastMouseYRef.current = e.clientY;
      lastTimeRef.current = now;
    };
    document.addEventListener("mouseout", onMouseLeave);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseLeave);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [mounted, showPromo, open]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!widgetRef.current || !pos) return;
    movedRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    dragOffsetRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    try {
      widgetRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const start = startPointRef.current;
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) movedRef.current = true;
    }
    if (!movedRef.current) return;
    const widgetW = widgetRef.current?.offsetWidth ?? 220;
    const widgetH = widgetRef.current?.offsetHeight ?? 56;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = Math.min(Math.max(0, e.clientX - dragOffsetRef.current.dx), w - widgetW);
    const y = Math.min(Math.max(0, e.clientY - dragOffsetRef.current.dy), h - widgetH);
    setPos({ x, y });
  };
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    setDragging(false);
    try {
      widgetRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (!movedRef.current) {
      setOpen((v) => !v);
    }
    movedRef.current = false;
    startPointRef.current = null;
  };

  if (!mounted || !pos) return null;

  return (
    <>
      <div
        ref={widgetRef}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 60,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`glass rounded-full pl-1 pr-4 py-1 flex items-center gap-2 shadow-glow transition-shadow select-none ${
          dragging ? "shadow-2xl" : ""
        }`}
        role="button"
        aria-label="Открыть чат с Максом"
      >
        <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-background pointer-events-none">
          <img src={assistantAvatar} alt="" draggable={false} className="h-full w-full object-cover" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
        </div>
        <span className="text-xs font-medium text-foreground pointer-events-none flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          Спросить Макса
        </span>
      </div>

      {open && <MaxChatPanel onClose={() => setOpen(false)} />}

      {showPromo && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in p-4"
          onClick={() => setShowPromo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md glass rounded-3xl p-6 md:p-8 shadow-glow animate-scale-in"
          >
            <button
              onClick={() => setShowPromo(false)}
              aria-label="Закрыть"
              className="absolute top-3 right-3 rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground">
              <Gift className="h-3.5 w-3.5" />
              Спецпредложение недели
            </div>
            <h3 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">
              <span className="text-gradient">−20%</span> на запуск + бесплатный AI-аудит воронки
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Заберите скидку 20% на AI-сайт, Telegram-бота или CRM для компании — плюс бесплатный
              аудит текущих заявок и план роста за 24 часа. Только при обращении сегодня.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-primary" />Аудит вашей воронки от AI — бесплатно</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-primary" />Запуск за 3–7 дней без переплат</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 text-primary" />Скидка действует до конца недели</li>
            </ul>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="https://t.me/sabutorin45" target="_blank" rel="noreferrer" className="flex-1" onClick={() => setShowPromo(false)}>
                <Button className="w-full bg-gradient-brand text-primary-foreground rounded-full shadow-glow">
                  <Send className="mr-2 h-4 w-4" /> Забрать скидку в Telegram
                </Button>
              </a>
              <Button variant="outline" onClick={() => setShowPromo(false)} className="sm:w-auto rounded-full border-border bg-secondary/40">
                Позже
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Предложение ограничено. Никакого спама — отвечу лично в Telegram.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
