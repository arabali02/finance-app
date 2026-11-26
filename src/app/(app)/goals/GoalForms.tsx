"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { createGoal, deleteGoal, topUpGoal, type GoalState } from "./actions";

function useResetOnOk(ok?: number) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

export function NewGoalForm() {
  const [state, action, pending] = useActionState<GoalState, FormData>(createGoal, {});
  const ref = useResetOnOk(state.ok);
  return (
    <form ref={ref} action={action} className="card space-y-3">
      <h2 className="font-semibold">Новая цель</h2>
      <input name="name" placeholder="Например: отдельное здание" className="field" aria-label="Название" />
      <input name="target" inputMode="numeric" placeholder="Сумма цели, ₸" className="field" aria-label="Сумма цели" />
      {state.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">Создать</button>
    </form>
  );
}

export function TopUpForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<GoalState, FormData>(topUpGoal, {});
  const ref = useResetOnOk(state.ok);
  const [delPending, start] = useTransition();
  return (
    <form ref={ref} action={action} className="space-y-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <input name="amount" inputMode="numeric" placeholder="Пополнить, ₸" className="field py-2" aria-label="Сумма пополнения" />
        <button disabled={pending} className="btn-primary py-2 whitespace-nowrap">+ Внести</button>
      </div>
      {state.error && <p role="alert" className="text-sm text-negative">{state.error}</p>}
      <button
        type="button"
        disabled={delPending}
        className="text-xs text-negative"
        onClick={() => confirm("Удалить цель?") && start(() => deleteGoal(id))}
      >
        Удалить цель
      </button>
    </form>
  );
}
