(() => {
  const cfg = window.SUPABASE_CONFIG;
  document.getElementById("brandName").textContent = cfg.brandName;
  document.getElementById("year").textContent = new Date().getFullYear();

  const wa = document.getElementById("btnWhatsApp");
  const ig = document.getElementById("btnInstagram");
  const waLink = `https://wa.me/${cfg.whatsappNumber}`;
  wa.href = waLink;
  ig.href = cfg.instagramUrl;

  const client = supabase.createClient(cfg.url, cfg.anonKey);

  const grid = document.getElementById("grid");
  const q = document.getElementById("q");
  const filterFeatured = document.getElementById("filterFeatured");

  let all = [];

  function money(p, c){
    if (p === null || p === undefined || p === "") return "";
    return `${c || "USD"} ${Number(p).toFixed(2)}`;
  }

  function imgUrl(path){
    if (!path) return "https://picsum.photos/seed/suhaib/800/600";
    const { data } = client.storage.from(cfg.bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  function render(){
    const term = (q.value || "").trim().toLowerCase();
    const onlyFeat = filterFeatured.value === "featured";

    const list = all.filter(x => {
      const okFeat = !onlyFeat || !!x.featured;
      const okTerm = !term || (x.title||"").toLowerCase().includes(term) || (x.description||"").toLowerCase().includes(term);
      return okFeat && okTerm;
    });

    grid.innerHTML = list.map(p => `
      <div class="card">
        <img src="${imgUrl(p.image_path)}" alt="${p.title || ""}">
        <div class="content">
          <div class="titleRow">
            <h3>${p.title || ""}</h3>
            <div class="price">${money(p.price, p.currency)}</div>
          </div>
          ${p.description ? `<div class="desc">${p.description}</div>` : `<div class="desc">—</div>`}
          ${p.featured ? `<div class="pill">⭐ Featured</div>` : ``}
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn primary" target="_blank" rel="noopener" href="${waLink}">اطلب على واتساب</a>
            <a class="btn" target="_blank" rel="noopener" href="${cfg.instagramUrl}">اطلب على انستغرام</a>
          </div>
        </div>
      </div>
    `).join("");
  }

  async function load(){
    const { data, error } = await client
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      grid.innerHTML = `<div class="small">خطأ تحميل المنتجات: ${error.message}</div>`;
      return;
    }
    all = data || [];
    render();
  }

  q.addEventListener("input", render);
  filterFeatured.addEventListener("change", render);

  load();
})();
