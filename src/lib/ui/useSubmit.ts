"use client";

import { useTransition, type FormEvent } from "react";

/**
 * Отправка формы в server action без автосброса полей.
 * React 19 очищает поля формы с `action={fn}` после каждого вызова — даже при ошибке.
 * Через onSubmit поля остаются, и пользователь исправляет только ошибку.
 */
export function useSubmit(dispatch: (fd: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(() => dispatch(fd));
  };
}
