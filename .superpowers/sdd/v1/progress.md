# SDD ledger — plan: docs/superpowers/plans/2026-11-26-finance-app-v1.md
Pre-flight: Task7 consumes computeProfit/expensesByCategory/loadPeriod (Task1,5) — consistent. Task4/8/9 consume parseAmount — consistent.
Ruling: no sdd-workspace script (subagent-driven-development skill not installed) — ledger kept manually at .superpowers/sdd/v1/progress.md — none.
Ruling: npm xlsx 0.18.5 has known CVEs and SheetJS CDN is blocked by proxy — use exceljs instead; buildReportWorkbook returns ExcelJS.Workbook — Excel export API differs from plan.
Ruling: @types/node pinned to 22 for vitest peer — none.
