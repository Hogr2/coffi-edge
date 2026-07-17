"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Helpers (not exported — only async Server Actions may be exported here)
// ---------------------------------------------------------------------------

// Successful write: revalidate both the public menu and the dashboard.
// `key` is resolved to text by app/labobo/messages.ts — never free text.
function ok(key: string): never {
  revalidatePath("/");
  revalidatePath("/labobo");
  redirect(`/labobo?m=${key}`);
}

function fail(key: string): never {
  redirect(`/labobo?e=${key}`);
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// Empty input falls back to 0; anything else must be a whole number.
function intField(formData: FormData, name: string): number {
  const raw = text(formData, name);
  if (raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n)) fail("sort");
  return n;
}

// A pasted image URL must point at THIS project's Supabase public storage —
// anything else would crash next/image on the public menu (host not allowed).
function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return (
      url.protocol === "https:" &&
      url.hostname === supabase.hostname &&
      url.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

// The browser compresses to WebP before sending; this cap is a server-side
// backstop (the bucket itself allows up to ~10MB).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Detect the real image type from magic bytes — the browser-supplied MIME
// type is never trusted.
async function sniffImageType(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

// Uploads a validated image to the public menu-images bucket and returns its
// public URL, or null on any failure. Callers handle the user-facing error.
async function uploadImageFile(file: File): Promise<string | null> {
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return null;
  const realType = await sniffImageType(file);
  if (!realType) return null;

  const supabase = createServiceClient();
  const path = `items/${crypto.randomUUID()}-${Date.now()}.${IMAGE_EXTENSIONS[realType]}`;
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { upsert: true, contentType: realType });
  if (error) return null;
  return supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
}

// Maps a public URL back to its object path inside menu-images (or null if it
// isn't ours) so replaced/removed images can be cleaned up.
function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/menu-images/";
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

// Best-effort: never fail the user action because cleanup failed.
async function removeStorageObject(url: string | null): Promise<void> {
  const path = storagePathFromUrl(url);
  if (!path) return;
  await createServiceClient().storage.from("menu-images").remove([path]);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const success = await login(password);
  // Neutral failure signal only — never log or echo the attempted password.
  redirect(success ? "/labobo" : "/labobo?error=1");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/labobo");
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function addCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const name_ar = text(formData, "name_ar");
  const name_en = text(formData, "name_en");
  const sort_order = intField(formData, "sort_order");
  if (!name_ar || !name_en) fail("cat_names");

  const { error } = await createServiceClient()
    .from("categories")
    .insert({ name_ar, name_en, sort_order });
  if (error) fail("save");
  ok("cat_added");
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const name_ar = text(formData, "name_ar");
  const name_en = text(formData, "name_en");
  const sort_order = intField(formData, "sort_order");
  if (!id) fail("invalid");
  if (!name_ar || !name_en) fail("cat_names");

  const { error } = await createServiceClient()
    .from("categories")
    .update({ name_ar, name_en, sort_order })
    .eq("id", id);
  if (error) fail("save");
  ok("cat_updated");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("invalid");

  const { error } = await createServiceClient()
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation: items reference this category (RESTRICT).
    if (error.code === "23503") fail("cat_has_items");
    fail("delete");
  }
  ok("cat_deleted");
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function addItem(formData: FormData): Promise<void> {
  await requireAuth();
  const category_id = text(formData, "category_id");
  const name_ar = text(formData, "name_ar");
  const name_en = text(formData, "name_en");
  let image_url = text(formData, "image_url") || null;
  const is_available = formData.get("is_available") === "on";
  const is_new = formData.get("is_new") === "on";
  const sort_order = intField(formData, "sort_order");

  if (!category_id) fail("pick_cat");
  if (!name_ar || !name_en) fail("item_names");
  if (image_url && !isAllowedImageUrl(image_url)) fail("image_url");

  // Parse the aligned price-row arrays; skip rows with an empty price.
  const labelsAr = formData.getAll("price_size_ar").map(String);
  const labelsEn = formData.getAll("price_size_en").map(String);
  const values = formData.getAll("price_value").map(String);
  const priceRows: {
    size_label_ar: string | null;
    size_label_en: string | null;
    price: number;
    sort_order: number;
  }[] = [];
  for (let i = 0; i < values.length; i++) {
    const raw = values[i].trim();
    if (raw === "") continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) fail("price");
    priceRows.push({
      size_label_ar: (labelsAr[i] ?? "").trim() || null,
      size_label_en: (labelsEn[i] ?? "").trim() || null,
      price: num,
      sort_order: priceRows.length,
    });
  }
  if (priceRows.length === 0) fail("need_price");

  const supabase = createServiceClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", category_id)
    .maybeSingle();
  if (!category) fail("cat_missing");

  // An uploaded (browser-compressed) file takes precedence over a pasted URL.
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedUrl = await uploadImageFile(imageFile);
    if (!uploadedUrl) fail("upload");
    image_url = uploadedUrl;
  }

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({ category_id, name_ar, name_en, image_url, is_available, is_new, sort_order })
    .select("id")
    .single();
  if (error || !inserted) fail("save");

  const { error: pricesError } = await supabase
    .from("prices")
    .insert(priceRows.map((row) => ({ ...row, item_id: inserted.id })));
  if (pricesError) {
    // Don't leave a price-less orphan item behind.
    await supabase.from("items").delete().eq("id", inserted.id);
    fail("save");
  }
  ok("item_added");
}

