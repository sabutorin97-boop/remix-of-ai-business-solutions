import { createFileRoute, redirect } from "@tanstack/react-router";

// Старый URL страницы CRM (контент никогда не был про Авито — исторический
// артефакт названия файла). Оставлен как редирект, чтобы не ронять уже
// проиндексированные/сохранённые внешние ссылки на /avito.
export const Route = createFileRoute("/avito")({
  beforeLoad: () => {
    throw redirect({ to: "/crm" });
  },
});
