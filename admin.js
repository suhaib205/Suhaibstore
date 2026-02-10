// admin.js (FULL FILE)
const sb = window.supabaseClient;

const $ = (id) => document.getElementById(id);

const loginBox = $("loginBox");
const adminBox = $("adminBox");

const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const refreshBtn = $("refreshBtn");
const saveBtn = $("saveBtn");

const loginMsg = $("loginMsg");
const saveMsg = $("saveMsg");
const productsList = $("productsList");

function setMsg(el, text, type) {
  el.classList.remove("ok", "err");
  if (type) el.classList.add(type);
  el.textContent = text || "";
}

function publicImageUrl(path) {
  if (!path) return "";
  const { data } = sb.storage.from("product-images").getPublicUrl(path);
  return data?.publicUrl || "";
}

async function showSessionUI() {
  const { data } = await sb.auth.getSession();
  const session = data?.session;

  if (session) {
    loginBox.style.display = "none";
    adminBox.style.display = "block";
    logoutBtn.style.display = "inline-flex";
    await loadProducts();
  } else {
    loginBox.style.display = "block";
    adminBox.style.display = "none";
    logoutBtn.style.display = "none";
  }
}

async function doLogin() {
  setMsg(loginMsg, "جاري تسجيل الدخول…");
  const email = ($("email").value || "").trim();
  const password = $("password").value || "";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return setMsg(loginMsg, "خطأ: " + error.message, "err");

  setMsg(loginMsg, "تم تسجيل الدخول ✅", "ok");
  await showSessionUI();
}

async function doLogout() {
  await sb.auth.signOut();
  setMsg(saveMsg, "");
  await showSessionUI();
}

async function uploadImageIfAny() {
  const file = $("image").files?.[0];
  if (!file) return null;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;

  const { error } = await sb.storage
    .from("product-images")
    .upload(fileName, file, { upsert: false, contentType: file.type });

  if (error) throw error;
  return fileName;
}

async function saveProduct() {
  setMsg(saveMsg, "جاري الحفظ…");

  const title = ($("title").value || "").trim();
  const description = ($("description").value || "").trim() || null;
  const priceRaw = $("price").value;
  const price = priceRaw === "" ? null : Number(priceRaw);
  const currency = ($("currency").value || "USD").trim() || "USD";
  const featured = $("featured").value === "true";

  if (!title) return setMsg(saveMsg, "اكتب اسم المنتج.", "err");

  try {
    const image_path = await uploadImageIfAny();

    const payload = {
      title,
      description,
      price,
      currency,
      featured,
      image_path: image_path || null,
    };

    const { error } = await sb.from("products").insert(payload);
    if (error) throw error;

    setMsg(saveMsg, "تم الحفظ ✅", "ok");

    // reset
    $("title").value = "";
    $("description").value = "";
    $("price").value = "";
    $("currency").value = currency;
    $("featured").value = "false";
    $("image").value = "";

    await loadProducts();
  } catch (e) {
    setMsg(saveMsg, "خطأ بالحفظ: " + (e?.message || e), "err");
  }
}

async function loadProducts() {
  productsList.innerHTML = "جاري التحميل…";

  const { data, error } = await sb
    .from("products")
    .select("id,title,description,price,currency,image_path,featured,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    productsList.innerHTML = "خطأ: " + error.message;
    return;
  }

  if (!data?.length) {
    productsList.innerHTML = "لا يوجد منتجات.";
    return;
  }

  productsList.innerHTML = "";
  data.forEach((p) => {
    const div = document.createElement("div");
    div.className = "item";

    const imgUrl = publicImageUrl(p.image_path);
    div.innerHTML = `
      <div class="thumb">${imgUrl ? `<img src="${imgUrl}" alt="">` : ""}</div>
      <div>
        <div style="font-weight:800">${p.title || ""} ${p.featured ? "⭐" : ""}</div>
        <div style="opacity:.75;font-size:13px">${p.currency || "USD"} ${p.price ?? ""}</div>
        <div style="opacity:.7;font-size:13px;line-height:1.5;margin-top:6px">${p.description || ""}</div>
        <div class="actions">
          <button class="btn danger" data-del="${p.id}" data-img="${p.image_path || ""}" type="button">حذف</button>
        </div>
      </div>
    `;
    productsList.appendChild(div);
  });

  productsList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const img = btn.getAttribute("data-img");
      if (!confirm("متأكد بدك تحذف المنتج؟")) return;

      // delete db row
      const { error } = await sb.from("products").delete().eq("id", id);
      if (error) return alert("خطأ بالحذف: " + error.message);

      // delete image (optional)
      if (img) await sb.storage.from("product-images").remove([img]);

      await loadProducts();
    });
  });
}

loginBtn.addEventListener("click", doLogin);
logoutBtn.addEventListener("click", doLogout);
saveBtn.addEventListener("click", saveProduct);
refreshBtn.addEventListener("click", loadProducts);

sb.auth.onAuthStateChange(() => showSessionUI());
showSessionUI();
