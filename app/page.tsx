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

type Lang = "ar" | "en";

const STRINGS = {
  ar: {
    kicker: "كركوك، العراق",
    tagline: "حيث تلتقي القهوة بالدقة",
    tagline2: "قهوة مختصة ومعجنات فرنسية",
    hours: "7:00 AM – 1:00 AM",
    viewMenu: "عرض القائمة",
    footerName: "إيدج كافيه · Edge Cafe",
    footerInfo: "العنوان يُضاف لاحقاً · 7:00 AM – 1:00 AM · هاتف: 0000 000 0000",
  },
  en: {
    kicker: "Kirkuk, Iraq",
    tagline: "Where coffee meets precision",
    tagline2: "Specialty coffee & French pastries",
    hours: "7:00 AM – 1:00 AM",
    viewMenu: "View Menu",
    footerName: "Edge Cafe · إيدج كافيه",
    footerInfo: "Address coming soon · 7:00 AM – 1:00 AM · Phone: 0000 000 0000",
  },
} as const;

function formatPrice(value: number): string {
  return `IQD ${Number(value).toFixed(3)}`;
}

// Colorful per-category placeholder styles (Edge look): matched by keywords in
// the category names; unmatched categories get a stable fallback color so a
// new category never renders colorless.
type PlaceholderStyle = { from: string; to: string; icon: string };

const KEYWORD_STYLES: { keywords: string[]; style: PlaceholderStyle }[] = [
  { keywords: ["ماتشا", "matcha"], style: { from: "#67b93e", to: "#2f7a1c", icon: "🍵" } },
  { keywords: ["بيري", "berry", "كريم", "cream"], style: { from: "#b06ef5", to: "#7c3aed", icon: "🫐" } },
  { keywords: ["موهيتو", "mojito"], style: { from: "#34d399", to: "#0f9488", icon: "🌿" } },
  { keywords: ["تي", "شاي", "tea"], style: { from: "#f6b12e", to: "#e07b00", icon: "🧋" } },
  { keywords: ["سموذي", "سموزي", "smoothie"], style: { from: "#fb7185", to: "#dc2643", icon: "🍓" } },
  { keywords: ["حلويات", "كيك", "dessert", "cake"], style: { from: "#f48fb6", to: "#d6337c", icon: "🍰" } },
  { keywords: ["باردة", "آيس", "ايس", "iced", "cold"], style: { from: "#5fa8fa", to: "#2458d6", icon: "🧊" } },
  { keywords: ["ساخنة", "قهوة", "hot", "coffee"], style: { from: "#b07a4d", to: "#7a4a24", icon: "☕" } },
];

const FALLBACK_STYLES: PlaceholderStyle[] = [
  { from: "#b07a4d", to: "#7a4a24", icon: "☕" },
  { from: "#5fa8fa", to: "#2458d6", icon: "🥤" },
  { from: "#f6b12e", to: "#e07b00", icon: "🥤" },
  { from: "#b06ef5", to: "#7c3aed", icon: "🥤" },
];

