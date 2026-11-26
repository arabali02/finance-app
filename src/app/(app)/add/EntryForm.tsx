"use client";

import { useActionState, useState } from "react";
import { saveEntry, type EntryState, type EntryType } from "./actions";
import { formatTenge } from "@/lib/finance/format";
import type { Store } from "@/lib/finance/types";
import type { Category } from "@/lib/data/refs";

export type EntryInitial = {
  id?: string;
  type: EntryType;
  date: string;
  storeId?: string | null;
  kaspi?: number;
  cash?: number;
  terminal?: number;
  cogs?: number;
  amount?: number;
  categoryId?: string;
  note?: string | null;
};

const TYPES: { value: EntryType; label: string }[] = [
  { value: "sale", label: "Итог дня" },
  { value: "expense", label: "Расход" },
  { value: "purchase", label: "Закупка" },
  { value: "draw", label: "В личное" },
];

const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const show = (n?: number) => (n ? String(n) : "");

function Money({ name, label, defaultValue, error, onValue, autoFocus }: {
  name: string;
  label: string;
  defaultValue?: number;
  error?: string;
  onValue?: (n: number) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      <div className="relative">
        <input
          name={name}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          autoFocus={autoFocus}
          defaultValue={show(defaultValue)}
          onChange={(e) => onValue?.(digits(e.target.value))}
          aria-invalid={!!error}
          className="field pr-8 text-lg font-semibold"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">₸</span>
      </div>
      {error && <span className="text-sm text-negative">{error}</span>}
    </label>
  );
}

function Chips<T extends string>({ name, options, value, onChange }: {
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            value === o.value ? "border-accent bg-accent text-accent-text font-semibold" : "border-border bg-surface"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EntryForm({ stores, categories, initial }: { stores: Store[]; categories: Category[]; initial: EntryInitial }) {
  const [state, action, pending] = useActionState<EntryState, FormData>(saveEntry, {});
  const [type, setType] = useState<EntryType>(initial.type);
  const allowShared = type === "expense" || type === "draw";
  const [store, setStore] = useState<string>(initial.storeId ?? stores[0]?.id ?? "");
  const storeValue = !allowShared && store === "shared" ? stores[0]?.id ?? "" : store;
  const [sum, setSum] = useState({ kaspi: initial.kaspi ?? 0, cash: initial.cash ?? 0, terminal: initial.terminal ?? 0 });
  const bizExpense = categories.filter((c) => c.scope === "business" && c.kind === "expense");
  const [cat, setCat] = useState(initial.categoryId ?? bizExpense[0]?.id ?? "");
  const fe = state.fieldErrors ?? {};
  const editing = !!initial.id;

  const storeOptions = [
    ...stores.map((s) => ({ value: s.id, label: s.name })),
    ...(allowShared ? [{ value: "shared", label: "Общий" }] : []),
  ];

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {editing ? <input type="hidden" name="type" value={type} /> : <Chips name="type" options={TYPES} value={type} onChange={setType} />}

      <div className="card space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted">Магазин</span>
          <Chips name="store_id" options={storeOptions} value={storeValue} onChange={setStore} />
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-muted">Дата</span>
          <input name="date" type="date" required defaultValue={initial.date} className="field" />
        </label>

        {type === "sale" ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Money name="kaspi" label="Kaspi" defaultValue={initial.kaspi} error={fe.kaspi} onValue={(n) => setSum((s) => ({ ...s, kaspi: n }))} autoFocus={!editing} />
              <Money name="cash" label="Наличные" defaultValue={initial.cash} error={fe.cash} onValue={(n) => setSum((s) => ({ ...s, cash: n }))} />
              <Money name="terminal" label="Терминал" defaultValue={initial.terminal} error={fe.terminal} onValue={(n) => setSum((s) => ({ ...s, terminal: n }))} />
            </div>
            <div className="flex items-baseline justify-between rounded-xl bg-surface-2 px-3 py-2">
              <span className="text-sm text-muted">Выручка за день</span>
              <span className="text-lg font-bold">{formatTenge(sum.kaspi + sum.cash + sum.terminal)}</span>
            </div>
            <Money name="cogs" label="Закуп проданного товара (себестоимость)" defaultValue={initial.cogs} error={fe.cogs} />
          </>
        ) : (
          <>
            <Money name="amount" label="Сумма" defaultValue={initial.amount} error={fe.amount} autoFocus={!editing} />
            {type === "expense" && (
              <div className="space-y-1">
                <span className="text-sm text-muted">Категория</span>
                <Chips name="category_id" options={bizExpense.map((c) => ({ value: c.id, label: c.name }))} value={cat} onChange={setCat} />
              </div>
            )}
            <label className="block space-y-1">
              <span className="text-sm text-muted">Комментарий</span>
              <input name="note" defaultValue={initial.note ?? ""} className="field" placeholder="необязательно" />
            </label>
            {type === "purchase" && (
              <p className="text-xs text-muted">Закупка не уменьшает прибыль — прибыль считается по закупу проданного товара в итоге дня.</p>
            )}
            {type === "draw" && <p className="text-xs text-muted">Сумма уйдёт доходом в личный бюджет. Прибыль бизнеса не меняется.</p>}
          </>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-negative">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary w-full text-lg">
        {pending ? "Сохраняем…" : "Сохранить"}
      </button>
    </form>
  );
}
