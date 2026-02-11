/* global supabase */
(() => {
  "use strict";

  // ✅ بيانات مشروعك
  const SUPABASE_URL = "https://ziozomnceumhdwzccwke.supabase.co";
  const SUPABASE_KEY = "sb_publishable_RzTql6NRNONpdQsXm_MHNg_T0sv2PVh";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("❌ Supabase library not loaded. Check script tag in HTML.");
    return;
  }

  // ✅ Create client
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  // ✅ نخليه متاح لكل الصفحات
  window.sb = sb;
  console.log("✅ Supabase client ready");
})();
