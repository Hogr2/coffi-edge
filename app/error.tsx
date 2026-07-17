"use client";

// Friendly error boundary: shown instead of Next's default error screen when
// something throws at render time (e.g. the database is unreachable).
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      dir="rtl"
      lang="ar"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F9F7F2] p-8 text-center text-[#2b2018]"
    >
      <p className="text-5xl" aria-hidden>
        ☕
      </p>
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="text-[#5c4632]">
        تعذّر تحميل الصفحة — جرّبوا مرة أخرى بعد لحظات.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-[#7a4a24] px-8 py-2.5 font-medium text-[#F9F7F2] hover:bg-[#63391a]"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
