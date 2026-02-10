(() => {
  const { storeName, whatsappNumber, instagramUrl, defaultLang } = window.STORE_CONFIG;
  const { url, anonKey } = window.SUPABASE_CONFIG;

  const I18N = {
    ar: {
      dir: "rtl",
      search: "ابحث عن منتج...",
      allCats: "كل التصنيفات",
      price: "السعر",
      category: "التصنيف",
      whatsapp: "اطلب عبر واتساب",
      instagram: "تواصل إنستغرام",
      empty: "لا يوجد منتجات بعد.",
      loading: "جاري التحميل...",
      error: "صار خطأ: تأكد من Supabase URL و Anon Key و SQL_SETUP.sql"
    },
    en: {
      dir: "ltr",
      search: "Search products...",
      allCats: "All categories",
      price: "Price",
      category: "Category",
      whatsapp: "Order on WhatsApp",
      instagram: "Instagram",
      empty: "No products yet.",
      loading: "Loading...",
      error: "Error: check Supabase URL/AnonKey and SQL_SETUP.sql"
    }
  };

  let lang = localStorage.getItem("lang") || (defaultLang || "ar");

  function setLangUI() {
    document.documentElement.lang = lang;
    document.documentElement.dir = I18N[lang].dir;

    document.title = storeName;
    document.getElementById("storeName").textContent = storeName;
    document.getElementById("storeName2").textContent = storeName;
    document.getElementById("tagline").textContent = (lang === "ar")
      ? "منتجات رقمية — اطلب عبر واتساب"
      : "Digital products — order via WhatsApp";

    const search = document.getElementById("search");
    search.placeholder = I18N[lang].search;

    document.getElementById("langBtn").textContent = (lang === "ar") ? "English" : "العربية";
    document.getElementById("year").textContent = new Date().getFullYear();
  }

  function buildWhatsAppLink(p) {
    const msg = (lang === "ar")
      ? `مرحباً 👋\nبدي أطلب: ${p.title_ar}\nالسعر: ${p.price}\nالتصنيف: ${p.category}`
      : `Hi 👋\nI want to order: ${p.title_en}\nPrice: ${p.price}\nCategory: ${p.category}`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  }

  function setCategories(products) {
    const sel = document.getElementById("category");
    const cats = [...new Set(products.map(p => p.category || "General"))];
    sel.innerHTML = `<option value="all">${I18N[lang].allCats}</option>`;
    cats.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function render(products) {
    setLangUI();
    setCategories(products);

    const q = (document.getElementById("search").value || "").toLowerCase();
    const cat = document.getElementById("category").value;

    const filtered = products.filter(p => {
      const name = (lang === "ar" ? p.title_ar : p.title_en) || "";
      const okQ = name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
      const okCat = (cat === "all") || (p.category === cat);
      return okQ && okCat;
    });

    const list = document.getElementById("list");
    list.innerHTML = "";
    const empty = document.getElementById("empty");
    empty.style.display = filtered.length ? "none" : "block";
    empty.textContent = I18N[lang].empty;

    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      thumb.innerHTML = p.image_url
        ? `<img src="${p.image_url}" alt="">`
        : `<div class="hint">No image</div>`;

      const content = document.createElement("div");
      content.className = "content";
      content.innerHTML = `
        <div class="title">${lang === "ar" ? p.title_ar : p.title_en}</div>
        <div class="meta">
          <span><b>${I18N[lang].price}:</b> ${p.price || "-"}</span>
          <span>•</span>
          <span><b>${I18N[lang].category}:</b> ${p.category || "General"}</span>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.innerHTML = `
        <a href="${buildWhatsAppLink(p)}" target="_blank" rel="noreferrer">${I18N[lang].whatsapp}</a>
        <a href="${instagramUrl}" target="_blank" rel="noreferrer">${I18N[lang].instagram}</a>
      `;

      card.appendChild(thumb);
      card.appendChild(content);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  async function loadProducts() {
    setLangUI();
    document.getElementById("status").textContent = I18N[lang].loading;

    try {
      if (!url || !anonKey || url.includes("PASTE_") || anonKey.includes("PASTE_")) {
        throw new Error("Missing Supabase config");
      }

      const supabase = window.supabase.createClient(url, anonKey);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      document.getElementById("status").textContent = "";
      render(data || []);
    } catch (e) {
      console.error(e);
      document.getElementById("status").textContent = I18N[lang].error;
      document.getElementById("empty").style.display = "block";
      document.getElementById("empty").textContent = I18N[lang].error;
    }
  }

  document.getElementById("langBtn").addEventListener("click", () => {
    lang = (lang === "ar") ? "en" : "ar";
    localStorage.setItem("lang", lang);
    loadProducts();
  });
  document.getElementById("search").addEventListener("input", loadProducts);
  document.getElementById("category").addEventListener("change", loadProducts);

  loadProducts();
})();
