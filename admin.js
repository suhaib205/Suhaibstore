const { createClient } = supabase;

const supabaseClient = createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    loginMessage.textContent = "جاري تسجيل الدخول...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginMessage.textContent = "خطأ: " + error.message;
    } else {
      window.location.reload();
    }
  });
}
