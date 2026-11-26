import { CategoriesForm, TaxForm } from "./SettingsForms";
import { getCategories, getTaxRate } from "@/lib/data/refs";
import { signOut } from "@/app/login/actions";

export default async function SettingsPage() {
  const [rate, categories] = await Promise.all([getTaxRate(), getCategories()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <TaxForm percent={Math.round(rate * 10000) / 100} />
      <CategoriesForm categories={categories} />
      <form action={signOut}>
        <button className="btn-ghost w-full text-negative">Выйти</button>
      </form>
    </div>
  );
}
