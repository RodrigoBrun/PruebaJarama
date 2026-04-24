import { isSupabaseConfigured } from "./supabase-config.js";
import { getCurrentAdminSession, signInAdmin } from "./auth.js";

const form = document.getElementById("adminLoginForm");
const feedback = document.getElementById("loginFeedback");
const configNotice = document.getElementById("configNotice");
const loginBtn = document.getElementById("adminLoginBtn");

function showMessage(message, type = "error") {
  if (!feedback) return;
  feedback.hidden = false;
  feedback.textContent = message;
  feedback.classList.toggle("admin-auth-alert--error", type === "error");
  feedback.classList.toggle("admin-auth-alert--info", type === "info");
}

function clearMessage() {
  if (!feedback) return;
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.classList.add("admin-auth-alert--error");
  feedback.classList.remove("admin-auth-alert--info");
}

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    configNotice.hidden = false;
    loginBtn.disabled = true;
    return;
  }

  const { user, profile } = await getCurrentAdminSession();
  if (user && profile) {
    window.location.href = "index.html";
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (!isSupabaseConfigured()) {
    showMessage("Primero configurá Supabase en js/admin/supabase-config.js", "info");
    return;
  }

  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    showMessage("Completá correo y contraseña para ingresar.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Ingresando...";

  const { error } = await signInAdmin(email, password);

  if (error) {
    showMessage(error.message || "No se pudo iniciar sesión.");
    loginBtn.disabled = false;
    loginBtn.textContent = "Ingresar al panel";
    return;
  }

  window.location.href = "index.html";
});

bootstrap();
