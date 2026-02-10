(() => {
  const { url, anonKey, storageBucket } = window.SUPABASE_CONFIG;
  const supabase = window.supabase.createClient(url, anonKey);

  const I18N = {
    ar: {
      dir: "rtl",
      loginHint: "سجّل دخول (Email/Password) من Supabase Auth",
      loginBtn: "تسجيل دخول",
      logoutBtn: "تسجيل خروج",
      addTitle: "إضافة منتج",
      listTitle: "المنتجات الحالية",
      save: "حفظ",
      saving: "جاري الحفظ...",
      saved: "✅ تم حفظ المنتج",
      deleted: "✅ تم حذف المنتج",
      needConfig: "❌ عدّل supabase-config.js أولاً",
      needSQL: "❌ نفّذ SQL_SETUP.sql وأنشئ bucket product-images واجعله Public",
      loginOk: "✅ تم تسجيل الدخول",
      loginFail: "❌ خطأ دخول: ",
      uploadFail: "❌ خطأ رفع صورة: ",
      saveFail: "❌ خطأ حفظ: ",
      deleteFail: "❌ خطأ حذف: ",
      loading: "جاري التحميل..."
    },
    en: {
      dir: "ltr",
      loginHint: "Login (Email/Password) from Supabase Auth",
      loginBtn: "Login",
      logoutBtn: "Logout",
      addTitle: "Add Product",
      listTitle: "Products",
      save: "Save",
      saving: "Saving...",
      saved: "✅ Saved",
      deleted: "✅ Deleted",
      needConfig: "❌ Update supabase-config.js first",
      needSQL: "❌ Run SQL_SETUP.sql and create public bucket product-images",
      loginOk: "✅ Logged in",
      loginFail: "❌ Login error: ",
      uploadFail: "❌ Upload error: ",
      saveFail: "❌ Save error: ",
      deleteFail: "❌ Delete error: ",
      loading: "Loading..."
    }
  };

  let lang = localStorage.getItem("lang") || "ar";

  const authPanel = document.getElementById("authPanel");
  const adminPanel = document.getElementById("adminPanel");
  const logoutBtn = document.getElementById("logoutBtn");

  function setLangUI() {
    document.documentElement.lang = lang;
    document.documentElement.dir = I18N[lang].dir;
    document.getElementById("authHint").textContent = I18N[lang].loginHint;
    document.getElementById("loginBtn").textContent = I18N[lang].loginBtn;
    document.getElementById("addTitle").textContent = I18N[lang].addTitle;
    document.getElementById("listTitle").textContent = I18N[lang].listTitle;
    document.getElementById("saveBtn").textContent = I18N[lang].save;
    document.getElementById("langBtn").textContent = (lang === "ar") ? "English" : "العربية";
    logoutBtn.textContent = I18N[lang].logoutBtn;
  }

  async function ensureConfig() {
    if (!url || !anonKey || url.includes("PASTE_") || anonKey.includes("PASTE_")) {
      document.getElementById("authStatus").textContent = I18N[lang].needConfig;
      throw new Error("Missing config");
    }
  }

  async function refreshAuthUI() {
    await ensureConfig();
    const { data } = await supabase.auth.getSession();
    const isAuthed = !!data.session;

    authPanel.style.display = isAuthed ? "none" : "block";
    adminPanel.style.display = isAuthed ? "block" : "none";
    logoutBtn.style.display = isAuthed ? "inline-block" : "none";

    if (isAuthed) {
      document.getElementById("listStatus").textContent = I18N[lang].loading;
      await loadProducts();
    }
  }

  document.getElementById("langBtn").addEventListener("click", async () => {
    lang = (lang === "ar") ? "en" : "ar";
    localStorage.setItem("lang", lang);
    setLangUI();
    await refreshAuthUI();
  });

  document.getElementById("loginBtn").addEventListener("click", async () => {
    try {
      await ensureConfig();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      document.getElementById("authStatus").textContent = I18N[lang].loginOk;
      await refreshAuthUI();
    } catch (e) {
      document.getElementById("authStatus").textContent = I18N[lang].loginFail + (e?.message || e);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    await refreshAuthUI();
  });

  async function uploadImage(file) {
    if (!file) return "";
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `products/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });
    if (error) throw error;

    const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
    return data.publicUrl || "";
  }

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const wrap = document.getElementById("products");
      wrap.innerHTML = "";
      document.getElementById("listStatus").textContent = "";

      (data || []).forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="thumb">${p.image_url ? `<img src="${p.image_url}" alt="">` : `<div class="hint">No image</div>`}</div>
          <div class="content">
            <div class="title">${p.title_ar} / ${p.title_en}</div>
            <div class="meta">
              <span><b>Price:</b> ${p.price || "-"}</span>
              <span>•</span>
              <span><b>Category:</b> ${p.category || "General"}</span>
              <span>•</span>
              <span><b>Featured:</b> ${p.featured ? "Yes" : "No"}</span>
            </div>
          </div>
          <div class="actions">
            <a href="#" data-del="${p.id}">Delete</a>
          </div>
        `;
        wrap.appendChild(card);
      });

      wrap.querySelectorAll("[data-del]").forEach(a => {
        a.addEventListener("click", async (ev) => {
          ev.preventDefault();
          const id = a.getAttribute("data-del");
          if (!confirm("Delete?")) return;
          try {
            const { error } = await supabase.from("products").delete().eq("id", id);
            if (error) throw error;
            document.getElementById("saveStatus").textContent = I18N[lang].deleted;
            await loadProducts();
          } catch (e) {
            document.getElementById("saveStatus").textContent = I18N[lang].deleteFail + (e?.message || e);
          }
        });
      });

    } catch (e) {
      console.error(e);
      document.getElementById("listStatus").textContent = I18N[lang].needSQL;
    }
  }

  document.getElementById("saveBtn").addEventListener("click", async () => {
    try {
      await ensureConfig();
      document.getElementById("saveStatus").textContent = I18N[lang].saving;

      const title_ar = document.getElementById("title_ar").value.trim();
      const title_en = document.getElementById("title_en").value.trim();
      const price = document.getElementById("price").value.trim();
      const category = document.getElementById("category").value.trim() || "General";
      const desc_ar = document.getElementById("desc_ar").value.trim();
      const desc_en = document.getElementById("desc_en").value.trim();
      const featured = document.getElementById("featured").value === "true";
      const file = document.getElementById("image").files?.[0];

      if (!title_ar || !title_en) {
        document.getElementById("saveStatus").textContent = "❌ title required";
        return;
      }

      let image_url = "";
      if (file) {
        image_url = await uploadImage(file);
      }

      const { error } = await supabase.from("products").insert([{
        title_ar, title_en, price, category, desc_ar, desc_en, image_url, featured
      }]);

      if (error) throw error;

      document.getElementById("saveStatus").textContent = I18N[lang].saved;

      // reset
      document.getElementById("title_ar").value = "";
      document.getElementById("title_en").value = "";
      document.getElementById("price").value = "";
      document.getElementById("category").value = "";
      document.getElementById("desc_ar").value = "";
      document.getElementById("desc_en").value = "";
      document.getElementById("image").value = "";
      document.getElementById("featured").value = "false";

      await loadProducts();
    } catch (e) {
      console.error(e);
      document.getElementById("saveStatus").textContent = I18N[lang].saveFail + (e?.message || e);
    }
  });

  setLangUI();
  refreshAuthUI();
})();
