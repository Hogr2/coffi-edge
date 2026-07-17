"use client";

import { useEffect, useState } from "react";

// The only always-active client piece of the public menu: sticky chips bar
// with the in-view category highlighted via IntersectionObserver.
export default function CategoryChips({
  categories,
}: {
  categories: { id: string; name_ar: string }[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const visibility = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        if (best) setActiveId(best.replace("cat-", ""));
      },
      { rootMargin: "-64px 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    for (const category of categories) {
      const section = document.getElementById(`cat-${category.id}`);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav className="sticky top-0 z-10 border-b border-[#eee7da] bg-[#F9F7F2]/95 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <a
              key={category.id}
              href={`#cat-${category.id}`}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium shadow-sm motion-safe:transition-colors ${
                active
                  ? "border-[#7a4a24] bg-[#7a4a24] text-[#F9F7F2]"
                  : "border-[#e7dcc9] bg-white text-[#7a4a24] hover:bg-[#f3ead9] active:scale-95"
              }`}
            >
              {category.name_ar}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
