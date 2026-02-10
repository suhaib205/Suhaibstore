// ===============================
// Admin Panel Logic (FULL FILE)
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  );

  // ===============================
  // Elements
  // ===============================
  const loginForm = document.getElementById("loginForm");
  const adminPanel = document.getElementById("adminPanel");
  const errorBox = document.getElementById("errorBox");

  const productForm = document.getElementById("productForm");
  const productsList = document.getElementById("productsList");
  const refreshBtn = document.getElementById("refreshBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // ===============================
  // Auth State
  // ===============================
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      loginForm.style.display = "none";
      adminPanel.style.display = "block";
      loadProducts();
    } else {
      loginForm.style.display = "block";
      adminPanel.style.display = "none";
    }
  });

  // ===============================
  // Login
  // ===============================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorBox.textContent = error.message;
    }
  });

  // ===============================
  // Logout
  // ===============================
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  // ===============================
  // Add Product
  // ===============================
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";

    const title = document.getElementById("title").value.trim();
    const price = Number(document.getElementById("price").value);
    const currency = document.getElementById("currency").value.trim();
    const featured = document.getElementById("featured").value === "yes";
    const description = document.getElementById("description").value.trim();
    const imageFile = document.getElementById("image").files[0];

    if (!title || !price || !currency) {
      errorBox.textContent = "الرجاء تعبئة جميع الحقول المطلوبة";
      return;
    }

    let imagePath = null;

    // ===============================
    // Upload Image (optional)
    // ===============================
    if (imageFile) {
      const fileName = `${Date.now()}-${imageFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageFile);

      if (uploadError) {
        errorBox.textContent = uploadError.message;
        return;
      }

      imagePath = fileName;
    }

    // ===============================
    // Insert Product
    // ===============================
    const { error: insertError } = await supabase
      .from("products")
      .insert([
        {
          title: title,
          price: price,
          currency: currency,
          description: description || null,
          image_path: imagePath,
          featured: featured,
        },
      ]);

    if (insertError) {
      errorBox.textContent = insertError.message;
      return;
    }

    productForm.reset();
    loadProducts();
  });

  // ===============================
  // Load Products
  // ===============================
  async function loadProducts() {
    productsList.innerHTML = "جاري التحميل...";

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      productsList.innerHTML = error.message;
      return;
    }

    if (!data.length) {
      productsList.innerHTML = "لا يوجد منتجات";
      return;
    }

    productsList.innerHTML = "";

    data.forEach((product) => {
      const div = document.createElement("div");
      div.className = "product-item";
      div.innerHTML = `
        <strong>${product.title}</strong><br>
        ${product.price} ${product.currency}
      `;
      productsList.appendChild(div);
    });
  }

  refreshBtn.addEventListener("click", loadProducts);
});
