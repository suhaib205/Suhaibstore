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
      featured: "مميز",
      whatsapp: "اطلب عبر واتساب",
      instagram: "تواصل إنستغرام",
      empty: "لا يوجد منتجات بعد.",
      loading: "جاري التحميل...",
      heroTitle: "متجر احترافي لمنتجاتك الرقمية",
      heroDesc: "اختر المنتج… ثم اطلب مباشرة عبر واتساب أو تواصل إنستغرام."
    },
    en: {
      dir: "ltr",
      search: "Search products...",
      allCats: "All categories",
      price: "Price",
      category: "Category",
      featured: "Featured",
      whatsapp: "Order on WhatsApp",
      instagram: "Instagram",
      empty: "No products yet.",
      loading: "Loading...",
      heroTitle: "A premium store for your digital products",
      heroDesc: "Pick a product… then order via WhatsApp or DM on Instagram."
    }
  };

  let lang = localStorage.getItem("lang") || (defaultLang || "ar");
  let cached = [];

  const overlay = document.getElementById("overlay");
  const mClose = document.getElementById("mClose");

  function setLangUI() {
    document.documentElement.lang = lang;
    document.documentElement.dir = I18N[lang].dir;

    document.title = storeName;
    document.getElementById("storeName").textContent = storeName;
    document.getElementById("storeName2").textContent = storeName;
    document.getElementById("tagline").textContent =
      (lang === "ar") ? "منتجات رقمية — اطلب عبر واتساب" : "Digital products — order via WhatsApp";

    document.getElementById("heroTitle").textContent = I18N[lang].heroTitle;
    document.getElementById("heroDesc").textContent = I18N[lang].heroDesc;

    const search = document.getElementById("search");
    search.placeholder = I18N[lang].search;

    document.getElementById("langBtn").textContent = (lang === "ar") ? "English" : "العربية";
    document.getElementById("year").textContent = new Date().getFullYear();

    // Top CTA
    document.getElementById("waTop").href = `https://wa.me/${whatsappNumber}`;
    document.getElementById("igTop").href = instagramUrl;
  }

  function buildWhatsAppLink(p) {
    const title = (lang === "ar" ? p.title_ar : p.title_en) || "";
    const msg = (lang === "ar")
      ? `مرحباً 👋\nبدي أطلب: ${title}\nالسعر: ${p.price || "-"}\nالتصنيف: ${p.category || "General"}`
      : `Hi 👋\nI want to order: ${title}\nPrice: ${p.price || "-"}\nCategory: ${p.category || "General"}`;
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

  function openModal(p) {
    document.getElementById("mTitle").textContent = (lang === "ar" ? p.title_ar : p.title_en) || "";
    document.getElementById("mImg").src = p.image_url || "logo.png";
    document.getElementById("mPrice").textContent = `${I18N[lang].price}: ${p.price || "-"}`;

    const desc = (lang === "ar" ? p.desc_ar : p.desc_en) || "";
    document.getElementById("mDesc").textContent = desc || "";

    const chips = document.getElementById("mChips");
    chips.innerHTML = "";
    const c1 = document.createElement("span");
    c1.className = "chip";
    c1.textContent = `${I18N[lang].category}: ${p.category || "General"}`;
    chips.appendChild(c1);

    if (p.featured) {
      const c2 = document.createElement("span");
      c2.className = "chip";
      c2.textContent = I18N[lang].featured;
      chips.appendChild(c2);
    }

    document.getElementById("mWA").href = buildWhatsAppLink(p);
    document.getElementById("mIG").href = instagramUrl;

    overlay.style.display = "flex";
  }

  function closeModal() {
    overlay.style.display = "none";
  }

  function render(products) {
    setLangUI();
    setCategories(products);

    const q = (document.getElementById("search").value || "").toLowerCase();
    const cat = document.getElementById("category").value;

    const filtered = products.filter(p => {
      const name = ((lang === "ar" ? p.title_ar : p.title_en) || "").toLowerCase();
      const catName = (p.category || "").toLowerCase();
      const okQ = name.includes(q) || catName.includes(q);
      const okCat = (cat === "all") || (p.category === cat);
      return okQ && okCat;
    });

    const list = document.getElementById("list");
    list.innerHTML = "";

    const empty = document.getElementById("empty");
    empty.style.display = filtered.length ? "none" : "block";
    empty.textContent = I18N[lang].empty;

    // Featured first
    filtered.sort((a,b) => (b.featured === true) - (a.featured === true));

    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";

      const thumb = document.createElement("div");
      thumb.className = "thumb";
      thumb.innerHTML = p.image_url
        ? `<img src="${p.image_url}" alt="">`
        : `<img src="logo.png" alt="">`;

      if (p.featured) {
        const b = document.createElement("div");
        b.className = "badge";
        b.textContent = I18N[lang].featured;
        thumb.appendChild(b);
      }

      const content = document.createElement("div");
      content.className = "content";

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = (lang === "ar" ? p.title_ar : p.title_en) || "";

      const descText = (lang === "ar" ? p.desc_ar : p.desc_en) || "";
      const desc = document.createElement("div");
      desc.className = "desc";
      desc.textContent = descText ? (descText.length > 90 ? descText.slice(0, 90) + "…" : descText) : "";

      const chips = document.createElement("div");
      chips.className = "chips";
      chips.innerHTML = `
        <span class="chip">${p.category || "General"}</span>
        <span class="chip price">${p.price || "-"}</span>
      `;

      content.appendChild(title);
      content.appendChild(desc);
      content.appendChild(chips);

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.innerHTML = `
        <a href="${buildWhatsAppLink(p)}" target="_blank" rel="noreferrer">${I18N[lang].whatsapp}</a>
        <a href="${instagramUrl}" target="_blank" rel="noreferrer">${I18N[lang].instagram}</a>
      `;

      card.appendChild(thumb);
      card.appendChild(content);
      card.appendChild(actions);

      // Open modal when clicking image/title area
      thumb.addEventListener("click", () => openModal(p));
      title.addEventListener("click", () => openModal(p));
      desc.addEventListener("click", () => openModal(p));

      list.appendChild(card);
    });
  }

  async function loadProducts() {
    setLangUI();
    document.getElementById("status").textContent = I18N[lang].loading;

    try {
      const supabase = window.supabase.createClient(url, anonKey);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      cached = data || [];
      document.getElementById("status").textContent = "";
      render(cached);
    } catch (e) {
      console.error(e);
      document.getElementById("status").textContent = "Error: Supabase config / policies";
      document.getElementById("empty").style.display = "block";
      document.getElementById("empty").textContent = "Error: Supabase config / policies";
    }
  }

  document.getElementById("langBtn").addEventListener("click", () => {
    lang = (lang === "ar") ? "en" : "ar";
    localStorage.setItem("lang", lang);
    render(cached);
  });
  document.getElementById("search").addEventListener("input", () => render(cached));
  document.getElementById("category").addEventListener("change", () => render(cached));

  // modal events
  mClose.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  loadProducts();
})();
