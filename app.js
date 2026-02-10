(() => {
  const cfg = window.SUPABASE_CONFIG;

  document.getElementById("brandName").textContent = cfg.brandName;
  document.getElementById("brandName2").textContent = cfg.brandName;
  document.getElementById("year").textContent = new Date().getFullYear();

  const waLink = `https://wa.me/${cfg.whatsappNumber}`;
  document.getElementById("btnWhatsApp").href = waLink;
  document.getElementById("btnInstagram").href = cfg.instagramUrl;

  const client = supabase.createClient(cfg.url, cfg.anonKey);

  const grid = document.getElementById("grid");
  const q = document.getElementById("q");
  const filterFeatured = document.getElementById("filterFeatured");

  let all = [];

  function money(p, c){
    if (p === null || p === undefined || p === "") return "";
    const n = Number(p);
    if (Number.isNaN(n)) return "";
    return `${c || "USD"} ${n.toFixed(2)}`;
  }

  function imgUrl(path){
    if (!path) return "logo.png";
    const { data } = client.storage.from(cfg.bucket).getPublicUrl(path);
    return data.publicUrl || "logo.png";
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
        <img src="${imgUrl(p.image_path)}" alt="">
        <div class="content">
          <div class="titleRow">
            <h3>${p.title || ""}</h3>
            <div class="price">${money(p.price, p.currency)}</div>
          </div>
          <div class="desc">${p.description || "—"}</div>
          ${p.featured ? `<div class="pill">⭐ Featured</div>` : ``}
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
            <a class="btn primary" target="_blank" rel="noopener"
               href="${waLink}?text=${encodeURIComponent("مرحباً، بدي أطلب: " + (p.title||""))}">
              اطلب على واتساب
            </a>
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
