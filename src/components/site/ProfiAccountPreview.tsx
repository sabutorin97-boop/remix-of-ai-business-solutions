import { useState } from "react";
import { Gift, Package, Users, Wallet } from "lucide-react";
import { loyaltyTiers, loyaltyTier } from "@/lib/profi-market-policy";

const money = (minor: number) => (minor / 100).toLocaleString("ru-RU") + " ₽";
const tabs = ["Покупки", "Бонусы", "Партнёрка"] as const;
// Preview only: no personal data, no authenticated account, no payment or mutation requests.
export function ProfiAccountPreview() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Покупки");
  const [copied, setCopied] = useState(false);
  const lifetime = 2490000;
  const tier = loyaltyTier(lifetime);
  const next = loyaltyTiers.find(t => t.threshold > lifetime);
  const demoLink = "https://aiprofigrup.ru/shop?ref=DEMO0001";
  async function copy() {
    try { await navigator.clipboard.writeText(demoLink); setCopied(true); }
    catch { setCopied(false); }
  }
  return <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8" aria-labelledby="account-preview-title">
    <p className="text-sm font-semibold text-primary">Profi Account · демонстрация</p>
    <h2 id="account-preview-title" className="mt-2 text-3xl font-bold">Ваш личный кабинет</h2>
    <p className="mt-2 text-sm text-muted-foreground">Пример интерфейса. Все суммы вымышлены. Регистрация, начисления и выплаты пока не подключены.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {([{Icon:Package,label:"Покупки",value:"1"},{Icon:Gift,label:"Бонусы (пример)",value:"498,00"},{Icon:Wallet,label:"Партнёрский баланс (пример)",value:money(99000)}]).map(({Icon,label,value})=><article key={label} className="rounded-2xl border border-border bg-card p-5"><Icon className="size-5 text-primary" aria-hidden/><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></article>)}
    </div>
    <nav className="mt-6 flex flex-wrap gap-2" aria-label="Разделы демонстрации">{tabs.map(t=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)} className={"rounded-full border px-4 py-2 text-sm font-semibold "+(tab===t?"bg-primary text-primary-foreground":"border-border hover:bg-secondary")}>{t}</button>)}</nav>
    <div className="mt-4 rounded-2xl border border-border bg-card p-6">
      {tab==="Покупки" && <><h3 className="text-xl font-bold">История покупок</h3><div className="mt-4 flex flex-wrap justify-between gap-3"><span>Нейросотрудник · Всё включено (пример)</span><strong>{money(lifetime)}</strong></div><p className="mt-3 text-sm text-muted-foreground">Здесь появятся инструкции и доступы после подтверждения реальной оплаты.</p></>}
      {tab==="Бонусы" && <><h3 className="text-xl font-bold">Уровень {tier.name}</h3><p className="mt-2">Предельная ставка уровня: {tier.bps/100}%</p><p className="text-sm text-muted-foreground">{next ? "До "+next.name+": "+money(next.threshold-lifetime) : "Максимальный уровень"}</p><div className="mt-4 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width:(next?Math.min(100,lifetime/next.threshold*100):100)+"%"}}/></div><p className="mt-4 text-sm">Фактические ставки зависят от экономики товара. Баллы не выводятся в деньги.</p></>}
      {tab==="Партнёрка" && <><Users className="size-6 text-primary" aria-hidden/><h3 className="mt-2 text-xl font-bold">Приглашайте покупателей</h3><p className="mt-2 text-sm text-muted-foreground">Демо-ссылка не регистрирует рефералов. Денежные выплаты отключены.</p><div className="mt-4 flex flex-wrap items-center gap-3"><code className="break-all text-sm">{demoLink}</code><button type="button" onClick={copy} className="rounded-lg border border-border px-3 py-2 text-sm">{copied?"Скопировано":"Копировать пример"}</button></div></>}
    </div>
  </section>;
}
