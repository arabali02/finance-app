// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup, act } from "@testing-library/react";

vi.mock("./actions", () => ({
  saveEntry: vi.fn(async () => ({ error: "Введите хотя бы одну сумму продаж" })),
}));

import { EntryForm } from "./EntryForm";

afterEach(cleanup);

it("при ошибке сохранения дата и суммы не сбрасываются", async () => {
  const { container, findByRole } = render(
    <EntryForm
      stores={[{ id: "A", name: "KEMEL", sortOrder: 0 }]}
      categories={[]}
      initial={{ type: "sale", date: "2026-11-26" }}
    />,
  );
  const date = container.querySelector<HTMLInputElement>("input[name=date]")!;
  const cogs = container.querySelector<HTMLInputElement>("input[name=cogs]")!;
  fireEvent.change(date, { target: { value: "2026-11-25" } });
  fireEvent.change(cogs, { target: { value: "5000" } });
  await act(async () => {
    fireEvent.submit(container.querySelector("form")!);
  });
  await findByRole("alert");
  await waitFor(() => {
    expect(container.querySelector<HTMLInputElement>("input[name=date]")!.value).toBe("2026-11-25");
    expect(container.querySelector<HTMLInputElement>("input[name=cogs]")!.value).toBe("5000");
  });
});
