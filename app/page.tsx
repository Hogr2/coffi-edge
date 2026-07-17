import Image from "next/image";
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
      <header className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16 text-center sm:min-h-[55vh]">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim: keeps the text legible over any part of the photo,
            strongest toward the bottom. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2b2018]/40 via-[#2b2018]/50 to-[#2b2018]/80" />

        <div className="relative">
          <p className="text-sm font-medium tracking-[0.3em] text-[#e8dcc8]">
            EDGE CAFE
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-[#F9F7F2] [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl">
            إيدج كافيه
          </h1>
          <p className="mt-4 text-lg text-[#f3ead9] [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
            قهوة مختصّة وأجواء تناسب يومك
          </p>
          <p className="mt-1 text-sm text-[#e8dcc8] [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
            يومياً 7:00 ص — 1:00 ص
          </p>
          {firstCategoryId && (
            <a
              href={`#cat-${firstCategoryId}`}
              className="mt-7 inline-block rounded-full bg-[#F9F7F2] px-8 py-2.5 font-semibold text-[#7a4a24] shadow-lg motion-safe:transition-transform hover:bg-[#f3ead9] motion-safe:hover:-translate-y-0.5 active:translate-y-0"
            >
              عرض القائمة
            </a>
          )}
        </div>
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
              <Reveal className="mb-6">
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a08b76]">
                    {category.name_en}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#7a4a24] sm:text-3xl">
                    {category.name_ar}
                  </h2>
                  <span
                    aria-hidden
                    className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-[#7a4a24]/60"
                  />
                </div>
              </Reveal>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                      {/* Cards are deliberately static: any hover transition here
                          (shadow or transform) repaints the images and flickers
                          on this hardware — see spec #016. */}
                      <div>
                        <article
                          className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#eee7da] ${
                            item.is_available ? "" : "opacity-60"
                          }`}
                        >
                        <ItemImage
                          letter={item.name_ar.trim().charAt(0)}
                          nameAr={item.name_ar}
                          nameEn={item.name_en}
                          imageUrl={item.image_url}
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
                      </div>
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
