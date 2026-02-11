/* global supabase */
(() => {
  "use strict";

  // ✅ بيانات مشروعك (كما أرسلتها)
  const SUPABASE_URL = "https://ziozomnceumhdwzccwke.supabase.co";
  const SUPABASE_KEY = "sb_publishable_RzTql6NRNONpdQsXm_MHNg_T0sv2PVh";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("❌ Supabase library not loaded. Make sure supabase UMD script is included.");
    return;
  }

  // ✅ Create client and expose globally
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  console.log("✅ Supabase client ready");
})();
