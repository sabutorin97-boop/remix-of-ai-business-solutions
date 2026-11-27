import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";

const accountEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { isProfiAccountEnabled } = await import("@/lib/profi-account-runtime.server");
  return isProfiAccountEnabled();
});

export const Route = createFileRoute("/profi-account")({
  beforeLoad: async () => {
    if (!await accountEnabled()) throw notFound();
  },
  head: () => ({ meta: [
    { title: "Кабинет покупателя — Profi Market" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AccountPage,
});

type Account = {
  orders: { id: string; status: keyof typeof statuses; created_at: string; amount_minor: string; items: string[] | null }[];
  products: { sku: string; name: string; amount_minor: string }[];
};

const statuses = { pending: "Ожидает оплаты", paid: "Оплачен", cancelled: "Отменён", refunded: "Возвращён" };
const formatMoney = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" });
const money = (minor: string) => formatMoney.format(Number(minor) / 100);
const formatDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Europe/Moscow" });

async function readAccount(signal?: AbortSignal): Promise<Account | null> {
  const response = await fetch("/api/profi-account", { cache: "no-store", signal });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Кабинет временно недоступен.");
  return response.json();
}

function AccountPage() {
  const [account, setAccount] = useState<Account | null>();
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const requestKeys = useRef(new Map<string, string>());

  useEffect(() => {
    const abort = new AbortController();
    readAccount(abort.signal).then(setAccount).catch(() => {
      if (!abort.signal.aborted) {
        setFailed(true);
        setNotice("Кабинет временно недоступен. Обнови страницу через минуту.");
      }
    });
    return () => abort.abort();
  }, []);

  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch {
      setNotice("Сервис временно недоступен. Повтори попытку.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function order(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sku) return;
    void perform(async () => {
      const requestKey = requestKeys.current.get(sku) ?? crypto.randomUUID();
      requestKeys.current.set(sku, requestKey);
      const response = await fetch("/api/profi-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey, skus: [sku] }),
      });
      if (response.status === 401) {
        setAccount(null);
        return;
      }
      if (response.status === 422) {
        setNotice("Заказ отклонён. Проверь доступность товара.");
        return;
      }
      if (!response.ok) throw new Error("Не удалось оформить заказ");
      setAccount(await readAccount());
      requestKeys.current.delete(sku);
      setSku("");
      setNotice("Тестовый заказ создан.");
    });
  }

  function logout() {
    void perform(async () => {
      const response = await fetch("/api/profi-account", { method: "POST" });
      if (!response.ok) throw new Error("Не удалось выйти");
      requestKeys.current.clear();
      setSku("");
      setAccount(null);
    });
  }

  return (
    <section className="mx-auto max-w-4xl space-y-7 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Тестовый стенд · оплата отключена</p>
          <h1 className="mt-1 text-3xl font-bold">Кабинет покупателя</h1>
        </div>
        {account && <button type="button" onClick={logout} disabled={busy}
          className="rounded-lg border px-4 py-2 disabled:opacity-50">Выйти</button>}
      </header>
      {account === undefined && !failed && <p role="status">Загружаем кабинет…</p>}
      {account === null && (
        <a className="inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          href="/api/profi-login/telegram/">Войти через Telegram</a>
      )}
      {account && <>
        <form onSubmit={order} className="grid gap-3 rounded-2xl border bg-card p-5">
          <h2 className="text-xl font-semibold">Новый заказ</h2>
          {account.products.length === 0 ? <p>Тестовых товаров пока нет.</p> : <>
            <label htmlFor="profi-account-sku">Товар</label>
            <select id="profi-account-sku" value={sku} onChange={(event) => setSku(event.target.value)}
              required disabled={busy} className="rounded-lg border bg-background px-3 py-2">
              <option value="">Выбери товар</option>
              {account.products.map((product) => <option key={product.sku} value={product.sku}>
                {product.name} · {money(product.amount_minor)}
              </option>)}
            </select>
            <button type="submit" disabled={busy || !sku}
              className="justify-self-start rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
              Создать тестовый заказ
            </button>
          </>}
        </form>
        <section aria-labelledby="profi-orders-title">
          <h2 id="profi-orders-title" className="text-xl font-semibold">Мои заказы</h2>
          {account.orders.length === 0 ? <p className="mt-2">У тебя пока нет заказов.</p> :
            <ul className="mt-3 grid gap-3">
              {account.orders.map((entry) => <li key={entry.id}
                className="flex flex-wrap justify-between gap-3 rounded-xl border bg-card p-4">
                <div>
                  <p className="font-medium">{entry.items?.join(", ") || "Заказ"}</p>
                  <p className="text-sm text-muted-foreground">{formatDate.format(new Date(entry.created_at))}</p>
                </div>
                <div>
                  <p className="font-medium">{money(entry.amount_minor)}</p>
                  <p className="text-sm text-muted-foreground">{statuses[entry.status]}</p>
                </div>
              </li>)}
            </ul>}
        </section>
      </>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
