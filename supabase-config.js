// supabase-config.js (FULL FILE)

// ⚠️ لا تعدّل أي شيء إلا السطرين التاليين فقط
const SUPABASE_URL = "https://ziozomnceumhdwzccwke.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RzTql6NRNONpdQsXm_MHNg_T0sv2PVh";

// ===============================
// لا تغيّر أي شيء تحت هذا السطر
// ===============================
window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
