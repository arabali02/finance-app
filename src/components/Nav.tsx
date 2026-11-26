"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Главная", icon: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" },
  { href: "/operations", label: "Операции", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/products", label: "Товары", icon: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" },
  { href: "/reports", label: "Отчёты", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/personal", label: "Личное", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0" },
  { href: "/goals", label: "Цели", icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-5a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { href: "/settings", label: "Настройки", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1-1-2h-4l-1 2-2 1-2-1-2 4 2 1v0l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4z" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col gap-1 border-r border-border bg-surface p-4">
        <div className="mb-6 px-2">
          <div className="text-xl font-bold">Касса</div>
          <div className="text-xs text-muted">KEMEL · JARYQ</div>
        </div>
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active(it.href) ? "bg-surface-2 font-semibold" : "text-muted hover:bg-surface-2"}`}
          >
            <Icon d={it.icon} />
            {it.label}
          </Link>
        ))}
        <Link href="/add" className="btn-primary mt-4 text-center">
          + Добавить
        </Link>
      </aside>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-7 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[9px] ${active(it.href) ? "text-accent font-semibold" : "text-muted"}`}
          >
            <Icon d={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export function AddButton() {
  return (
    <Link
      href="/add"
      aria-label="Добавить операцию"
      className="md:hidden fixed right-4 bottom-20 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl text-accent-text shadow-lg"
    >
      +
    </Link>
  );
}
