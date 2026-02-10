/* Suhaib Store - Public page */

const { createClient } = supabase;
const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// عدّل روابط التواصل هون فقط (بدون ما تلمس أي شي ثاني)
const WHATSAPP_LINK = "https://wa.me/XXXXXXXXXXX";
const INSTAGRAM_LINK = "https://instagram.com/USERNAME";

document.getElementById("whatsBtn").href = WHATSAPP_LINK;
document.getElementById("instaBtn").href = INSTAGRAM_LINK;

const productsEl = document.getElementById("products");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

let allProducts = [];

function safeText(v){ return (v ?? "").toString(); }

function formatPrice(p, currency){
  if (p === null || p === undefined || p === "") return "";
  const cur = currency || "USD";
  return `${cur} ${Number(p).toFixed(2)}`;
}

function getPublicImageUrl(image_path){
  if (!image_path) return "";
  // bucket لازم اسمه product-images
  const { data } = supa.storage.from("product-images").getPublicUrl(image_path);
  return data?.publicUrl || "";
}

function render(list){
  productsEl.innerHTML = "";

  if (!list.length){
    productsEl.innerHTML = `<div style="opacity:.7;padding:10px">لا يوجد منتجات حالياً</div>`;
    return;
  }

  for (const p of list){
    const imgUrl = getPublicImageUrl(p.image_path);

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="thumb">
        ${imgUrl ? `<img src="${imgUrl}" alt="${safeText(p.title)}" loading="lazy">` : ``}
      </div>
      <div class="card-body">
        ${p.featured ? `<div class="badge">⭐ Featured</div>` : ``}
        <h3 class="title">${safeText(p.title)}</h3>
        <p class="desc">${safeText(p.description)}</p>
        <div class="price">${formatPrice(p.price, p.currency)}</div>
      </div>
    `;

    productsEl.appendChild(card);
  }
}

function applyFilters(){
  const q = safeText(searchInput.value).trim().toLowerCase();
  const mode = filterSelect.value;

  let list = allProducts.slice();

  if (mode === "featured") list = list.filter(x => !!x.featured);

  if (q){
    list = list.filter(x =>
      safeText(x.title).toLowerCase().includes(q) ||
      safeText(x.description).toLowerCase().includes(q)
    );
  }

  render(list);
}

async function load(){
  const { data, error } = await supa
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error){
    productsEl.innerHTML = `<div style="color:#ffb4b4;padding:10px">خطأ: ${safeText(error.message)}</div>`;
    return;
  }

  allProducts = data || [];
  applyFilters();
}

searchInput.addEventListener("input", applyFilters);
filterSelect.addEventListener("change", applyFilters);

load();
