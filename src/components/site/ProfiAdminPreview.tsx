import { useState } from "react";
import { microProducts, rewardBudget } from "@/lib/profi-market-policy";

const rub = (n: number) => (n/100).toLocaleString("ru-RU",{style:"currency",currency:"RUB"});
// Isolated development component: no admin route, real data or privileged actions.
export function ProfiAdminPreview() {
  const [sku,setSku] = useState<string>(microProducts[0].sku);
  const [cost,setCost] = useState(100);
  const [fee,setFee] = useState(11.7);
  const [tax,setTax] = useState(13);
  const [bonus,setBonus] = useState(2);
  const [partner,setPartner] = useState(5);
  const product = microProducts.find(p=>p.sku===sku) ?? microProducts[0];
  const result = rewardBudget({paid:product.price,production:Math.round(cost*100),paymentFee:Math.ceil(product.price*fee/100),taxReserve:Math.ceil(product.price*tax/100),otherCosts:0,requestedBonusBps:Math.round(bonus*100),requestedPartnerBps:Math.round(partner*100)});
  const fields = [{label:"Производство, ₽",value:cost,set:setCost,max:3000,step:1},{label:"Комиссия оплаты, %",value:fee,set:setFee,max:30,step:.1},{label:"Налоговый резерв, %",value:tax,set:setTax,max:40,step:.1},{label:"Бонусы, %",value:bonus,set:setBonus,max:10,step:.1},{label:"Партнёрка, %",value:partner,set:setPartner,max:15,step:.1}];
  return <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <p className="text-sm font-semibold text-primary">Profi Admin · прототип</p>
    <h2 className="mt-2 text-3xl font-bold">Управление доходностью</h2>
    <p className="mt-2 text-sm text-muted-foreground">Локальный сценарный калькулятор. Изменения не сохраняются и не влияют на цены, бонусы или продажи.</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <label className="block text-sm">Продукт<select className="mt-2 w-full rounded-lg border border-border bg-background p-3" value={sku} onChange={e=>setSku(e.target.value)}>{microProducts.map(p=><option key={p.sku} value={p.sku}>{p.name} — {rub(p.price)}</option>)}</select></label>
        {fields.map(f=><label key={f.label} className="block text-sm">{f.label}<input type="number" min={0} max={f.max} step={f.step} value={f.value} onChange={e=>f.set(Math.max(0,Math.min(f.max,Number(e.target.value)||0)))} className="mt-1 w-full rounded-lg border border-border bg-background p-2"/></label>)}
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xl font-bold">Экономика заказа</h3>
        <dl className="mt-4 space-y-3">{[["Выручка",product.price],["Лимит расходов",result.ceiling],["Полные расходы",result.total],["Остаток",product.price-result.total],["Доступный бюджет поощрений",result.available]].map(([label,value])=><div key={String(label)} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{rub(Number(value))}</dd></div>)}</dl>
        <p role="status" className="mt-5 rounded-lg border border-border p-3 font-semibold">{result.eligible?"Цель наценки выполнена":"Цель наценки 300% не выполнена"}</p>
        <p className="mt-3 text-xs text-muted-foreground">Добавьте фактические расходы на поддержку и привлечение в серверную модель перед запуском. Денежные выплаты отключены.</p>
      </div>
    </div>
  </section>;
}
