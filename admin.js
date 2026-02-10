(() => {
  const { url, anonKey, storageBucket } = window.SUPABASE_CONFIG;
  const supabase = window.supabase.createClient(url, anonKey);

  const loginBox = document.getElementById("loginBox");
  const adminBox = document.getElementById("adminBox");
  const logoutBtn = document.getElementById("logoutBtn");

  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  const saveBtn = document.getElementById("saveBtn");
  const saveMsg = document.getElementById("saveMsg");
  const adminHint = document.getElementById("adminHint");

  function setUI(isAuthed) {
    loginBox.style.display = isAuthed ? "none" : "block";
    adminBox.style.display = isAuthed ? "block" : "none";
    logoutBtn.style.display = isAuthed ? "inline-flex" : "none";
    adminHint.textContent = isAuthed
      ? "✅ أنت مسجل دخول. تقدر تضيف/تعدل/تحذف."
      : "🔒 لازم تسجل دخول عشان تقدر تضيف منتجات.";
  }

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    setUI(!!data.session);
  }

  loginBtn.addEventListener("click", async () => {
    loginMsg.textContent = "جاري تسجيل الدخول...";
    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      loginMsg.textContent = "✅ تم الدخول";
      await checkSession();
    } catch (e) {
      loginMsg.textContent = "❌ " + (e.message || "فشل الدخول");
      console.error(e);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    setUI(false);
  });

  async function uploadImage(file) {
    if (!file) return null;

    const bucket = storageBucket || "product-images";
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `products/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  saveBtn.addEventListener("click", async () => {
    saveMsg.textContent = "جاري الحفظ...";
    try {
      // تأكد أنك مسجل دخول
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        saveMsg.textContent = "❌ لازم تسجل دخول أولاً";
        setUI(false);
        return;
      }

      const product = {
        title_ar: document.getElementById("title_ar").value.trim(),
        title_en: document.getElementById("title_en").value.trim(),
        desc_ar: document.getElementById("desc_ar").value.trim(),
        desc_en: document.getElementById("desc_en").value.trim(),
        price: document.getElementById("price").value.trim(),
        category: document.getElementById("category").value.trim() || "General",
        featured: document.getElementById("featured").value === "true",
      };

      const file = document.getElementById("image").files?.[0] || null;
      const imageUrl = await uploadImage(file);
      if (imageUrl) product.image_url = imageUrl;

      const { error } = await supabase.from("products").insert([product]);
      if (error) throw error;

      saveMsg.textContent = "✅ تم حفظ المنتج";
      // تفريغ الحقول
      ["title_ar","title_en","desc_ar","desc_en","price","category"].forEach(id => {
        document.getElementById(id).value = "";
      });
      document.getElementById("image").value = "";
      document.getElementById("featured").value = "false";
    } catch (e) {
      console.error(e);
      saveMsg.textContent = "❌ " + (e.message || "فشل الحفظ");
    }
  });

  // تحديث واجهة حسب الدخول
  supabase.auth.onAuthStateChange(() => checkSession());
  checkSession();
})();
