import { Money } from "@/components/Money";
import { NewGoalForm, TopUpForm } from "./GoalForms";
import { createServerClient } from "@/lib/supabase/server";
import { goalProgress } from "@/lib/finance/goals";

export default async function GoalsPage() {
  const sb = await createServerClient();
  const { data } = await sb.from("goals").select("id,name,target,saved").order("created_at");
  const goals = (data ?? []).map((g) => ({ ...g, target: Number(g.target), saved: Number(g.saved) }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Цели</h1>
      {goals.map((g) => {
        const pct = goalProgress(g.saved, g.target);
        const left = Math.max(0, g.target - g.saved);
        return (
          <section key={g.id} className="card space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{g.name}</h2>
              <span className="text-2xl font-bold">{pct}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={g.name}>
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-muted">
              Накоплено <Money value={g.saved} className="text-text font-semibold" /> из <Money value={g.target} />
              {left > 0 ? <> · осталось <Money value={left} /></> : " · цель достигнута 🎉"}
            </p>
            <TopUpForm id={g.id} />
          </section>
        );
      })}
      {goals.length === 0 && <p className="card text-muted">Пока нет целей. Создайте первую — например, на отдельное здание.</p>}
      <NewGoalForm />
    </div>
  );
}
