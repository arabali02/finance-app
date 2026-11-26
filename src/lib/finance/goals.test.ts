import { it, expect } from "vitest";
import { goalProgress } from "./goals";

it("прогресс цели в процентах", () => {
  expect(goalProgress(0, 100)).toBe(0);
  expect(goalProgress(50, 200)).toBe(25);
  expect(goalProgress(300, 200)).toBe(100);
  expect(goalProgress(1, 3)).toBe(33);
  expect(goalProgress(10, 0)).toBe(0);
});
