import { it, expect } from "vitest";
import { todayLocal, periodRange } from "./dates";

it("сегодня по Кызылорде", () => {
  expect(todayLocal(new Date("2026-11-26T18:30:00Z"))).toBe("2026-11-26");
  expect(todayLocal(new Date("2026-11-26T19:30:00Z"))).toBe("2026-11-27");
});

it("границы периодов", () => {
  expect(periodRange("day", "2026-11-26")).toEqual({ from: "2026-11-26", to: "2026-11-26" });
  expect(periodRange("week", "2026-11-26")).toEqual({ from: "2026-11-23", to: "2026-11-29" });
  expect(periodRange("week", "2026-11-29")).toEqual({ from: "2026-11-23", to: "2026-11-29" });
  expect(periodRange("month", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  expect(periodRange("month", "2026-12-31")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
});
