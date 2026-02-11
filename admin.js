(() => {
  "use strict";

  // =========================================================
  // Helpers
  // =========================================================
  const $ = (id) => document.getElementById(id);

  function showMessage(text, type = "ok") {
    const box = $("messageBox");
    box.className = "msg"; // reset
    box.classList.remove("hidden");
    box.textContent = text;

    if (type === "ok") box.classList.add("ok");
    else if (type === "err") box.classList.add("err");
    else box.classList.add("warn");
  }

  function hideMessage() {
    const box = $("messageBox");
    box.classList.add("hidden");
    box.textContent = "";
  }

  function fmtDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("ar-JO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function safeStr(v) {
    return (v ?? "").toString();
  }

  function pickExt(fileName, fallback = "png") {
    const parts = safeStr(fileName).split(".");
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
    return ext || fallback;
  }

  function makeFilePath(file) {
    // مسار نظيف داخل bucket
    const ext = pickExt(file.name, "png");
    const rand =
      (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
      `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return `products/${rand}.${ext}`;
  }

  // محاولة استخراج path من public URL (للحذف الاختياري)
  function tryExtractStoragePathFromPublicUrl(imageUrl) {
    // شكل شائع:
    // https://XXXX.supabase.co/storage/v1/object/public/product-images/products/abc.png
    const url = safeStr(imageUrl);
    const marker = "/storage/v1/object/public/product-images/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  // =========================================================
  // Supabase Client
  // =========================================================
  const sb = window.sb;
  if (!sb) {
    alert("❌ Supabase client غير جاهز. تأكد من supabase-config.js وأنه يشتغل قبل admin.js");
    return;
  }

  // =========================================================
  // Elements
  // =========================================================
  const authSection = $("authSection");
  const adminSection = $("adminSection");

  const loginForm = $("loginForm");
  const loginBtn = $("loginBtn");
  const fillDemoBtn = $("fillDemoBtn");

  const logoutBtnTop = $("logoutBtnTop");

  const productForm = $("productForm");
  const saveBtn = $("saveBtn");
  const clearBtn = $("clearBtn");

  const refreshBtn = $("refreshBtn");
  const searchInput = $("searchInput");
  const productsTbody = $("productsTbody");
  const countInfo = $("countInfo");

  const productIdEl = $("productId");
  const titleArEl = $("title_ar");
  const descArEl = $("desc_ar");
  const priceEl = $("price");
  const currencyEl = $("currency");
  const featuredEl = $("featured");
  const imageFileEl = $("imageFile");

  const imagePreview = $("imagePreview");
  const imagePreviewText = $("imagePreviewText");
  const userInfo = $("userInfo");

  // =========================================================
  // State
  // =========================================================
  let currentUser = null;
  let allProducts = [];
  let currentImageUrl = ""; // للصورة الحالية أثناء التعديل

  // =========================================================
  // UI
  // =========================================================
  function setAuthUI(isAuthed) {
    if (isAuthed) {
      authSection.classList.add("hidden");
      adminSection.classList.remove("hidden");
      logoutBtnTop.classList.remove("hidden");
    } else {
      authSection.classList.remove("hidden");
      adminSection.classList.add("hidden");
      logoutBtnTop.classList.add("hidden");
      clearForm();
    }
  }

  function setPreview(url) {
    const u = safeStr(url);
    if (u) {
      imagePreview.src = u;
      imagePreview.style.display = "block";
      imagePreviewText.textContent = "سيتم استخدام هذه الصورة (أو اختر صورة جديدة للتبديل).";
    } else {
      imagePreview.removeAttribute("src");
      imagePreview.style.display = "none";
      imagePreviewText.textContent = "لا توجد صورة حالياً";
    }
  }

  function setBusy(btn, busy, textWhenBusy = "جارٍ التنفيذ...") {
    btn.disabled = !!busy;
    btn.dataset._oldText = btn.dataset._oldText || btn.textContent;
    btn.textContent = busy ? textWhenBusy : btn.dataset._oldText;
  }

  // =========================================================
  // Auth
  // =========================================================
  async function refreshSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) {
      showMessage(`❌ خطأ في جلب الجلسة: ${error.message}`, "err");
      setAuthUI(false);
      return;
    }

    const session = data?.session || null;
    currentUser = session?.user || null;

    if (currentUser) {
      userInfo.textContent = `مُسجّل الدخول: ${safeStr(currentUser.email)}`;
      setAuthUI(true);
      await loadProducts();
    } else {
      setAuthUI(false);
    }
  }

  async function signIn(email, password) {
    hideMessage();
    setBusy(loginBtn, true, "جارٍ تسجيل الدخول...");

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(loginBtn, false);

    if (error) {
      showMessage(`❌ فشل تسجيل الدخول: ${error.message}`, "err");
      return;
    }

    currentUser = data?.user || null;
    showMessage("✅ تم تسجيل الدخول بنجاح", "ok");
    await refreshSession();
  }

  async function signOut() {
    hideMessage();
    setBusy(logoutBtnTop, true, "جارٍ تسجيل الخروج...");

    const { error } = await sb.auth.signOut();

    setBusy(logoutBtnTop, false);

    if (error) {
      showMessage(`❌ فشل تسجيل الخروج: ${error.message}`, "err");
      return;
    }

    showMessage("✅ تم تسجيل الخروج", "ok");
    currentUser = null;
    setAuthUI(false);
  }

  // =========================================================
  // DB Operations (products table)
  // =========================================================
  async function loadProducts() {
    hideMessage();
    productsTbody.innerHTML = "";
    countInfo.textContent = "جارٍ تحميل المنتجات...";

    // ✅ نختار فقط الأعمدة الموجودة فعلاً
    const { data, error } = await sb
      .from("products")
      .select("id,title_ar,desc_ar,price,currency,image_url,featured,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(`❌ خطأ في جلب المنتجات: ${error.message}`, "err");
      countInfo.textContent = "";
      return;
    }

    allProducts = Array.isArray(data) ? data : [];
    renderProducts(allProducts);
  }

  async function saveProduct(payload, id = null) {
    // payload يحتوي فقط الأعمدة المطلوبة
    if (!id) {
      // Insert
      const { error } = await sb.from("products").insert([payload]);
      return { error };
    } else {
      // Update
      const { error } = await sb.from("products").update(payload).eq("id", id);
      return { error };
    }
  }

  async function deleteProduct(product) {
    const id = product?.id;
    if (!id) return;

    // (اختياري) محاولة حذف الصورة من الـ bucket إذا قدرنا نستخرج المسار
    const maybePath = tryExtractStoragePathFromPublicUrl(product.image_url);

    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) return { error };

    // حذف الصورة (Best-effort)
    if (maybePath) {
      try {
        await sb.storage.from("product-images").remove([maybePath]);
      } catch (_) {
        // نتجاهل أي خطأ هنا لأنه اختياري
      }
    }

    return { error: null };
  }

  // =========================================================
  // Storage (product-images bucket)
  // =========================================================
  async function uploadImageIfAny(file) {
    if (!file) return { imageUrl: "" };

    const path = makeFilePath(file);

    const { error: uploadError } = await sb.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/*",
      });

    if (uploadError) {
      return { error: uploadError, imageUrl: "" };
    }

    // getPublicUrl يفترض أن الـ bucket public (أو على الأقل القراءة متاحة)
    const { data } = sb.storage.from("product-images").getPublicUrl(path);
    const publicUrl = data?.publicUrl || "";

    return { error: null, imageUrl: publicUrl };
  }

  // =========================================================
  // Render
  // =========================================================
  function renderProducts(list) {
    productsTbody.innerHTML = "";

    if (!list.length) {
      countInfo.textContent = "لا توجد منتجات حالياً.";
      return;
    }

    for (const p of list) {
      const tr = document.createElement("tr");

      // image
      const tdImg = document.createElement("td");
      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = "صورة المنتج";
      img.src = p.image_url || "";
      if (!p.image_url) {
        img.style.opacity = "0.35";
      }
      tdImg.appendChild(img);

      // title_ar
      const tdTitle = document.createElement("td");
      tdTitle.textContent = safeStr(p.title_ar) || "(بدون اسم)";

      // price + currency
      const tdPrice = document.createElement("td");
      const price = safeStr(p.price);
      const cur = safeStr(p.currency) || "—";
      tdPrice.textContent = price ? `${price} ${cur}` : `— ${cur}`;

      // featured
      const tdFeatured = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = "pill " + (p.featured ? "featured" : "normal");
      pill.textContent = p.featured ? "Featured" : "Normal";
      tdFeatured.appendChild(pill);

      // created_at
      const tdDate = document.createElement("td");
      tdDate.textContent = fmtDate(p.created_at);

      // actions
      const tdActions = document.createElement("td");
      const wrap = document.createElement("div");
      wrap.className = "actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "ghost";
      editBtn.textContent = "تعديل";
      editBtn.addEventListener("click", () => startEdit(p));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "حذف";
      delBtn.addEventListener("click", async () => {
        const ok = confirm(`هل أنت متأكد من حذف المنتج: "${safeStr(p.title_ar)}" ؟`);
        if (!ok) return;

        hideMessage();
        const { error } = await deleteProduct(p);
        if (error) {
          showMessage(`❌ فشل الحذف: ${error.message}`, "err");
          return;
        }
        showMessage("✅ تم حذف المنتج", "ok");
        await loadProducts();
      });

      wrap.appendChild(editBtn);
      wrap.appendChild(delBtn);
      tdActions.appendChild(wrap);

      tr.appendChild(tdImg);
      tr.appendChild(tdTitle);
      tr.appendChild(tdPrice);
      tr.appendChild(tdFeatured);
      tr.appendChild(tdDate);
      tr.appendChild(tdActions);

      productsTbody.appendChild(tr);
    }

    countInfo.textContent = `عدد المنتجات: ${list.length}`;
  }

  function applySearchFilter() {
    const q = safeStr(searchInput.value).trim().toLowerCase();
    if (!q) {
      renderProducts(allProducts);
      return;
    }
    const filtered = allProducts.filter((p) =>
      safeStr(p.title_ar).toLowerCase().includes(q)
    );
    renderProducts(filtered);
  }

  // =========================================================
  // Form
  // =========================================================
  function clearForm() {
    productIdEl.value = "";
    titleArEl.value = "";
    descArEl.value = "";
    priceEl.value = "";
    currencyEl.value = "JOD";
    featuredEl.checked = false;
    imageFileEl.value = "";
    currentImageUrl = "";
    setPreview("");
    saveBtn.dataset._oldText = "حفظ المنتج";
    saveBtn.textContent = "حفظ المنتج";
  }

  function startEdit(product) {
    productIdEl.value = product.id;
    titleArEl.value = safeStr(product.title_ar);
    descArEl.value = safeStr(product.desc_ar);
    priceEl.value = safeStr(product.price);
    currencyEl.value = safeStr(product.currency) || "JOD";
    featuredEl.checked = !!product.featured;

    currentImageUrl = safeStr(product.image_url);
    setPreview(currentImageUrl);

    saveBtn.dataset._oldText = "تحديث المنتج";
    saveBtn.textContent = "تحديث المنتج";

    window.scrollTo({ top: 0, behavior: "smooth" });
    showMessage("✏️ وضع التعديل مفعل — عدّل البيانات ثم اضغط تحديث المنتج", "warn");
  }

  // معاينة الصورة قبل الرفع
  imageFileEl.addEventListener("change", () => {
    const file = imageFileEl.files?.[0];
    if (!file) {
      setPreview(currentImageUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    imagePreviewText.textContent = "هذه معاينة محلية (سيتم رفع الملف عند الحفظ).";
  });

  // =========================================================
  // Events
  // =========================================================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = safeStr($("email").value).trim();
    const password = safeStr($("password").value);

    if (!email || !password) {
      showMessage("⚠️ الرجاء إدخال الإيميل وكلمة المرور", "warn");
      return;
    }
    await signIn(email, password);
  });

  fillDemoBtn.addEventListener("click", () => {
    $("email").value = "admin@email.com";
    $("password").value = "password";
    showMessage("✳️ تم تعبئة بيانات تجريبية (غيّرها لبياناتك الحقيقية)", "warn");
  });

  logoutBtnTop.addEventListener("click", signOut);

  clearBtn.addEventListener("click", () => {
    hideMessage();
    clearForm();
    showMessage("✅ تم تفريغ النموذج", "ok");
  });

  refreshBtn.addEventListener("click", async () => {
    hideMessage();
    await loadProducts();
    showMessage("✅ تم التحديث", "ok");
  });

  searchInput.addEventListener("input", applySearchFilter);

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage();

    if (!currentUser) {
      showMessage("❌ يجب تسجيل الدخول أولاً", "err");
      return;
    }

    const id = safeStr(productIdEl.value).trim() || null;
    const title_ar = safeStr(titleArEl.value).trim();
    const desc_ar = safeStr(descArEl.value).trim();
    const price = safeStr(priceEl.value).trim();
    const currency = safeStr(currencyEl.value).trim() || "JOD";
    const featured = !!featuredEl.checked;

    if (!title_ar || !price) {
      showMessage("⚠️ الاسم والسعر مطلوبين", "warn");
      return;
    }

    setBusy(saveBtn, true, "جارٍ الحفظ...");

    // رفع صورة (إن وجدت)
    const file = imageFileEl.files?.[0] || null;
    let image_url = currentImageUrl; // الافتراضي: احتفظ بالصورة الحالية
    if (file) {
      const up = await uploadImageIfAny(file);
      if (up.error) {
        setBusy(saveBtn, false);
        showMessage(`❌ فشل رفع الصورة: ${up.error.message}`, "err");
        return;
      }
      image_url = up.imageUrl;
    }

    // ✅ payload مطابق للأعمدة المطلوبة فقط
    const payload = {
      title_ar,
      desc_ar,
      price,
      currency,
      image_url,
      featured,
    };

    const { error } = await saveProduct(payload, id);

    setBusy(saveBtn, false);

    if (error) {
      showMessage(`❌ فشل الحفظ: ${error.message}`, "err");
      return;
    }

    showMessage(id ? "✅ تم تحديث المنتج" : "✅ تم إضافة المنتج", "ok");
    clearForm();
    await loadProducts();
  });

  // =========================================================
  // Init
  // =========================================================
  async function init() {
    // Listener لأي تغيير بالجلسة (تسجيل دخول/خروج)
    sb.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) {
        userInfo.textContent = `مُسجّل الدخول: ${safeStr(currentUser.email)}`;
        setAuthUI(true);
        await loadProducts();
      } else {
        setAuthUI(false);
      }
    });

    // جلسة أول ما الصفحة تفتح
    await refreshSession();

    // preview start
    setPreview("");
  }

  init().catch((err) => {
    console.error(err);
    showMessage(`❌ خطأ غير متوقع: ${err.message || err}`, "err");
  });
})();
