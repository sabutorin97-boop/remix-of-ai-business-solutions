import { useCallback } from "react";
import { toast } from "sonner";
import { ymGoal } from "@/components/site/YandexMetrika";

type LeadSource = "contact_form" | "lead_magnet" | "quiz" | "calculator" | "max_chat";

// Единая точка, откуда уходят все заявки (форма, квиз, калькулятор, лид-магнит,
// чат Max) — поэтому цели Метрики фиксируются здесь одним местом, а не в
// каждой форме отдельно. Эти цели нужно завести в интерфейсе Метрики вручную.
const GOAL_BY_SOURCE: Record<LeadSource, string> = {
  contact_form: "contact_submit",
  lead_magnet: "lead_magnet_download",
  quiz: "quiz_complete",
  calculator: "calc_request",
  max_chat: "max_chat_lead",
};

interface SubmitLeadInput {
  source: LeadSource;
  name?: string;
  contact: string;
  message?: string;
  sourceDetails?: Record<string, unknown>;
}

interface SubmitLeadResult {
  leadId: string;
  telegramDeepLink: string;
}

const STORAGE_KEY = "apg_lead_id";
const STORAGE_TS_KEY = "apg_lead_id_at";
const REUSE_WINDOW_MS = 24 * 60 * 60 * 1000;

function readExistingLeadId(): string | undefined {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    const at = Number(localStorage.getItem(STORAGE_TS_KEY) || "0");
    if (id && Date.now() - at < REUSE_WINDOW_MS) return id;
  } catch {
    /* noop */
  }
  return undefined;
}

function rememberLeadId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function useLeadSubmit() {
  const submitLead = useCallback(async (input: SubmitLeadInput): Promise<SubmitLeadResult | null> => {
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          consent: true,
          existingLeadId: readExistingLeadId(),
        }),
      });
      if (!res.ok) {
        toast.error("Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram.");
        return null;
      }
      const data = (await res.json()) as SubmitLeadResult;
      rememberLeadId(data.leadId);
      ymGoal(GOAL_BY_SOURCE[input.source]);
      return data;
    } catch {
      toast.error("Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram.");
      return null;
    }
  }, []);

  return { submitLead };
}
