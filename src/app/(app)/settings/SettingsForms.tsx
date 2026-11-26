"use client";

import { useSubmit } from "@/lib/ui/useSubmit";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { addCategory, deleteCategory, renameCategory, saveTaxRate, type SettingsState } from "./actions";
import type { Category } from "@/lib/data/refs";

export function TaxForm({ percent }: { percent: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveTaxRate, {});
  const submit = useSubmit(action);
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">Налог (упрощёнка)</h2>
      <div className="flex items-center gap-2">
        <input name="tax_percent" inputMode="decimal" defaultValue={String(percent)} className="field w-24" aria-label="Ставка налога, %" />
        <span className="text-muted">% от выручки</span>
        <button disabled={pending} className="btn-primary ml-auto py-2">Сохранить</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
      {state.ok && !state.error && <p role="status" className="text-sm text-positive">✓ Сохранено</p>}
    </form>
  );
}

const GROUPS: { key: string; label: string }[] = [
  { key: "business:expense", label: "Расходы бизнеса" },
  { key: "personal:expense", label: "Личные расходы" },
  { key: "personal:income", label: "Личные доходы" },
];

function CategoryRow({ c }: { c: Category }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) alert(r.error);
    });
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <span className="min-w-0 truncate">{c.name}</span>
      <span className="flex shrink-0 gap-3 text-sm">
        <button
          type="button"
          disabled={pending}
          className="text-accent"
          onClick={() => {
            const n = prompt("Новое название", c.name);
            if (n && n !== c.name) run(() => renameCategory(c.id, n));
          }}
        >
          Переименовать
        </button>
        <button type="button" disabled={pending} className="text-negative" onClick={() => confirm(`Удалить «${c.name}»?`) && run(() => deleteCategory(c.id))}>
          Удалить
        </button>
      </span>
    </li>
  );
}

export function CategoriesForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(addCategory, {});
  const submit = useSubmit(action);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);
  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Категории</h2>
      {GROUPS.map((g) => {
        const [scope, kind] = g.key.split(":");
        const list = categories.filter((c) => c.scope === scope && c.kind === kind);
        return (
          <div key={g.key}>
            <h3 className="text-sm text-muted">{g.label}</h3>
            <ul className="divide-y divide-border">{list.map((c) => <CategoryRow key={c.id} c={c} />)}</ul>
          </div>
        );
      })}
      <form ref={ref} onSubmit={submit} className="space-y-2 border-t border-border pt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select name="group" className="field" aria-label="Раздел">
            {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
          <input name="name" placeholder="Название категории" className="field" aria-label="Название категории" />
        </div>
        {state.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
        <button disabled={pending} className="btn-ghost w-full">+ Добавить категорию</button>
      </form>
    </section>
  );
}
