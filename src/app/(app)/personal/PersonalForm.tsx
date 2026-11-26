"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addPersonal, deletePersonal, type PersonalState } from "./actions";
import type { Category } from "@/lib/data/refs";

export function PersonalForm({ categories, today }: { categories: Category[]; today: string }) {
  const [state, action, pending] = useActionState<PersonalState, FormData>(addPersonal, {});
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const list = categories.filter((c) => c.kind === kind);
  const [cat, setCat] = useState("");
  const catValue = list.some((c) => c.id === cat) ? cat : list[0]?.id ?? "";
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-accent-text font-semibold" : "border-border bg-surface"}`;

  return (
    <form ref={formRef} action={action} className="card space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="category_id" value={catValue} />
      <div className="flex gap-2">
        <button type="button" className={chip(kind === "expense")} onClick={() => setKind("expense")}>Расход</button>
        <button type="button" className={chip(kind === "income")} onClick={() => setKind("income")}>Доход</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button type="button" key={c.id} className={chip(catValue === c.id)} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" inputMode="numeric" placeholder="Сумма, ₸" className="field" aria-label="Сумма" />
        <input name="date" type="date" defaultValue={today} className="field" aria-label="Дата" />
      </div>
      <input name="note" placeholder="Комментарий (необязательно)" className="field" />
      {state.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Сохраняем…" : "Добавить"}</button>
    </form>
  );
}

export function DeletePersonal({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-negative"
      onClick={() => {
        if (!confirm("Удалить запись?")) return;
        start(async () => {
          const r = await deletePersonal(id);
          if (r.error) alert(r.error);
        });
      }}
    >
      Удалить
    </button>
  );
}
