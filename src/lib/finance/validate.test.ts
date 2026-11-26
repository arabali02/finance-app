import { it, expect } from "vitest";
import { parseAmount } from "./validate";

it("принимает суммы с пробелами", () => {
  expect(parseAmount("12 500")).toEqual({ ok: true, value: 12500 });
  expect(parseAmount("12500")).toEqual({ ok: true, value: 12500 });
  expect(parseAmount(" 7 000 ")).toEqual({ ok: true, value: 7000 });
});

it("отклоняет пустое, текст, ноль, минус, дроби", () => {
  for (const raw of ["", "abc", "0", "-5", "1.5", "1,5", "12a"]) {
    expect(parseAmount(raw)).toEqual({ ok: false, error: "Введите сумму больше нуля" });
  }
});

it("allowZero: пустое и ноль = 0, остальное как обычно", () => {
  expect(parseAmount("", { allowZero: true })).toEqual({ ok: true, value: 0 });
  expect(parseAmount("0", { allowZero: true })).toEqual({ ok: true, value: 0 });
  expect(parseAmount("-1", { allowZero: true })).toEqual({ ok: false, error: "Введите сумму 0 или больше" });
});

it("отклоняет слишком большие суммы", () => {
  expect(parseAmount("10000000000000").ok).toBe(false);
});
