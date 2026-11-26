import { it, expect } from "vitest";
import { formatTenge } from "./format";

it("форматирует тенге", () => {
  expect(formatTenge(1234567)).toBe("1 234 567 ₸");
  expect(formatTenge(-500)).toBe("−500 ₸");
  expect(formatTenge(0)).toBe("0 ₸");
});
