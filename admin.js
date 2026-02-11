const { url, anonKey } = window.SUPABASE_CONFIG;
const supabase = window.supabase.createClient(url, anonKey);

const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const logoutBtn = document.getElementById("logoutBtn");
const productsList = document.getElementById("productsList");
const refreshBtn = document.getElementById("refreshBtn");
const saveBtn = document.getElementById("saveBtn");

async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    loginSection.style.display = "none";
    adminSection.style.display = "block";
    loadProducts();
  } else {
    loginSection.style.display = "block";
    adminSection.style.display = "none";
  }
}

checkUser();

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    location.reload();
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  productsList.innerHTML = "";

  data.forEach(product => {
    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>${product.title_ar || "-"}</strong></p>
      <p>${product.price || "-"} ${product.currency || ""}</p>
      <hr>
    `;
    productsList.appendChild(div);
  });
}

refreshBtn?.addEventListener("click", loadProducts);

saveBtn?.addEventListener("click", async () => {
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const currency = document.getElementById("currency").value;

  const { error } = await supabase
    .from("products")
    .insert([
      {
        title_ar: title,
        title_en: title,
        price: price,
        currency: currency
      }
    ]);

  if (error) {
    alert(error.message);
  } else {
    alert("تم الحفظ ✅");
    loadProducts();
  }
});