export async function updateItem(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const category_id = text(formData, "category_id");
  const name_ar = text(formData, "name_ar");
  const name_en = text(formData, "name_en");
  const image_url = text(formData, "image_url") || null;
  const is_available = formData.get("is_available") === "on";
  const is_new = formData.get("is_new") === "on";
  const sort_order = intField(formData, "sort_order");

  if (!id) fail("invalid");
  if (!category_id) fail("pick_cat");
  if (!name_ar || !name_en) fail("item_names");
  if (image_url && !isAllowedImageUrl(image_url)) fail("image_url");

  const { error } = await createServiceClient()
    .from("items")
    .update({ category_id, name_ar, name_en, image_url, is_available, is_new, sort_order })
    .eq("id", id);
  if (error) fail("save");
  ok("item_updated");
}

export async function deleteItem(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("invalid");

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("items")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  // Prices are removed automatically (ON DELETE CASCADE).
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) fail("delete");

  await removeStorageObject(existing?.image_url ?? null);
  ok("item_deleted");
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export async function addPrice(formData: FormData): Promise<void> {
  await requireAuth();
  const item_id = text(formData, "item_id");
  const size_label_ar = text(formData, "size_label_ar") || null;
  const size_label_en = text(formData, "size_label_en") || null;
  const priceRaw = text(formData, "price");
  const sort_order = intField(formData, "sort_order");

  if (!item_id) fail("invalid");
  const price = Number(priceRaw);
  if (priceRaw === "" || !Number.isFinite(price) || price < 0) fail("price");

  const { error } = await createServiceClient()
    .from("prices")
    .insert({ item_id, size_label_ar, size_label_en, price, sort_order });
  if (error) fail("save");
  ok("price_added");
}

export async function deletePrice(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("invalid");

  const { error } = await createServiceClient().from("prices").delete().eq("id", id);
  if (error) fail("delete");
  ok("price_deleted");
}

// ---------------------------------------------------------------------------
// Item images
// ---------------------------------------------------------------------------

export async function uploadItemImage(formData: FormData): Promise<void> {
  await requireAuth();
  const item_id = text(formData, "item_id");
  const file = formData.get("image_file");
  if (!item_id) fail("invalid");
  if (!(file instanceof File) || file.size === 0) fail("pick_image");

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("items")
    .select("image_url")
    .eq("id", item_id)
    .maybeSingle();
  if (!existing) fail("invalid");

  const url = await uploadImageFile(file);
  if (!url) fail("upload");

  const { error } = await supabase
    .from("items")
    .update({ image_url: url })
    .eq("id", item_id);
  if (error) fail("save");

  // Replaced image: clean the old object out of storage (best-effort).
  await removeStorageObject(existing.image_url);
  ok("image_updated");
}

export async function removeItemImage(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("invalid");

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("items")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  if (!existing) fail("invalid");

  const { error } = await supabase
    .from("items")
    .update({ image_url: null })
    .eq("id", id);
  if (error) fail("save");

  await removeStorageObject(existing.image_url);
  ok("image_removed");
}

// ---------------------------------------------------------------------------
// Quick toggles
// ---------------------------------------------------------------------------

export async function toggleAvailable(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const next = text(formData, "value") === "1";
  if (!id) fail("invalid");

  const { error } = await createServiceClient()
    .from("items")
    .update({ is_available: next })
    .eq("id", id);
  if (error) fail("save");
  ok(next ? "avail_on" : "avail_off");
}

export async function toggleNew(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const next = text(formData, "value") === "1";
  if (!id) fail("invalid");

  const { error } = await createServiceClient()
    .from("items")
    .update({ is_new: next })
    .eq("id", id);
  if (error) fail("save");
  ok(next ? "new_on" : "new_off");
}