function placeholderFor(category: Category): PlaceholderStyle {
  const name = `${category.name_ar} ${category.name_en}`.toLowerCase();
  for (const { keywords, style } of KEYWORD_STYLES) {
    if (keywords.some((keyword) => name.includes(keyword))) return style;
  }
  let hash = 0;
  for (const char of category.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return FALLBACK_STYLES[Math.abs(hash) % FALLBACK_STYLES.length];
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: langParam } = await searchParams;
  const lang: Lang = langParam === "en" ? "en" : "ar";
  const isAr = lang === "ar";
  const t = STRINGS[lang];

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

  const categoryName = (category: Category) =>
    isAr ? category.name_ar : category.name_en;
  const categoryAltName = (category: Category) =>
    isAr ? category.name_en : category.name_ar;

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
      style={{ fontFamily: "var(--font-cairo), sans-serif" }}
      className="min-h-screen bg-[#F9F7F2] text-[#2b2018]"
    >
      {/* ------------------------------- Hero ---------------------------- */}
      <header className="relative flex min-h-[92svh] items-center justify-center overflow-hidden px-4 py-16 text-center">
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Light treatment: a strong cream veil for the airy washed look, then a
            bottom-only fade that melts the cup into the page. */}
        <div className="absolute inset-0 bg-[#F9F7F2]/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-55% to-[#F9F7F2]" />

        {/* Language toggle (Edge-style: always top-left, عربي then English,
            fixed LTR order regardless of page direction) */}
        <nav
          dir="ltr"
          className="absolute left-4 top-4 z-20 flex overflow-hidden rounded-full bg-white text-xs font-medium shadow-md ring-1 ring-[#eee7da]"
        >
          <a
            href="/"
            className={`px-3.5 py-1.5 ${
              isAr ? "bg-[#2b2018] text-[#F9F7F2]" : "text-[#5c4632] hover:bg-[#f3ead9]"
            }`}
          >
            عربي
          </a>
          <a
            href="/?lang=en"
            className={`px-3.5 py-1.5 ${
              !isAr ? "bg-[#2b2018] text-[#F9F7F2]" : "text-[#5c4632] hover:bg-[#f3ead9]"
            }`}
          >
            English
          </a>
        </nav>

        <div className="relative">
          <Image
            src="/logo.png"
            alt="Edge Cafe"
            width={128}
            height={100}
            priority
            style={{ height: "auto" }}
            className="mx-auto mb-7 w-28 sm:w-32"
          />
          <p className="flex items-center justify-center gap-3 text-xs font-medium tracking-[0.2em] text-[#8a7460]">
            <span aria-hidden className="h-px w-10 bg-[#8a7460]/40" />
            {t.kicker}
            <span aria-hidden className="h-px w-10 bg-[#8a7460]/40" />
          </p>
          {/* The wordmark stays in English in both languages (brand) */}
          <h1
            dir="ltr"
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            className="mt-3 text-5xl font-bold text-[#2b2018] [text-shadow:0_1px_2px_rgba(249,247,242,0.6)] sm:text-6xl"
          >
            Edge Cafe
          </h1>
          <p className="mt-5 text-lg text-[#5c4632]">{t.tagline}</p>
          <p className="mt-2 text-sm text-[#8a7460]">{t.tagline2}</p>
          {firstCategoryId && (
            <a
              href={`#cat-${firstCategoryId}`}
              className="mt-8 inline-block rounded-full bg-white px-9 py-3 font-medium text-[#5c4632] shadow-md ring-1 ring-[#eee7da] motion-safe:transition-transform hover:bg-[#f3ead9] motion-safe:hover:-translate-y-0.5 active:translate-y-0"
            >
              {t.viewMenu}
            </a>
          )}
          <p dir="ltr" className="mt-8 text-xs tracking-widest text-[#8a7460]">
            {t.hours}
          </p>
        </div>
      </header>

      {/* ----------------------- Sticky category chips ------------------- */}
      <CategoryChips
        categories={visibleCategories.map((category) => ({
          id: category.id,
          name_ar: categoryName(category),
        }))}
      />

      {/* -------------------------- Category sections -------------------- */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8">
        {visibleCategories.map((category) => {
          const categoryItems = itemsByCategory.get(category.id) ?? [];
          const placeholder = placeholderFor(category);

          return (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              className="mb-14 scroll-mt-20"
            >
              <Reveal className="mb-8">
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#a08b76]">
                    {categoryAltName(category)}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#7a4a24] sm:text-3xl">
                    {categoryName(category)}
                  </h2>
                  <span
                    aria-hidden
                    className="mx-auto mt-3 block h-0.5 w-12 rounded-full bg-[#7a4a24]/60"
                  />
                </div>
              </Reveal>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {categoryItems.map((item, index) => {
                  const itemPrices = pricesByItem.get(item.id) ?? [];
                  const namePrimary = isAr ? item.name_ar : item.name_en;
                  const nameSecondary = isAr ? item.name_en : item.name_ar;
                  const sizeLabel = (price: Price) =>
                    (isAr ? price.size_label_ar : price.size_label_en) ??
                    price.size_label_ar;
                  const singlePrice =
                    itemPrices.length === 1 && !itemPrices[0].size_label_ar;
                  const priceLines = itemPrices.map((price) => ({
                    label: sizeLabel(price),
                    value: formatPrice(price.price),
                  }));

                  return (
                    <Reveal key={item.id} delay={(index % 6) * 60}>
                      {/* Hover zoom: will-change keeps the card on a persistent
                          compositor layer — without it, hover transitions here
                          repainted the images and flickered (spec #016). */}
                      <div>
                        <article
                          className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#eee7da] will-change-transform motion-safe:transition-transform motion-safe:duration-300 motion-safe:hover:scale-[1.03] ${
                            item.is_available ? "" : "opacity-60"
                          }`}
                        >
                          <ItemImage
                            placeholder={placeholder}
                            label={namePrimary.trim().split(/\s+/)[0]}
                            namePrimary={namePrimary}
                            nameSecondary={nameSecondary}
                            lang={lang}
                            imageUrl={item.image_url}
                            priceLines={priceLines}
                            isNew={item.is_new}
                            unavailable={!item.is_available}
                          />

                          <div className="p-4">
                            <h3 className="font-bold leading-snug">{namePrimary}</h3>
                            <p className="mt-0.5 text-xs text-[#a08b76]">
                              {nameSecondary}
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
                                        {sizeLabel(price) ?? ""}
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
        <Image
          src="/logo-footer.png"
          alt="Edge Cafe"
          width={110}
          height={70}
          style={{ height: "auto" }}
          className="mx-auto mb-4 w-14"
        />
        <p className="text-lg font-bold text-[#7a4a24]">{t.footerName}</p>
        <p className="mt-2 text-sm text-[#2b2018]/80">{t.footerInfo}</p>
        <p dir="ltr" className="mt-2 text-sm text-[#a08b76]">
          Instagram: @edge.cafe
        </p>
      </footer>
    </div>
  );
}
