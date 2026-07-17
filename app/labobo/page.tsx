import { getSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import AddItemForm from "./AddItemForm";
import {
  addCategory,
  addPrice,
  deleteCategory,
  deleteItem,
  deletePrice,
  loginAction,
  logoutAction,
  toggleAvailable,
  toggleNew,
  updateCategory,
  updateItem,
} from "./actions";

export const dynamic = "force-dynamic";

type Category = { id: string; name_ar: string; name_en: string; sort_order: number };
type Item = {
  id: string;
  category_id: string;
  name_ar: string;
  name_en: string;
  image_url: string | null;
  is_available: boolean;
  is_new: boolean;
  sort_order: number;
};
type Price = {
  id: string;
  item_id: string;
  size_label_ar: string | null;
  size_label_en: string | null;
  price: number;
  sort_order: number;
};

// Shared visual system (cream/coffee identity — matches the public menu)
const inputClass =
  "w-full rounded-lg border border-[#e7dcc9] bg-white px-3 py-2 text-sm text-[#2b2018] outline-none placeholder:text-[#b5a48f] focus:border-[#7a4a24] focus:ring-2 focus:ring-[#7a4a24]/20";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-[#5c4632]";
const primaryButtonClass =
  "rounded-lg bg-[#7a4a24] px-5 py-2.5 text-sm font-medium text-[#F9F7F2] shadow-sm hover:bg-[#63391a]";
const secondaryButtonClass =
  "rounded-lg border border-[#e7dcc9] bg-white px-4 py-2 text-sm font-medium text-[#7a4a24] hover:bg-[#f3ead9]";
const dangerButtonClass =
  "rounded-lg border border-[#e5b8ae] bg-white px-4 py-2 text-sm font-medium text-[#9c3d2e] hover:bg-[#faeeeb]";
const panelClass = "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#eee7da] sm:p-5";
const summaryClass = "cursor-pointer text-sm font-medium text-[#7a4a24]";

export default async function LaboboPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; m?: string; e?: string }>;
}) {
  const authed = await getSession();
  const { error, m, e } = await searchParams;

  if (!authed) {
    return (
      <main
        dir="rtl"
        lang="ar"
        className="flex min-h-screen items-center justify-center bg-[#F9F7F2] p-8 text-[#2b2018]"
      >
        <form
          action={loginAction}
          className="flex w-full max-w-xs flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#eee7da]"
        >
          <p className="text-center text-xs font-medium tracking-[0.3em] text-[#a08b76]">
            EDGE CAFE
          </p>
          <h1 className="text-center text-2xl font-bold">تسجيل الدخول</h1>
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="كلمة المرور"
            className={`${inputClass} text-center`}
          />
          {error && (
            <p className="text-center text-sm text-[#9c3d2e]">كلمة المرور غير صحيحة</p>
          )}
          <button type="submit" className={primaryButtonClass}>
            دخول
          </button>
        </form>
      </main>
    );
  }

  const supabase = createServiceClient();
  const [categoriesRes, itemsRes, pricesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("items").select("*").order("sort_order"),
    supabase.from("prices").select("*").order("sort_order"),
  ]);
  if (categoriesRes.error || itemsRes.error || pricesRes.error) {
    throw new Error("Failed to load dashboard data");
  }
  const categories = (categoriesRes.data ?? []) as Category[];
  const items = (itemsRes.data ?? []) as Item[];
  const prices = (pricesRes.data ?? []) as Price[];

  const itemsByCategory = new Map<string, Item[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  }
  const pricesByItem = new Map<string, Price[]>();
  for (const price of prices) {
    const list = pricesByItem.get(price.item_id) ?? [];
    list.push(price);
    pricesByItem.set(price.item_id, list);
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#F9F7F2] text-[#2b2018]">
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.3em] text-[#a08b76]">
              EDGE CAFE
            </p>
            <h1 className="mt-1 text-2xl font-bold">لوحة التحكم</h1>
          </div>
          <form action={logoutAction}>
            <button type="submit" className={secondaryButtonClass}>
              تسجيل الخروج
            </button>
          </form>
        </header>

        {m && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {m}
          </p>
        )}
        {e && (
          <p className="mb-4 rounded-xl border border-[#e5b8ae] bg-[#faeeeb] px-4 py-3 text-sm text-[#9c3d2e]">
            {e}
          </p>
        )}

        {/* ------------------------------ Categories ------------------------ */}
        <section className={`${panelClass} mb-6`}>
          <h2 className="mb-4 text-xl font-bold text-[#7a4a24]">التصنيفات</h2>

          <ul className="flex flex-col divide-y divide-[#f3ead9]">
            {categories.map((category) => (
              <li key={category.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold">{category.name_ar}</span>{" "}
                    <span className="text-sm text-[#a08b76]">
                      {category.name_en} · ترتيب {category.sort_order}
                    </span>
                  </span>
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button type="submit" className={dangerButtonClass}>
                      حذف
                    </button>
                  </form>
                </div>
                <details className="mt-2">
                  <summary className={summaryClass}>تعديل</summary>
                  <form
                    action={updateCategory}
                    className="mt-3 flex flex-col gap-3 rounded-xl bg-[#F9F7F2] p-3 sm:flex-row sm:items-end"
                  >
                    <input type="hidden" name="id" value={category.id} />
                    <label className={`${labelClass} flex-1`}>
                      الاسم بالعربية
                      <input name="name_ar" required defaultValue={category.name_ar} className={inputClass} />
                    </label>
                    <label className={`${labelClass} flex-1`}>
                      الاسم بالإنجليزية
                      <input name="name_en" required defaultValue={category.name_en} dir="ltr" className={inputClass} />
                    </label>
                    <label className={labelClass}>
                      الترتيب
                      <input
                        name="sort_order"
                        type="number"
                        defaultValue={category.sort_order}
                        className={`${inputClass} sm:w-24`}
                      />
                    </label>
                    <button type="submit" className={primaryButtonClass}>
                      حفظ
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>

          <details className="mt-4 border-t border-[#f3ead9] pt-4">
            <summary className={summaryClass}>+ إضافة تصنيف</summary>
            <form
              action={addCategory}
              className="mt-3 flex flex-col gap-3 rounded-xl bg-[#F9F7F2] p-3 sm:flex-row sm:items-end"
            >
              <label className={`${labelClass} flex-1`}>
                الاسم بالعربية
                <input name="name_ar" required placeholder="مثال: قهوة ساخنة" className={inputClass} />
              </label>
              <label className={`${labelClass} flex-1`}>
                الاسم بالإنجليزية
                <input name="name_en" required placeholder="Hot Coffee" dir="ltr" className={inputClass} />
              </label>
              <label className={labelClass}>
                الترتيب
                <input name="sort_order" type="number" defaultValue={0} className={`${inputClass} sm:w-24`} />
              </label>
              <button type="submit" className={primaryButtonClass}>
                إضافة
              </button>
            </form>
          </details>
        </section>

        {/* ------------------------------ Items ----------------------------- */}
        <section className={panelClass}>
          <h2 className="mb-4 text-xl font-bold text-[#7a4a24]">الأصناف</h2>

          <details
            className="mb-5 rounded-xl bg-[#F9F7F2] p-3 ring-1 ring-[#eee7da]"
            open={items.length === 0}
          >
            <summary className={summaryClass}>+ إضافة صنف جديد</summary>
            <div className="mt-3">
              <AddItemForm
                categories={categories.map(({ id, name_ar }) => ({ id, name_ar }))}
              />
            </div>
          </details>

          {categories.map((category) => {
            const categoryItems = itemsByCategory.get(category.id) ?? [];
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="mb-6 last:mb-0">
                <h3 className="mb-2 border-b border-[#f3ead9] pb-1 font-bold text-[#5c4632]">
                  {category.name_ar}
                </h3>
                <ul className="flex flex-col gap-3">
                  {categoryItems.map((item) => {
                    const itemPrices = pricesByItem.get(item.id) ?? [];
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl border border-[#eee7da] bg-[#fdfcf9] p-3 sm:p-4"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-bold">{item.name_ar}</span>
                          <span className="text-sm text-[#a08b76]">{item.name_en}</span>
                          {item.is_new && (
                            <span className="rounded-full bg-[#7a4a24] px-2.5 py-0.5 text-xs font-medium text-[#F9F7F2]">
                              جديد
                            </span>
                          )}
                          {!item.is_available && (
                            <span className="rounded-full bg-[#2b2018]/10 px-2.5 py-0.5 text-xs font-medium text-[#5c4632]">
                              غير متوفّر
                            </span>
                          )}
                        </div>

                        <ul className="mt-2 flex flex-col gap-1 text-sm">
                          {itemPrices.map((price) => (
                            <li key={price.id} className="flex items-center gap-3">
                              <span>
                                {price.size_label_ar ? (
                                  <span className="text-[#a08b76]">
                                    {price.size_label_ar} ·{" "}
                                  </span>
                                ) : null}
                                <span className="font-semibold text-[#7a4a24]">
                                  IQD {Number(price.price).toFixed(3)}
                                </span>
                              </span>
                              <form action={deletePrice}>
                                <input type="hidden" name="id" value={price.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-[#9c3d2e] hover:underline"
                                >
                                  حذف السعر
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <form action={toggleAvailable}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="value" value={item.is_available ? "0" : "1"} />
                            <button type="submit" className={secondaryButtonClass}>
                              {item.is_available ? "إيقاف التوفّر" : "تفعيل التوفّر"}
                            </button>
                          </form>
                          <form action={toggleNew}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="value" value={item.is_new ? "0" : "1"} />
                            <button type="submit" className={secondaryButtonClass}>
                              {item.is_new ? "إزالة شارة جديد" : "وضع شارة جديد"}
                            </button>
                          </form>
                          <form action={deleteItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" className={dangerButtonClass}>
                              حذف الصنف
                            </button>
                          </form>
                        </div>

                        <details className="mt-3">
                          <summary className={summaryClass}>إضافة حجم/سعر</summary>
                          <form
                            action={addPrice}
                            className="mt-3 flex flex-col gap-3 rounded-xl bg-[#F9F7F2] p-3 sm:flex-row sm:items-end"
                          >
                            <input type="hidden" name="item_id" value={item.id} />
                            <label className={`${labelClass} flex-1`}>
                              الحجم بالعربية (اختياري)
                              <input name="size_label_ar" placeholder="وسط" className={inputClass} />
                            </label>
                            <label className={`${labelClass} flex-1`}>
                              الحجم بالإنجليزية
                              <input name="size_label_en" placeholder="Medium" dir="ltr" className={inputClass} />
                            </label>
                            <label className={labelClass}>
                              السعر
                              <input
                                name="price"
                                type="number"
                                step="0.001"
                                min="0"
                                required
                                dir="ltr"
                                className={`${inputClass} sm:w-28`}
                              />
                            </label>
                            <button type="submit" className={primaryButtonClass}>
                              إضافة
                            </button>
                          </form>
                        </details>

                        <details className="mt-2">
                          <summary className={summaryClass}>تعديل الصنف</summary>
                          <form
                            action={updateItem}
                            className="mt-3 flex flex-col gap-3 rounded-xl bg-[#F9F7F2] p-3"
                          >
                            <input type="hidden" name="id" value={item.id} />
                            <label className={labelClass}>
                              التصنيف
                              <select name="category_id" defaultValue={item.category_id} className={inputClass}>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name_ar}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                              <label className={`${labelClass} flex-1`}>
                                الاسم بالعربية
                                <input name="name_ar" required defaultValue={item.name_ar} className={inputClass} />
                              </label>
                              <label className={`${labelClass} flex-1`}>
                                الاسم بالإنجليزية
                                <input name="name_en" required defaultValue={item.name_en} dir="ltr" className={inputClass} />
                              </label>
                            </div>
                            <label className={labelClass}>
                              رابط الصورة (اختياري)
                              <input
                                name="image_url"
                                type="url"
                                defaultValue={item.image_url ?? ""}
                                dir="ltr"
                                className={inputClass}
                              />
                            </label>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <label className="flex items-center gap-2 font-medium text-[#5c4632]">
                                <input
                                  type="checkbox"
                                  name="is_available"
                                  defaultChecked={item.is_available}
                                  className="h-4 w-4 accent-[#7a4a24]"
                                />
                                متوفّر
                              </label>
                              <label className="flex items-center gap-2 font-medium text-[#5c4632]">
                                <input
                                  type="checkbox"
                                  name="is_new"
                                  defaultChecked={item.is_new}
                                  className="h-4 w-4 accent-[#7a4a24]"
                                />
                                جديد
                              </label>
                              <label className="flex items-center gap-2 font-medium text-[#5c4632]">
                                الترتيب
                                <input
                                  name="sort_order"
                                  type="number"
                                  defaultValue={item.sort_order}
                                  className={`${inputClass} w-24`}
                                />
                              </label>
                            </div>
                            <button type="submit" className={primaryButtonClass}>
                              حفظ التعديلات
                            </button>
                          </form>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
