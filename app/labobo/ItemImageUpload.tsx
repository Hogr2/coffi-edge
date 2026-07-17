"use client";

import { useState } from "react";
import { compressImage } from "@/lib/compress-image";
import { removeItemImage, uploadItemImage } from "./actions";

// Per-item image manager for the dashboard: pick → compress in the browser →
// preview → upload via the requireAuth-guarded server action.
export default function ItemImageUpload({
  itemId,
  imageUrl,
}: {
  itemId: string;
  imageUrl: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    setError(null);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!picked) return;
    try {
      const compressed = await compressImage(picked);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setError("تعذّر معالجة الصورة — جرّبوا صورة أخرى.");
      event.target.value = "";
    }
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("item_id", itemId);
      formData.set("image_file", file, "image.webp");
      await uploadItemImage(formData);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#F9F7F2] p-3">
      {(preview || imageUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview ?? imageUrl ?? ""}
          alt="صورة الصنف"
          className="h-16 w-20 rounded-lg object-cover ring-1 ring-[#eee7da]"
        />
      )}

      <div className="flex flex-1 flex-col gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={onPick}
          className="text-sm text-[#5c4632] file:ml-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#7a4a24] file:ring-1 file:ring-[#e7dcc9] hover:file:bg-[#f3ead9]"
        />
        {error && <p className="text-sm text-[#9c3d2e]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={upload}
            disabled={!file || busy}
            className="rounded-lg bg-[#7a4a24] px-4 py-1.5 text-sm font-medium text-[#F9F7F2] hover:bg-[#63391a] disabled:opacity-40"
          >
            {busy ? "جارٍ الرفع…" : imageUrl ? "استبدال الصورة" : "رفع الصورة"}
          </button>
          {imageUrl && (
            <form action={removeItemImage}>
              <input type="hidden" name="id" value={itemId} />
              <button
                type="submit"
                className="rounded-lg border border-[#e5b8ae] bg-white px-4 py-1.5 text-sm font-medium text-[#9c3d2e] hover:bg-[#faeeeb]"
              >
                إزالة الصورة
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
