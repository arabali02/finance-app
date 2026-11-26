"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Касса</h1>
          <p className="text-muted text-sm">Учёт KEMEL и JARYQ</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-muted">Email</span>
          <input name="email" type="email" autoComplete="email" required className="field" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">Пароль</span>
          <input name="password" type="password" autoComplete="current-password" required className="field" />
        </label>
        {state.error && (
          <p role="alert" className="text-negative text-sm">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
