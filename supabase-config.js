/* global supabase */
(() => {
  "use strict";

  /**
   * ✅ ضع بيانات مشروعك هنا:
   * من Supabase Dashboard → Project Settings → API
   * - Project URL
   * - anon/public key (Publishable key)
   */
  const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

  // تأكد أن مكتبة supabase-js اتحمّلت قبل هذا الملف
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error(
      "❌ Supabase library not found. Make sure you loaded supabase-js BEFORE supabase-config.js"
    );
    return;
  }

  // إنشاء عميل Supabase
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // نخليه متاح عالمياً للـ admin.js و index.js
  window.sb = sb;

  // فحص سريع (مفيد أثناء التطوير)
  console.log("✅ Supabase client ready:", sb);
})();
