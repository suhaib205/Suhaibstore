// admin.js (FULL FILE)

// ملاحظة: لازم يكون في supabase-config.js متغير اسمه supabaseClient
// مثال: window.supabaseClient = supabase.createClient(URL, KEY);

const $ = (id) => document.getElementById(id);

const loginSection = $("loginSection");
const adminSection = $("adminSection");

const emailInput = $("email");
const passInput = $("password");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");

const loginMsg = $("loginMsg");
const saveMsg = $("saveMsg");

const titleInput = $("title");
const priceInput = $("price");
const currencyInput = $("currency");
const featuredSelect = $("featured");
const descriptionInput = $("description");
const imageInput = $("image");

const saveBtn = $("saveBtn");
const refreshBtn = $("refreshBtn");
const productsList = $("productsList");

function setMsg(el, text, type = "") {
  if (!el) return;
  el.classList.remove("ok", "err");
  if (type === "ok") el.classList.add("ok");
  if (type === "err") el.classList.add("err");
  el.textContent = text || "";
}

function requireSupabase() {
  if (!window.supabaseClient) {
    setMsg(loginMsg, "❌ خطأ: supabaseClient غير موجود. تأكد supabase-config.js صح.", "err");
    throw new Error("supabaseClient not found. Check supabase-config.js");
  }
  return window.supabaseClient;
}

async function showUIForSession() {
  const supabaseClient = requireSupabase();
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    setMsg(loginMsg, "❌ مشكلة في قراءة الجلسة: " + error.message, "err");
    loginSection.style.display = "block";
    adminSection.style.display = "none";
    logoutBtn.style.display = "none";
    return;
  }

  const session = data?.session;

  if (session?.user) {
    // Logged in
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    logoutBtn.style.display = "inline-flex";
    setMsg(saveMsg, "✅ تم تسجيل الدخول: " + (session.user.email || ""), "ok");
    await loadProducts();
  } else {
    // Logged out
    loginSection.style.display = "block";
    adminSection.style.display = "none";
    logoutBtn.style.display = "none";
  }
}

async function doLogin() {
  const supabaseClient = requireSupabase();
  setMsg(loginMsg, "⏳ جاري تسجيل الدخول...");

  const email = (emailInput?.value || "").trim();
  const password = passInput?.value || "";

  if (!email || !password) {
    setMsg(loginMsg, "❌ اكتب الإيميل وكلمة المرور.", "err");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(loginMsg, "❌ فشل تسجيل الدخول: " + error.message, "err");
      return;
    }

    if (data?.user) {
      setMsg(loginMsg, "✅ تم تسجيل الدخول بنجاح.", "ok");
    } else {
      setMsg(loginMsg, "⚠️ تم الطلب لكن لم يتم إنشاء جلسة. جرّب تحديث الصفحة.", "err");
    }

    await showUIForSession();
  } catch (e) {
    setMsg(loginMsg, "❌ خطأ غير متوقع: " + (e?.message || e), "err");
  }
}

async function doLogout() {
  const supabaseClient = requireSupabase();
  setMsg(saveMsg, "⏳ جاري تسجيل الخروج...");
  await supabaseClient.auth.signOut();
  setMsg(saveMsg, "");
  await showUIForSession();
}

function makePublicImageUrl(image_path) {
  // إذا كانت الصورة مخزنة كسطر في DB (image_path) مثل: "12345.png" أو "folder/123.png"
  // خلي admin.js يبني رابطها من Bucket
  const supabaseClient = requireSupabase();
  const { data } = supabaseClient.storage.from("product-images").getPublicUrl(image_path);
  return data?.publicUrl || "";
}

async function uploadImageIfAny() {
  const supabaseClient = requireSupabase();
  const file = imageInput?.files?.[0];

  if (!file) return null;

  // اسم ملف فريد
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  // رفع على bucket product-images
  const { data, error } = await supabaseClient.storage
    .from("product-images")
    .upload(fileName, file, { upsert: false });

  if (error) throw error;
  return data?.path || fileName;
}

