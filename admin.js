(() => {
  const cfg = window.SUPABASE_CONFIG;
  const client = supabase.createClient(cfg.url, cfg.anonKey);

  const loginPanel = document.getElementById("loginPanel");
  const adminPanel = document.getElementById("adminPanel");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginStatus = document.getElementById("loginStatus");

  const titleEl = document.getElementById("title");
  const priceEl = document.getElementById("price");
  const currencyEl = document.getElementById("currency");
  const featuredEl = document.getElementById("featured");
  const descEl = document.getElementById("description");
  const imageEl = document.getElementById("image");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("list");

  function setMsg(el, msg, ok=false){
    el.className = "status " + (ok ? "ok" : "err");
    el.textContent = msg || "";
  }

  async function refreshAuthUI(){
    const { data } = await client.auth.getSession();
    const authed = !!data?.session;

    loginPanel.style.display = authed ? "none" : "block";
    adminPanel.style.display = authed ? "block" : "none";
    logoutBtn.style.display = authed ? "inline-flex" : "none";

    if (authed) await loadProducts();
  }

  loginBtn.addEventListener("click", async () => {
    setMsg(loginStatus, "جاري تسجيل الدخول...", true);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) return setMsg(loginStatus, "اكتب الإيميل والباسورد");

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return setMsg(loginStatus, "خطأ دخول: " + error.message);

    setMsg(loginStatus, "تم تسجيل الدخول ✅", true);
    await refreshAuthUI();
  });

  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    await refreshAuthUI();
  });

  function publicUrl(path){
    const { data } = client.storage.from(cfg.bucket).getPublicUrl(path);
    return data.publicUrl || "logo.png";
  }

  async function uploadImage(file){
    if (!file) return null;

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `products/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error } = await client.storage.from(cfg.bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  async function loadProducts(){
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      listEl.innerHTML = `<div class="small">خطأ تحميل: ${error.message}</div>`;
      return;
    }

    listEl.innerHTML = (data || []).map(p => `
      <div class="card">
        <img src="${p.image_path ? publicUrl(p.image_path) : "logo.png"}" alt="">
        <div class="content">
          <div class="titleRow">
            <h3>${p.title || ""}</h3>
            <div class="price">${(p.currency || "USD")} ${p.price ? Number(p.price).toFixed(2) : ""}</div>
          </div>
          <div class="desc">${p.description || "—"}</div>
          ${p.featured ? `<div class="pill">⭐ Featured</div>` : ``}
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" data-del="${p.id}">حذف</button>
          </div>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        if (!confirm("متأكد بدك تحذف المنتج؟")) return;

        const { error } = await client.from("products").delete().eq("id", id);
        if (error) return setMsg(statusEl, "خطأ حذف: " + error.message);
        setMsg(statusEl, "تم الحذف ✅", true);
        await loadProducts();
      });
    });
  }

  saveBtn.addEventListener("click", async () => {
    try{
      setMsg(statusEl, "جاري الحفظ...", true);

      const title = titleEl.value.trim();
      if (!title) return setMsg(statusEl, "اكتب اسم المنتج");

      const price = priceEl.value ? Number(priceEl.value) : null;
      const currency = currencyEl.value.trim() || "USD";
      const featured = featuredEl.value === "true";
      const description = descEl.value.trim() || null;

      const file = imageEl.files?.[0] || null;
      const image_path = file ? await uploadImage(file) : null;

      const { error } = await client.from("products").insert([{
        title, price, currency, featured, description, image_path
      }]);

      if (error) return setMsg(statusEl, "خطأ حفظ: " + error.message);

      setMsg(statusEl, "تم الحفظ ✅", true);

      titleEl.value = "";
      priceEl.value = "";
      featuredEl.value = "false";
      descEl.value = "";
      imageEl.value = "";

      await loadProducts();
    } catch(e){
      setMsg(statusEl, "خطأ: " + (e?.message || e));
    }
  });

  refreshAuthUI();
})();
