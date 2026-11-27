import { useState } from "react";
import { reactiveBrief, type ReactiveBrief } from "@/lib/reactive-ai";
import { buildReactiveDemo, reactiveKitText } from "@/lib/reactive-kit";

const defaults: ReactiveBrief = {business:"",offer:"",averageCheck:0,objections:"",lastContact:"month",permittedOffer:"",tone:"professional"};
export function ReactiveBriefPreview() {
  const [brief,setBrief] = useState<ReactiveBrief>(defaults);
  const [message,setMessage] = useState("");
  const [report, setReport] = useState("");
  function change<K extends keyof ReactiveBrief>(key:K,value:ReactiveBrief[K]) {setBrief(b=>({...b,[key]:value}));setMessage("");setReport("");}
  function downloadReport() {
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "reactive-ai-demo.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
    <p className="text-sm font-semibold text-primary">РеАктив AI · демонстрационная анкета</p>
    <h2 className="mt-2 text-3xl font-bold">Верните клиентов, которые не купили</h2>
    <p className="mt-3 text-muted-foreground">Получите пример комплекта в браузере. Данные никуда не отправляются. Внешний AI и отправка сообщений выключены.</p>
    <form className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5" onSubmit={e=>{
      e.preventDefault();
      const result=reactiveBrief.safeParse(brief);
      if (!result.success) {
        setReport("");
        setMessage("Проверьте обязательные поля и ограничения длины.");
        return;
      }
      setReport(reactiveKitText(buildReactiveDemo(result.data)));
      setMessage("Локальный образец готов. Проверьте формулировки перед использованием.");
    }}>
      <label className="block text-sm">Сфера бизнеса<input required minLength={2} maxLength={160} value={brief.business} onChange={e=>change("business",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Товар или услуга<textarea required minLength={3} maxLength={1200} value={brief.offer} onChange={e=>change("offer",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Средний чек, ₽<input type="number" min={0} max={100000000} value={brief.averageCheck} onChange={e=>change("averageCheck",Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Причины отказов<textarea maxLength={1500} value={brief.objections} onChange={e=>change("objections",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Когда последний раз общались<select value={brief.lastContact} onChange={e=>change("lastContact",e.target.value as ReactiveBrief["lastContact"])} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="week">Неделю назад</option><option value="month">Месяц назад</option><option value="quarter">Три месяца назад</option><option value="older">Более трёх месяцев</option></select></label>
      <label className="block text-sm">Допустимые предложения и акции<textarea maxLength={1000} value={brief.permittedOffer} onChange={e=>change("permittedOffer",e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3"/></label>
      <label className="block text-sm">Стиль общения<select value={brief.tone} onChange={e=>change("tone",e.target.value as ReactiveBrief["tone"])} className="mt-1 w-full rounded-lg border border-border bg-background p-3"><option value="friendly">Дружелюбный</option><option value="professional">Деловой</option><option value="concise">Краткий</option></select></label>
      <p className="text-xs text-muted-foreground">Не вводите имена, телефоны и другие персональные данные покупателей.</p>
      <button type="submit" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Собрать локальный образец</button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
    {report && <section className="mt-6 rounded-2xl border border-border bg-card p-5" aria-labelledby="reactive-report">
      <h3 id="reactive-report" className="text-xl font-semibold">Пример комплекта</h3>
      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">{report}</pre>
      <button type="button" onClick={downloadReport} className="mt-4 rounded-lg border px-4 py-2">Скачать текст</button>
    </section>}
  </section>;
}
