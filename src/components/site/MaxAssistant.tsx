import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Send, Sparkles, X, Gift, MessageCircle } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import assistantAvatar from "@/assets/assistant-avatar.jpg";
import { Button } from "@/components/ui/button";

const MAX_TIMED_SHOWS = 4;
const TIMED_STORAGE_KEY = "max-promo-timed-shown-v1";
const EXIT_STORAGE_KEY = "max-promo-exit-shown-v1";
const FIRST_DELAY_MS = 15_000;
const REPEAT_DELAY_MS = 20_000;
const DRAG_THRESHOLD_PX = 5;

function readTimedShownCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(sessionStorage.getItem(TIMED_STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}
function bumpTimedShownCount(n: number) {
  try {
    sessionStorage.setItem(TIMED_STORAGE_KEY, String(n));
  } catch {
    /* noop */
  }
}
function readExitShown(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(EXIT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function markExitShown() {
  try {
    sessionStorage.setItem(EXIT_STORAGE_KEY, "1");
  } catch {
    /* noop */
  }
}

function MaxChatPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [headerDragging, setHeaderDragging] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    offX: number;
    offY: number;
    minOffX: number;
    maxOffX: number;
    minOffY: number;
    maxOffY: number;
  } | null>(null);
  const headerMovedRef = useRef(false);

  const onHeaderPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    headerMovedRef.current = false;
    const margin = 8;
    const rect = panelRef.current?.getBoundingClientRect();
    const minOffX = rect ? dragOffset.x - rect.left + margin : -Infinity;
    const maxOffX = rect ? dragOffset.x + (window.innerWidth - rect.right) - margin : Infinity;
    const minOffY = rect ? dragOffset.y - rect.top + margin : -Infinity;
    const maxOffY = rect ? dragOffset.y + (window.innerHeight - rect.bottom) - margin : Infinity;
    dragStartRef.current = { x: e.clientX, y: e.clientY, offX: dragOffset.x, offY: dragOffset.y, minOffX, maxOffX, minOffY, maxOffY };
    setHeaderDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onHeaderPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!headerDragging || !dragStartRef.current) return;
    const s = dragStartRef.current;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) headerMovedRef.current = true;
    const x = Math.min(Math.max(s.offX + dx, s.minOffX), s.maxOffX);
    const y = Math.min(Math.max(s.offY + dy, s.minOffY), s.maxOffY);
    setDragOffset({ x, y });
  };
  const onHeaderPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    setHeaderDragging(false);
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

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
      ref={panelRef}
      className="fixed z-[65] right-4 bottom-4 sm:right-6 sm:bottom-6 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[80vh] glass rounded-2xl shadow-glow flex flex-col overflow-hidden border border-border/60 animate-scale-in"
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background/40 select-none ${
          headerDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "none" }}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-background pointer-events-none">
          <img src={assistantAvatar} alt="" draggable={false} className="h-full w-full object-cover" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="text-sm font-semibold">Макс · AI-ассистент</div>
          <div className="text-[11px] text-muted-foreground">Онлайн · отвечает мгновенно</div>
        </div>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
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
            <a href="https://t.me/AiProfiGrup_bot" target="_blank" rel="noreferrer" className="underline">
              @AiProfiGrup_bot
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
  const timedShownRef = useRef(0);
  const exitShownRef = useRef(false);
  const showPromoRef = useRef(false);
  const openRef = useRef(false);
  const lastMouseYRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    timedShownRef.current = readTimedShownCount();
    exitShownRef.current = readExitShown();
  }, []);

  // pos остаётся null, пока пользователь не перетащил виджет вручную — тогда
  // он висит в углу через CSS right/bottom (ширина контента не важна, никаких
  // сжатий/переносов текста). После первого перетаскивания позиция фиксируется
  // в пикселях и на resize просто подрезается под новые границы окна.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        if (!p || !widgetRef.current) return p;
        const widgetW = widgetRef.current.offsetWidth;
        const widgetH = widgetRef.current.offsetHeight;
        return {
          x: Math.min(Math.max(0, p.x), Math.max(0, window.innerWidth - widgetW)),
          y: Math.min(Math.max(0, p.y), Math.max(0, window.innerHeight - widgetH)),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    showPromoRef.current = showPromo;
  }, [showPromo]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Плановые показы: 1-й через FIRST_DELAY_MS, затем ещё MAX_TIMED_SHOWS-1 раз
  // с интервалом REPEAT_DELAY_MS. После исчерпания лимита автопоказ по таймеру
  // прекращается — виджет больше не всплывает, пока пользователь просто на сайте.
  // Exit-intent (курсор уходит к верху окна/за его пределы) — отдельный
  // "крайний" шанс показать предложение один раз за сессию, независимо от лимита.
  useEffect(() => {
    if (!mounted) return;

    const showTimed = () => {
      if (showPromoRef.current || openRef.current) return;
      if (timedShownRef.current >= MAX_TIMED_SHOWS) return;
      setShowPromo(true);
      timedShownRef.current += 1;
      bumpTimedShownCount(timedShownRef.current);
    };

    const showExitIntent = () => {
      if (showPromoRef.current || openRef.current || exitShownRef.current) return;
      setShowPromo(true);
      exitShownRef.current = true;
      markExitShown();
    };

    let timeoutId: number;
    const scheduleNext = () => {
      if (timedShownRef.current >= MAX_TIMED_SHOWS) return;
      const delay = timedShownRef.current === 0 ? FIRST_DELAY_MS : REPEAT_DELAY_MS;
      timeoutId = window.setTimeout(() => {
        showTimed();
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) showExitIntent();
    };
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const prevY = lastMouseYRef.current;
      const dt = now - lastTimeRef.current;
      if (prevY !== null && dt > 0) {
        const dy = e.clientY - prevY;
        const speed = dy / dt;
        if (speed < -1.6 && e.clientY < 120) showExitIntent();
      }
      lastMouseYRef.current = e.clientY;
      lastTimeRef.current = now;
    };
    document.addEventListener("mouseout", onMouseLeave);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("mouseout", onMouseLeave);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [mounted]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!widgetRef.current) return;
    const rect = widgetRef.current.getBoundingClientRect();
    const currentX = pos?.x ?? rect.left;
    const currentY = pos?.y ?? rect.top;
    movedRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    dragOffsetRef.current = { dx: e.clientX - currentX, dy: e.clientY - currentY };
    try {
      widgetRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragging || !widgetRef.current) return;
    const start = startPointRef.current;
    if (start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) movedRef.current = true;
    }
    if (!movedRef.current) return;
    const widgetW = widgetRef.current.offsetWidth;
    const widgetH = widgetRef.current.offsetHeight;
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

  if (!mounted) return null;

  return (
    <>
      {!open && (
        <div
          ref={widgetRef}
          style={{
            position: "fixed",
            ...(pos ? { left: pos.x, top: pos.y } : { right: 20, bottom: 20 }),
            zIndex: 60,
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            userSelect: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`glass rounded-full p-1 sm:pl-2 sm:pr-8 sm:py-2 flex items-center gap-2 sm:gap-4 shadow-glow transition-shadow select-none ${
            dragging ? "shadow-2xl" : ""
          }`}
          role="button"
          aria-label="Открыть чат с Максом"
        >
          <div className="relative h-9 w-9 sm:h-[72px] sm:w-[72px] rounded-full overflow-hidden ring-2 ring-background pointer-events-none">
            <img src={assistantAvatar} alt="" draggable={false} className="h-full w-full object-cover" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-4 sm:w-4 rounded-full bg-success ring-2 ring-background" />
          </div>
          <span className="hidden sm:flex text-2xl font-medium text-foreground pointer-events-none items-center gap-3">
            <MessageCircle className="h-7 w-7" />
            Спросить Макса
          </span>
        </div>
      )}

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
              <a href="https://t.me/AiProfiGrup_bot" target="_blank" rel="noreferrer" className="flex-1" onClick={() => setShowPromo(false)}>
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
