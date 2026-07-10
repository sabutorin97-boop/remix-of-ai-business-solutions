import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const PDN_CONSENT_KEY = "pdn-consent-v1";
export const PDN_CONSENT_EVENT = "pdn-consent-changed";
const SESSION_DISMISS_KEY = "pdn-consent-dismissed-v1";

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
    <div className="fixed z-[55] left-4 bottom-4 w-[calc(100vw-2rem)] max-w-[210px] glass rounded-2xl p-2.5 shadow-glow border border-border/60 animate-fade-in">
      <button
        onClick={dismiss}
        aria-label="Закрыть"
        className="float-right ml-1.5 -mt-0.5 shrink-0 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="text-[10px] text-muted-foreground leading-tight">
        Cookie и данные по{" "}
        <Link to="/privacy" target="_blank" className="text-foreground underline underline-offset-4">
          Политике
        </Link>{" "}
        и{" "}
        <a
          href="https://www.consultant.ru/document/cons_doc_LAW_61801/"
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline underline-offset-4"
        >
          152-ФЗ
        </a>
        .
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
          Согласен
        </label>
        <Button
          onClick={accept}
          disabled={!agree}
          size="sm"
          className="h-6 px-2.5 text-[10px] bg-gradient-brand text-primary-foreground rounded-full shadow-glow disabled:opacity-50"
        >
          Принимаю
        </Button>
      </div>
    </div>
  );
}
