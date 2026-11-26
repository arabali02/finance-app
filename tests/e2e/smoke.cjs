// Smoke: без сессии любая страница уводит на /login. Запуск: node tests/e2e/smoke.cjs <baseURL>
const { chromium } = require("playwright");
(async () => {
const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 760 } });
let fail = 0;
for (const p of ["/", "/reports", "/add"]) {
  await page.goto(base + p);
  const ok = new URL(page.url()).pathname === "/login" && (await page.getByRole("button", { name: "Войти" }).isVisible());
  console.log(ok ? "PASS" : "FAIL", p, "→", page.url());
  if (!ok) fail++;
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(overflow ? "FAIL horizontal scroll" : "PASS no horizontal scroll");
await browser.close();
process.exit(fail || overflow ? 1 : 0);
})();
