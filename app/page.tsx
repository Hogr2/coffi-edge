import { createServiceClient } from "@/lib/supabase";
import CategoryChips from "./CategoryChips";
import ItemImage from "./ItemImage";
import Reveal from "./Reveal";

// The manager edits the menu and expects it fresh — never prerender stale data.
export const dynamic = "force-dynamic";

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
};

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

function formatPrice(value: number): string {
  return `IQD ${Number(value).toFixed(3)}`;
}

export default async function MenuPage() {
  const supabase = createServiceClient();

  const [categoriesRes, itemsRes, pricesRes] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("items").select("*").order("sort_order"),
    supabase.from("prices").select("*").order("sort_order"),
  ]);

  if (categoriesRes.error || itemsRes.error || pricesRes.error) {
    throw new Error("Failed to load the menu");
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

  const visibleCategories = categories.filter(
    (category) => (itemsByCategory.get(category.id) ?? []).length > 0
  );
  const firstCategoryId = visibleCategories[0]?.id;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#F9F7F2] text-[#2b2018]">
      {/* ------------------------------- Hero ---------------------------- */}
      <header className="bg-gradient-to-b from-[#e9dcc3] via-[#f3ead9] to-[#F9F7F2] px-4 pb-12 pt-16 text-center">
        <p className="text-sm font-medium tracking-[0.3em] text-[#8a7460]">
          EDGE CAFE
        </p>
        <h1 className="mt-2 text-4xl font-extrabold text-[#2b2018] sm:text-5xl">
          إيدج كافيه
        </h1>
        <p className="mt-4 text-lg text-[#7a4a24]">
          قهوة مختصّة وأجواء تناسب يومك
        </p>
        <p className="mt-1 text-sm text-[#8a7460]">يومياً 7:00 ص — 1:00 ص</p>
        {firstCategoryId && (
          <a
            href={`#cat-${firstCategoryId}`}
            className="mt-7 inline-block rounded-full bg-[#7a4a24] px-8 py-2.5 font-medium text-[#F9F7F2] shadow-md motion-safe:transition-transform hover:bg-[#63391a] motion-safe:hover:-translate-y-0.5 active:translate-y-0"
          >
            عرض القائمة
          </a>
        )}
      </header>

      {/* ----------------------- Sticky category chips ------------------- */}
      <CategoryChips
        categories={visibleCategories.map(({ id, name_ar }) => ({ id, name_ar }))}
      />

      {/* -------------------------- Category sections -------------------- */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        {visibleCategories.map((category) => {
          const categoryItems = itemsByCategory.get(category.id) ?? [];

          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              className="mb-12 scroll-mt-20"
            >
              <Reveal className="mb-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-bold text-[#7a4a24]">
                    {category.name_ar}
                  </h2>
                  <span className="text-sm text-[#a08b76]">
                    {category.name_en}
                  </span>
                </div>
              </Reveal>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {categoryItems.map((item, index) => {
                  const itemPrices = pricesByItem.get(item.id) ?? [];
                  const singlePrice =
                    itemPrices.length === 1 && !itemPrices[0].size_label_ar;
                  const priceLines = itemPrices.map((price) => ({
                    label: price.size_label_ar,
                    value: formatPrice(price.price),
                  }));

                  return (
                    <Reveal key={item.id} delay={(index % 6) * 60}>
                      <article
                        className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#eee7da] motion-safe:transition-[transform,box-shadow] motion-safe:hover:-translate-y-1 hover:shadow-md ${
                          item.is_available ? "" : "opacity-60"
                        }`}
                      >
                        <ItemImage
                          letter={item.name_ar.trim().charAt(0)}
                          nameAr={item.name_ar}
                          nameEn={item.name_en}
                          priceLines={priceLines}
                          isNew={item.is_new}
                          unavailable={!item.is_available}
                        />

                        <div className="p-3">
                          <h3 className="font-bold leading-snug">
                            {item.name_ar}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#a08b76]">
                            {item.name_en}
                          </p>

                          <div className="mt-2 text-sm">
                            {singlePrice ? (
                              <span className="font-semibold text-[#7a4a24]">
                                {formatPrice(itemPrices[0].price)}
                              </span>
                            ) : (
                              <ul className="flex flex-col gap-0.5">
                                {itemPrices.map((price) => (
                                  <li
                                    key={price.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="text-xs text-[#a08b76]">
                                      {price.size_label_ar ?? ""}
                                    </span>
                                    <span className="font-semibold text-[#7a4a24]">
                                      {formatPrice(price.price)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* ------------------------------ Footer ---------------------------- */}
      <footer className="border-t border-[#eee7da] bg-[#f3ead9] px-4 py-10 text-center">
        <p className="text-lg font-bold text-[#7a4a24]">إيدج كافيه · Edge Cafe</p>
        <p className="mt-2 text-sm text-[#2b2018]/80">
          العنوان يُضاف لاحقاً · يومياً 7:00 ص — 1:00 ص · هاتف: 0000 000 0000
        </p>
        <p dir="ltr" className="mt-2 text-sm text-[#a08b76]">
          Instagram: @edge.cafe
        </p>
      </footer>
    </div>
  );
}
