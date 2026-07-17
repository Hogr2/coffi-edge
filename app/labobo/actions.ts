"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Helpers (not exported — only async Server Actions may be exported here)
// ---------------------------------------------------------------------------

// Successful write: revalidate both the public menu and the dashboard.
function ok(message: string): never {
  revalidatePath("/");
  revalidatePath("/labobo");
  redirect(`/labobo?m=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/labobo?e=${encodeURIComponent(message)}`);
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// Empty input falls back to 0; anything else must be a whole number.
function intField(formData: FormData, name: string): number {
  const raw = text(formData, name);
  if (raw === "") return 0;
  const n = Number(raw);
  if (!Number.isInteger(n)) fail("قيمة الترتيب غير صالحة.");
  return n;
}

// The browser compresses to WebP before sending; this cap is a server-side
// backstop (the bucket itself allows up to ~10MB).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Uploads a validated image to the public menu-images bucket and returns its
// public URL, or null on any failure. Callers handle the user-facing error.
async function uploadImageFile(file: File): Promise<string | null> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return null;
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return null;

  const supabase = createServiceClient();
  const path = `items/${crypto.randomUUID()}-${Date.now()}.${IMAGE_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  return supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
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
  if (!name_ar || !name_en) fail("اسم التصنيف مطلوب بالعربية والإنجليزية.");

  const { error } = await createServiceClient()
    .from("categories")
    .insert({ name_ar, name_en, sort_order });
  if (error) fail("تعذّر حفظ التصنيف.");
  ok("تمت إضافة التصنيف.");
}

export async function updateCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const name_ar = text(formData, "name_ar");
  const name_en = text(formData, "name_en");
  const sort_order = intField(formData, "sort_order");
  if (!id) fail("طلب غير صالح.");
  if (!name_ar || !name_en) fail("اسم التصنيف مطلوب بالعربية والإنجليزية.");

  const { error } = await createServiceClient()
    .from("categories")
    .update({ name_ar, name_en, sort_order })
    .eq("id", id);
  if (error) fail("تعذّر تعديل التصنيف.");
  ok("تم تعديل التصنيف.");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("طلب غير صالح.");

  const { error } = await createServiceClient()
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation: items reference this category (RESTRICT).
    if (error.code === "23503")
      fail("لا يمكن حذف تصنيف يحتوي أصنافاً — انقلوا أو احذفوا أصنافه أولاً.");
    fail("تعذّر حذف التصنيف.");
  }
  ok("تم حذف التصنيف.");
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

  if (!category_id) fail("اختاروا تصنيفاً.");
  if (!name_ar || !name_en) fail("اسم الصنف مطلوب بالعربية والإنجليزية.");

  // An uploaded (browser-compressed) file takes precedence over a pasted URL.
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadedUrl = await uploadImageFile(imageFile);
    if (!uploadedUrl) fail("تعذّر رفع الصورة.");
    image_url = uploadedUrl;
  }

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
    if (!Number.isFinite(num) || num < 0) fail("السعر يجب أن يكون رقماً موجباً.");
    priceRows.push({
      size_label_ar: (labelsAr[i] ?? "").trim() || null,
      size_label_en: (labelsEn[i] ?? "").trim() || null,
      price: num,
      sort_order: priceRows.length,
    });
  }
  if (priceRows.length === 0) fail("أضيفوا سعراً واحداً على الأقل.");

  const supabase = createServiceClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", category_id)
    .maybeSingle();
  if (!category) fail("التصنيف غير موجود.");

  const { data: inserted, error } = await supabase
    .from("items")
    .insert({ category_id, name_ar, name_en, image_url, is_available, is_new, sort_order })
    .select("id")
    .single();
  if (error || !inserted) fail("تعذّر حفظ الصنف.");

  const { error: pricesError } = await supabase
    .from("prices")
    .insert(priceRows.map((row) => ({ ...row, item_id: inserted.id })));
  if (pricesError) {
    // Don't leave a price-less orphan item behind.
    await supabase.from("items").delete().eq("id", inserted.id);
    fail("تعذّر حفظ الأسعار.");
  }
  ok("تمت إضافة الصنف.");
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

  if (!id) fail("طلب غير صالح.");
  if (!category_id) fail("اختاروا تصنيفاً.");
  if (!name_ar || !name_en) fail("اسم الصنف مطلوب بالعربية والإنجليزية.");

  const { error } = await createServiceClient()
    .from("items")
    .update({ category_id, name_ar, name_en, image_url, is_available, is_new, sort_order })
    .eq("id", id);
  if (error) fail("تعذّر تعديل الصنف.");
  ok("تم تعديل الصنف.");
}

export async function deleteItem(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("طلب غير صالح.");

  // Prices are removed automatically (ON DELETE CASCADE).
  const { error } = await createServiceClient().from("items").delete().eq("id", id);
  if (error) fail("تعذّر حذف الصنف.");
  ok("تم حذف الصنف.");
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

  if (!item_id) fail("طلب غير صالح.");
  const price = Number(priceRaw);
  if (priceRaw === "" || !Number.isFinite(price) || price < 0)
    fail("السعر يجب أن يكون رقماً موجباً.");

  const { error } = await createServiceClient()
    .from("prices")
    .insert({ item_id, size_label_ar, size_label_en, price, sort_order });
  if (error) fail("تعذّر إضافة السعر.");
  ok("تمت إضافة السعر.");
}

export async function deletePrice(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("طلب غير صالح.");

  const { error } = await createServiceClient().from("prices").delete().eq("id", id);
  if (error) fail("تعذّر حذف السعر.");
  ok("تم حذف السعر.");
}

// ---------------------------------------------------------------------------
// Item images
// ---------------------------------------------------------------------------

export async function uploadItemImage(formData: FormData): Promise<void> {
  await requireAuth();
  const item_id = text(formData, "item_id");
  const file = formData.get("image_file");
  if (!item_id) fail("طلب غير صالح.");
  if (!(file instanceof File) || file.size === 0) fail("اختاروا صورة أولاً.");

  const url = await uploadImageFile(file);
  if (!url) fail("تعذّر رفع الصورة.");

  const { error } = await createServiceClient()
    .from("items")
    .update({ image_url: url })
    .eq("id", item_id);
  if (error) fail("تعذّر حفظ الصورة.");
  ok("تم تحديث صورة الصنف.");
}

export async function removeItemImage(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  if (!id) fail("طلب غير صالح.");

  // Clearing the DB reference is enough; the storage object may remain.
  const { error } = await createServiceClient()
    .from("items")
    .update({ image_url: null })
    .eq("id", id);
  if (error) fail("تعذّر إزالة الصورة.");
  ok("تمت إزالة صورة الصنف.");
}

// ---------------------------------------------------------------------------
// Quick toggles
// ---------------------------------------------------------------------------

export async function toggleAvailable(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const next = text(formData, "value") === "1";
  if (!id) fail("طلب غير صالح.");

  const { error } = await createServiceClient()
    .from("items")
    .update({ is_available: next })
    .eq("id", id);
  if (error) fail("تعذّر التحديث.");
  ok(next ? "الصنف متوفّر الآن." : "الصنف غير متوفّر الآن.");
}

export async function toggleNew(formData: FormData): Promise<void> {
  await requireAuth();
  const id = text(formData, "id");
  const next = text(formData, "value") === "1";
  if (!id) fail("طلب غير صالح.");

  const { error } = await createServiceClient()
    .from("items")
    .update({ is_new: next })
    .eq("id", id);
  if (error) fail("تعذّر التحديث.");
  ok(next ? "انضافت شارة جديد." : "انشالت شارة جديد.");
}
