import { useState } from "react";
import { reactiveBrief, type ReactiveBrief } from "@/lib/reactive-ai";

const defaults: ReactiveBrief = {business:"",offer:"",averageCheck:0,objections:"",lastContact:"month",permittedOffer:"",tone:"professional"};
export function ReactiveBriefPreview() {
  const [brief,setBrief] = useState<ReactiveBrief>(defaults);
  const [message,setMessage] = useState("");
  function change<K extends keyof ReactiveBrief>(key:K,value:ReactiveBrief[K]) {setBrief(b=>({...b,[key]:value}));setMessage("");}
  return <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
    <p className="text-sm font-semibold text-primary">РеАктив AI · демонстрационная анкета</p>
    <h2 className="mt-2 text-3xl font-bold">Верните клиентов, которые не купили</h2>
    <p className="mt-3 text-muted-foreground">Проверьте анкету перед запуском. Данные не отправляются, не сохраняются и не используются для генерации.</p>
    <form className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={e=>{e.preventDefault();const r=reactiveBrief.safeParse(brief);setMessage(r.success?"Анкета прошла проверку. Генерация и оплата пока отключены.":"Проверьте обязательные поля и ограничения длины.");}}>
      <label className="block text-sm">Сфера бизнеса<input required minLength={2} maxLength={160} value={brief.business} onChange={e=>change("business",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Товар или услуга<textarea required minLength={3} maxLength={1200} value={brief.offer} onChange={e=>change("offer",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Средний чек, ₽<input type="number" min={0} max={100000000} value={brief.averageCheck} onChange={e=>change("averageCheck",Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Причины отказов<textarea maxLength={1500} value={brief.objections} onChange={e=>change("objections",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Когда последний раз общались<select value={brief.lastContact} onChange={e=>change("lastContact",e.target.value as ReactiveBrief["lastContact"])} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="week">Неделю назад</option><option value="month">Месяц назад</option><option value="quarter">Три месяца назад</option><option value="older">Более трёх месяцев</option></select></label>
      <label className="block text-sm">Допустимые предложения и акции<textarea maxLength={1000} value={brief.permittedOffer} onChange={e=>change("permittedOffer",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Стиль общения<select value={brief.tone} onChange={e=>change("tone",e.target.value as ReactiveBrief["tone"])} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="friendly">Дружелюбный</option><option value="professional">Деловой</option><option value="concise">Краткий</option></select></label>
      <p className="text-xs text-muted-foreground">Не вводите имена, телефоны и другие персональные данные покупателей.</p>
      <button type="submit" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Проверить анкету</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  </section>;
}
