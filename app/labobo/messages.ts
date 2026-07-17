// Dashboard banner catalog. Server Actions put KEYS in the redirect URL and
// the page resolves them here — free text from the URL is never rendered, so
// crafted links can't spoof banners.

export const SUCCESS_MESSAGES: Record<string, string> = {
  cat_added: "تمت إضافة التصنيف.",
  cat_updated: "تم تعديل التصنيف.",
  cat_deleted: "تم حذف التصنيف.",
  item_added: "تمت إضافة الصنف.",
  item_updated: "تم تعديل الصنف.",
  item_deleted: "تم حذف الصنف.",
  price_added: "تمت إضافة السعر.",
  price_deleted: "تم حذف السعر.",
  image_updated: "تم تحديث صورة الصنف.",
  image_removed: "تمت إزالة صورة الصنف.",
  avail_on: "الصنف متوفّر الآن.",
  avail_off: "الصنف غير متوفّر الآن.",
  new_on: "انضافت شارة جديد.",
  new_off: "انشالت شارة جديد.",
};

export const ERROR_MESSAGES: Record<string, string> = {
  invalid: "طلب غير صالح.",
  cat_names: "اسم التصنيف مطلوب بالعربية والإنجليزية.",
  item_names: "اسم الصنف مطلوب بالعربية والإنجليزية.",
  sort: "قيمة الترتيب غير صالحة.",
  price: "السعر يجب أن يكون رقماً موجباً.",
  need_price: "أضيفوا سعراً واحداً على الأقل.",
  pick_cat: "اختاروا تصنيفاً.",
  cat_missing: "التصنيف غير موجود.",
  cat_has_items: "لا يمكن حذف تصنيف يحتوي أصنافاً — انقلوا أو احذفوا أصنافه أولاً.",
  save: "تعذّر الحفظ.",
  delete: "تعذّر الحذف.",
  upload: "تعذّر رفع الصورة.",
  image_url: "رابط الصورة يجب أن يكون من مخزن الموقع (Supabase).",
  pick_image: "اختاروا صورة أولاً.",
};
