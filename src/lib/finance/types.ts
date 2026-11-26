export type Store = { id: string; name: string; sortOrder: number };

export type DaySale = {
  storeId: string;
  date: string;
  kaspi: number;
  cash: number;
  terminal: number;
  /** смешанная оплата (наличные + Kaspi одной продажей), из отчётов кассы */
  mixed?: number;
  cogs: number;
};

export type Expense = {
  storeId: string | null;
  date: string;
  categoryId: string;
  amount: number;
};

export type StoreProfit = {
  storeId: string;
  revenue: number;
  cogs: number;
  opex: number;
  tax: number;
  net: number;
};

export type ProfitTotals = Omit<StoreProfit, "storeId">;
