"use client";

import { useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { addItem } from "./actions";

const inputClass =
  "w-full rounded-lg border border-[#e7dcc9] bg-white px-3 py-2 text-sm text-[#2b2018] outline-none placeholder:text-[#b5a48f] focus:border-[#7a4a24] focus:ring-2 focus:ring-[#7a4a24]/20";
const labelClass = "flex flex-col gap-1 text-sm font-medium text-[#5c4632]";
const secondaryButtonClass =
  "rounded-lg border border-[#e7dcc9] bg-white px-4 py-2 text-sm font-medium text-[#7a4a24] hover:bg-[#f3ead9]";

export default function AddItemForm({
  categories,
}: {
  categories: { id: string; name_ar: string }[];
}) {
  const [priceRows, setPriceRows] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    setImageError(null);
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (!picked) return;
    try {
      const compressed = await compressImage(picked);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      setImageError("تعذّر معالجة الصورة — جرّبوا صورة أخرى.");
      event.target.value = "";
    }
  }

  // Inject the browser-compressed WebP into the form data; the server action
  // does the actual upload with the service key.
  async function submit(formData: FormData) {
    formData.delete("image_picker");
    if (imageFile) formData.set("image_file", imageFile, "image.webp");
    await addItem(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <label className={labelClass}>
        التصنيف
        <select name="category_id" required className={inputClass} defaultValue="">
          <option value="" disabled>
            اختاروا التصنيف…
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_ar}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className={`${labelClass} flex-1`}>
          الاسم بالعربية
          <input name="name_ar" required placeholder="لاتيه كلاسيكي" className={inputClass} />
        </label>
        <label className={`${labelClass} flex-1`}>
          الاسم بالإنجليزية
          <input name="name_en" required placeholder="Classic Latte" dir="ltr" className={inputClass} />
        </label>
      </div>

      <div className="rounded-xl border border-[#e7dcc9] p-3">
        <label className={labelClass}>
          صورة الصنف (اختياري)
          <input
            type="file"
            name="image_picker"
            accept="image/*"
            onChange={onPickImage}
            className="text-sm text-[#5c4632] file:ml-3 file:rounded-lg file:border-0 file:bg-[#7a4a24] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#F9F7F2] hover:file:bg-[#63391a]"
          />
        </label>
        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt="معاينة الصورة"
            className="mt-3 h-32 w-44 rounded-lg object-cover ring-1 ring-[#eee7da]"
          />
        )}
        {imageError && <p className="mt-2 text-sm text-[#9c3d2e]">{imageError}</p>}
        <label className={`${labelClass} mt-3`}>
          أو الصقوا رابط صورة جاهز
          <input name="image_url" type="url" placeholder="https://…" dir="ltr" className={inputClass} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2 font-medium text-[#5c4632]">
          <input
            type="checkbox"
            name="is_available"
            defaultChecked
            className="h-4 w-4 accent-[#7a4a24]"
          />
          متوفّر
        </label>
        <label className="flex items-center gap-2 font-medium text-[#5c4632]">
          <input type="checkbox" name="is_new" className="h-4 w-4 accent-[#7a4a24]" />
          جديد
        </label>
        <label className="flex items-center gap-2 font-medium text-[#5c4632]">
          الترتيب
          <input name="sort_order" type="number" defaultValue={0} className={`${inputClass} w-24`} />
        </label>
      </div>

      <fieldset className="rounded-xl border border-[#e7dcc9] p-3">
        <legend className="px-1 text-sm font-medium text-[#5c4632]">
          الأسعار — لسعر واحد بلا حجم اتركوا خانتي الحجم فارغتين
        </legend>
        <div className="flex flex-col gap-3">
          {Array.from({ length: priceRows }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className={`${labelClass} flex-1`}>
                الحجم بالعربية (اختياري)
                <input name="price_size_ar" placeholder="صغير" className={inputClass} />
              </label>
              <label className={`${labelClass} flex-1`}>
                الحجم بالإنجليزية
                <input name="price_size_en" placeholder="Small" dir="ltr" className={inputClass} />
              </label>
              <label className={labelClass}>
                السعر
                <input
                  name="price_value"
                  type="number"
                  step="0.001"
                  min="0"
                  required={i === 0}
                  dir="ltr"
                  className={`${inputClass} sm:w-28`}
                />
              </label>
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPriceRows((n) => n + 1)}
              className={secondaryButtonClass}
            >
              + حجم إضافي
            </button>
            {priceRows > 1 && (
              <button
                type="button"
                onClick={() => setPriceRows((n) => n - 1)}
                className={secondaryButtonClass}
              >
                − إزالة آخر صف
              </button>
            )}
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        className="rounded-lg bg-[#7a4a24] px-5 py-2.5 font-medium text-[#F9F7F2] shadow-sm hover:bg-[#63391a]"
      >
        إضافة الصنف
      </button>
    </form>
  );
}
