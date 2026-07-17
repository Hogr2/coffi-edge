"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type PriceLine = { label: string | null; value: string };

// The item card's image slot + lightbox. Shows the real photo when
// image_url exists, otherwise the elegant gradient placeholder.
export default function ItemImage({
  letter,
  nameAr,
  nameEn,
  imageUrl,
  priceLines,
  isNew,
  unavailable,
}: {
  letter: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  priceLines: PriceLine[];
  isNew: boolean;
  unavailable: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const imageArea = (big: boolean) => (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f3ead9] to-[#e0cbab] ${
        big ? "aspect-[4/3] rounded-xl" : "aspect-[5/4] sm:aspect-[4/3]"
      }`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={nameAr}
          fill
          priority
          sizes={
            big
              ? "min(90vw, 384px)"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden
          className={`select-none font-extrabold text-[#7a4a24]/25 ${
            big ? "text-8xl" : "text-5xl"
          }`}
        >
          {letter}
        </span>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`عرض ${nameAr}`}
        className="relative block w-full cursor-pointer text-right"
      >
        {imageArea(false)}
        {isNew && (
          <span className="absolute start-2 top-2 rounded-full bg-[#7a4a24] px-2.5 py-0.5 text-xs font-medium text-[#F9F7F2] shadow">
            جديد
          </span>
        )}
        {unavailable && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-[#2b2018]/80 px-3 py-1 text-xs font-medium text-[#F9F7F2]">
              غير متوفّر
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lightbox-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[#2b2018]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={nameAr}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            dir="rtl"
            className="lightbox-panel relative w-full max-w-sm rounded-2xl bg-[#F9F7F2] p-4 shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
              className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#2b2018]/10 text-lg text-[#2b2018] hover:bg-[#2b2018]/20"
            >
              ✕
            </button>

            {imageArea(true)}

            <div className="mt-4 text-center">
              <h3 className="text-xl font-bold text-[#2b2018]">{nameAr}</h3>
              <p className="mt-0.5 text-sm text-[#a08b76]">{nameEn}</p>
              {unavailable && (
                <p className="mt-2 text-sm font-medium text-[#7a4a24]">
                  غير متوفّر حالياً
                </p>
              )}
              <ul className="mt-3 flex flex-col gap-1">
                {priceLines.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-center gap-2 text-sm"
                  >
                    {line.label && (
                      <span className="text-[#a08b76]">{line.label}</span>
                    )}
                    <span className="font-semibold text-[#7a4a24]">
                      {line.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
