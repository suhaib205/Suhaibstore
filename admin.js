(() => {
  "use strict";

  const sb = window.sb;

  // عناصر
  const loginCard = document.getElementById("loginCard");
  const panel = document.getElementById("panel");
  const messageBox = document.getElementById("messageBox");

  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const userInfo = document.getElementById("userInfo");

  const productForm = document.getElementById("productForm");
  const productId = document.getElementById("productId");
  const titleAr = document.getElementById("title_ar");
  const descAr = document.getElementById("desc_ar");
  const price = document.getElementById("price");
  const currency = document.getElementById("currency");
  const featured = document.getElementById("featured");
  const imageFile = document.getElementById("imageFile");

  const imagePreview = document.getElementById("imagePreview");
  const previewText = document.getElementById("previewText");

  const refreshBtn = document.getElementById("refreshBtn");
  const searchInput = document.getElementById("searchInput");
  const tbody = document.getElementById("tbody");
  const countInfo = document.getElementById("countInfo");
  const clearBtn = document.getElementById("clearBtn");
  const saveBtn = document.getElementById("saveBtn");

  let allProducts = [];
  let currentImageUrl = "";

  // Helpers
  function showMsg(text, type = "ok") {
    messageBox.className = "msg";
    messageBox.classList.remove("hidden");
    messageBox.textContent = text;

    if (type === "ok") messageBox.classList.add("ok");
    if (type === "err") messageBox.classList.add("err");
    if (type === "warn") messageBox.classList.add("warn");
  }

  function hideMsg() {
    messageBox.classList.add("hidden");
    messageBox.textContent = "";
  }

  function setAuthUI(isAuthed, email = "") {
    if (isAuthed) {
      loginCard.classList.add("hidden");
      panel.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
      userInfo.textContent = email ? `مُسجّل الدخول: ${email}` : "";
    } else {
      loginCard.classList.remove("hidden");
      panel.classList.add("hidden");
      logoutBtn.classList.add("hidden");
      userInfo.textContent = "";
      clearForm();
    }
  }

  function clearForm() {
    productId.value = "";
    titleAr.value = "";
    descAr.value = "";
    price.value = "";
    currency.value = "JOD";
    featured.checked = false;
    imageFile.value = "";
    currentImageUrl = "";
    setPreview("");
    saveBtn.textContent = "حفظ";
  }

  function setPreview(url) {
    if (url) {
      imagePreview.src = url;
      imagePreview.style.display = "block";
      previewText.textContent = "سيتم استخدام هذه الصورة (أو اختر صورة جديدة)";
    } else {
      imagePreview.removeAttribute("src");
      imagePreview.style.display = "none";
      previewText.textContent = "لا توجد صورة";
    }
  }

  function makeFilePath(file) {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const id = (crypto.randomUUID && crypto.randomUUID()) || ("id_" + Date.now());
    return `products/${id}.${ext}`;
  }

  async function uploadImage(file) {
    const path = makeFilePath(file);

    const { error: upErr } = await sb.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: file.type || "image/*" });

    if (upErr) return { error: upErr, url: "" };

    const { data } = sb.storage.from("product-images").getPublicUrl(path);
    return { error: null, url: data?.publicUrl || "" };
  }

  // Load products
  async function loadProducts() {
    tbody.innerHTML = "";
    countInfo.textContent = "جارٍ التحميل...";

    const { data, error } = await sb
      .from("products")
      .select("id,title_ar,desc_ar,price,currency,image_url,featured,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showMsg("❌ خطأ في جلب المنتجات: " + error.message, "err");
      countInfo.textContent = "";
      return;
    }

    allProducts = Array.isArray(data) ? data : [];
    renderProducts(allProducts);
  }

  function renderProducts(list) {
    tbody.innerHTML = "";

    if (!list.length) {
      countInfo.textContent = "لا توجد منتجات.";
      return;
    }

    for (const p of list) {
      const tr = document.createElement("tr");

      const tdImg = document.createElement("td");
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = p.image_url || "";
      img.alt = "img";
      tdImg.appendChild(img);

      const tdTitle = document.createElement("td");
      tdTitle.textContent = p.title_ar || "(بدون اسم)";

      const tdPrice = document.createElement("td");
      tdPrice.textContent = (p.price || "") + " " + (p.currency || "");

      const tdFeat = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = p.featured ? "Featured" : "Normal";
      tdFeat.appendChild(pill);

      const tdActions = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "تعديل";
      editBtn.addEventListener("click", () => {
        hideMsg();
        productId.value = p.id;
        titleAr.value = p.title_ar || "";
        descAr.value = p.desc_ar || "";
        price.value = p.price || "";
        currency.value = p.currency || "JOD";
        featured.checked = !!p.featured;

        currentImageUrl = p.image_url || "";
        setPreview(currentImageUrl);

        saveBtn.textContent = "تحديث";
        window.scrollTo({ top: 0, behavior: "smooth" });
        showMsg("✏️ وضع التعديل: عدّل ثم اضغط تحديث", "warn");
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger";
      delBtn.textContent = "حذف";
      delBtn.addEventListener("click", async () => {
        const ok = confirm(`حذف المنتج: ${p.title_ar || ""} ؟`);
        if (!ok) return;

        hideMsg();
        const { error } = await sb.from("products").delete().eq("id", p.id);

        if (error) {
          console.error(error);
          showMsg("❌ فشل الحذف: " + error.message, "err");
          return;
        }

        showMsg("✅ تم الحذف", "ok");
        await loadProducts();
      });

      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);

      tr.appendChild(tdImg);
      tr.appendChild(tdTitle);
      tr.appendChild(tdPrice);
      tr.appendChild(tdFeat);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    }

    countInfo.textContent = "عدد المنتجات: " + list.length;
  }

  function applySearch() {
    const q = (searchInput.value || "").trim().toLowerCase();
    if (!q) return renderProducts(allProducts);
    renderProducts(allProducts.filter(p => (p.title_ar || "").toLowerCase().includes(q)));
  }

  // Events
  imageFile.addEventListener("change", () => {
    const file = imageFile.files && imageFile.files[0];
    if (!file) {
      setPreview(currentImageUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    previewText.textContent = "معاينة محلية (سيتم رفع الصورة عند الحفظ)";
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "جارٍ الدخول...";

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    loginBtn.textContent = "دخول";

    if (error) {
      console.error(error);
      showMsg("❌ فشل تسجيل الدخول: " + error.message, "err");
      return;
    }

    showMsg("✅ تم تسجيل الدخول", "ok");
    setAuthUI(true, data.user?.email || "");
    await loadProducts();
  });

  logoutBtn.addEventListener("click", async () => {
    hideMsg();
    const { error } = await sb.auth.signOut();
    if (error) {
      console.error(error);
      showMsg("❌ فشل تسجيل الخروج: " + error.message, "err");
      return;
    }
    showMsg("✅ تم تسجيل الخروج", "ok");
    setAuthUI(false);
  });

  refreshBtn.addEventListener("click", async () => {
    hideMsg();
    await loadProducts();
    showMsg("✅ تم التحديث", "ok");
  });

  searchInput.addEventListener("input", applySearch);

  clearBtn.addEventListener("click", () => {
    hideMsg();
    clearForm();
    showMsg("✅ تم تفريغ النموذج", "ok");
  });

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg();

    saveBtn.disabled = true;
    saveBtn.textContent = "جارٍ الحفظ...";

    const id = productId.value.trim() || null;

    const payload = {
      title_ar: titleAr.value.trim(),
      desc_ar: descAr.value.trim(),
      price: price.value.trim(),
      currency: currency.value.trim() || "JOD",
      featured: !!featured.checked,
      image_url: currentImageUrl || "",
    };

    // ✅ رفع صورة إن وجدت
    const file = imageFile.files && imageFile.files[0];
    if (file) {
      const up = await uploadImage(file);
      if (up.error) {
        console.error(up.error);
        saveBtn.disabled = false;
        saveBtn.textContent = id ? "تحديث" : "حفظ";
        showMsg("❌ فشل رفع الصورة: " + up.error.message, "err");
        return;
      }
      payload.image_url = up.url;
    }

    // ✅ Insert أو Update
    let error = null;
    if (!id) {
      const res = await sb.from("products").insert([payload]);
      error = res.error;
    } else {
      const res = await sb.from("products").update(payload).eq("id", id);
      error = res.error;
    }

    saveBtn.disabled = false;
    saveBtn.textContent = id ? "تحديث" : "حفظ";

    if (error) {
      console.error(error);
      showMsg("❌ فشل الحفظ: " + error.message, "err");
      return;
    }

    showMsg(id ? "✅ تم تحديث المنتج" : "✅ تم إضافة المنتج", "ok");
    clearForm();
    await loadProducts();
  });

  // Init
  (async () => {
    if (!sb) {
      alert("❌ Supabase غير جاهز. تأكد من supabase-config.js");
      return;
    }

    const { data } = await sb.auth.getSession();
    const session = data?.session;

    if (session?.user) {
      setAuthUI(true, session.user.email || "");
      await loadProducts();
    } else {
      setAuthUI(false);
    }

    setPreview("");
  })();
})();