async function addProduct() {
  const supabaseClient = requireSupabase();
  setMsg(saveMsg, "⏳ جاري الحفظ...");

  const title = (titleInput?.value || "").trim();
  const price = priceInput?.value ? Number(priceInput.value) : null;
  const currency = (currencyInput?.value || "USD").trim() || "USD";
  const featured = featuredSelect?.value === "true";
  const description = (descriptionInput?.value || "").trim() || null;

  if (!title) {
    setMsg(saveMsg, "❌ اكتب اسم المنتج.", "err");
    return;
  }

  try {
    // رفع صورة إن وجدت
    let image_path = null;
    if (imageInput?.files?.length) {
      image_path = await uploadImageIfAny();
    }

    const payload = {
      title,
      price,
      currency,
      featured,
      description,
      image_path,
    };

    const { error } = await supabaseClient.from("products").insert(payload);
    if (error) throw error;

    setMsg(saveMsg, "✅ تم حفظ المنتج.", "ok");

    // تفريغ الحقول
    titleInput.value = "";
    priceInput.value = "";
    descriptionInput.value = "";
    featuredSelect.value = "false";
    imageInput.value = "";

    await loadProducts();
  } catch (e) {
    setMsg(saveMsg, "❌ خطأ بالحفظ: " + (e?.message || e), "err");
  }
}

async function deleteProduct(id, image_path) {
  const supabaseClient = requireSupabase();
  if (!confirm("متأكد بدك تحذف المنتج؟")) return;

  try {
    // حذف الصورة إذا موجودة
    if (image_path) {
      await supabaseClient.storage.from("product-images").remove([image_path]);
    }
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;

    await loadProducts();
  } catch (e) {
    alert("❌ خطأ بالحذف: " + (e?.message || e));
  }
}

function renderProducts(items) {
  productsList.innerHTML = "";

  if (!items?.length) {
    productsList.innerHTML = `<div style="color:rgba(255,255,255,.65)">لا يوجد منتجات.</div>`;
    return;
  }

  for (const p of items) {
    const div = document.createElement("div");
    div.className = "item";

    const thumb = document.createElement("div");
    thumb.className = "thumb";

    if (p.image_path) {
      const img = document.createElement("img");
      img.src = makePublicImageUrl(p.image_path);
      img.alt = p.title || "product";
      thumb.appendChild(img);
    } else {
      thumb.textContent = "بدون صورة";
    }

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("strong");
    title.textContent = p.title || "";

    const price = document.createElement("small");
    const priceText = (p.price !== null && p.price !== undefined) ? `${p.currency || "USD"} ${p.price}` : "بدون سعر";
    price.textContent = priceText + (p.featured ? " ⭐ Featured" : "");

    const desc = document.createElement("small");
    desc.textContent = p.description ? p.description : "";

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "btn danger";
    delBtn.type = "button";
    delBtn.textContent = "حذف";
    delBtn.onclick = () => deleteProduct(p.id, p.image_path);

    actions.appendChild(delBtn);

    meta.appendChild(title);
    meta.appendChild(price);
    if (p.description) meta.appendChild(desc);
    meta.appendChild(actions);

    div.appendChild(thumb);
    div.appendChild(meta);

    productsList.appendChild(div);
  }
}

async function loadProducts() {
  const supabaseClient = requireSupabase();

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // هذا خطير: يعني RLS أو جدول أو صلاحيات
    setMsg(saveMsg, "❌ خطأ تحميل المنتجات: " + error.message, "err");
    productsList.innerHTML = "";
    return;
  }

  renderProducts(data || []);
}

function wireEvents() {
  loginBtn?.addEventListener("click", doLogin);
  logoutBtn?.addEventListener("click", doLogout);
  saveBtn?.addEventListener("click", addProduct);
  refreshBtn?.addEventListener("click", loadProducts);

  // Enter يعمل تسجيل دخول
  passInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

(async function init() {
  try {
    wireEvents();
    await showUIForSession();

    // إذا الجلسة تغيرت (تسجيل دخول/خروج) يحدث UI
    const supabaseClient = requireSupabase();
    supabaseClient.auth.onAuthStateChange(async () => {
      await showUIForSession();
    });
  } catch (e) {
    console.error(e);
  }
})();
