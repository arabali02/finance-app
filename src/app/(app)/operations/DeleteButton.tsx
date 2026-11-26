"use client";

import { useTransition } from "react";
import { deleteOperation, type OpType } from "./actions";

export function DeleteButton({ type, id }: { type: OpType; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Удалить запись?")) return;
        start(async () => {
          const r = await deleteOperation(type, id);
          if (r.error) alert(r.error);
        });
      }}
      className="text-sm text-negative disabled:opacity-50"
    >
      {pending ? "…" : "Удалить"}
    </button>
  );
}
