import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const PDN_CONSENT_KEY = "pdn-consent-v1";
export const PDN_CONSENT_EVENT = "pdn-consent-changed";
const SESSION_DISMISS_KEY = "pdn-consent-dismissed-v1";
const OFFSET_VAR = "--pdn-banner-offset";

export function hasPdnConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PDN_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [agree, setAgree] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const accepted = localStorage.getItem(PDN_CONSENT_KEY) === "accepted";
      const dismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
      setVisible(!accepted && !dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  // Пока плашка видна, поднимаем виджет "Спросить Макса" на её высоту,
  // чтобы полноширинная плашка внизу не перекрывалась и не перекрывала его.
  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty(OFFSET_VAR, "0px");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty(OFFSET_VAR, `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty(OFFSET_VAR, "0px");
    };
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(PDN_CONSENT_KEY, "accepted");
    } catch {
      /* noop */
    }
    setVisible(false);
    window.dispatchEvent(new Event(PDN_CONSENT_EVENT));
  };

  const dismiss = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div ref={barRef} className="fixed inset-x-0 bottom-0 z-[55] glass border-t border-border/40 animate-fade-in">
      <div className="container mx-auto px-4 md:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center sm:text-left">
        <ShieldCheck className="hidden sm:block h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          Используем cookie и персональные данные по{" "}
          <Link to="/privacy" target="_blank" className="text-foreground underline underline-offset-4 hover:text-gradient">
            Политике
          </Link>{" "}
          и{" "}
          <a
            href="https://www.consultant.ru/document/cons_doc_LAW_61801/"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-gradient"
          >
            152-ФЗ
          </a>
          .
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
            Согласен
          </label>
          <Button
            onClick={accept}
            disabled={!agree}
            size="sm"
            className="shrink-0 bg-gradient-brand text-primary-foreground rounded-full shadow-glow hover:opacity-90 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:scale-100"
          >
            Принимаю
          </Button>
          <button
            onClick={dismiss}
            aria-label="Закрыть"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition sm:absolute sm:right-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
