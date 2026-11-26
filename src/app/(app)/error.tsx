"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card space-y-3">
      <h1 className="text-xl font-bold">Не удалось загрузить данные</h1>
      <p className="text-muted">Проверьте интернет и попробуйте ещё раз. Если ошибка повторяется — данные не потеряны, напишите разработчику.</p>
      <button onClick={reset} className="btn-primary">Попробовать снова</button>
    </div>
  );
}
