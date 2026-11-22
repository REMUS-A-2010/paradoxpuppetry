"use strict";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");
const passwordInput = document.getElementById("password");
const toggleButton = document.getElementById("togglePassword");
const usernameInput = document.getElementById("username");
const roleNote = document.getElementById("loginRoleNote");
const serverStatus = document.getElementById("serverStatus");
let activeLoginAction = "ENTER ADMIN WORKSPACE";

document.getElementById("year").textContent = new Date().getFullYear();

document.querySelectorAll("[data-login-user]").forEach((button) => {
  button.addEventListener("click", () => {
    const isOwner = button.dataset.loginUser === "Owner";
    usernameInput.value = button.dataset.loginUser;
    activeLoginAction = isOwner ? "ENTER OWNER PANEL" : "ENTER ADMIN WORKSPACE";
    loginButton.querySelector("span").textContent = activeLoginAction;
    document.querySelectorAll("[data-login-user]").forEach((mode) => {
      const active = mode === button;
      mode.classList.toggle("is-active", active);
      mode.setAttribute("aria-pressed", String(active));
    });
    roleNote.textContent = isOwner
      ? "Owner access opens the complete dashboard, including website content and local demo settings."
      : "Admin access is limited to everyday studio content and applications.";
  });
});

toggleButton.addEventListener("click", () => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  toggleButton.textContent = reveal ? "HIDE" : "SHOW";
  toggleButton.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  toggleButton.setAttribute("aria-pressed", String(reveal));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (window.location.protocol === "file:") {
    errorBox.textContent = "This file preview cannot sign in. Use the local server link below.";
    errorBox.hidden = false;
    return;
  }
  errorBox.hidden = true;
  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "CHECKING ACCESS…";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        username: form.elements.username.value.trim(),
        password: passwordInput.value
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("The local demo server is not running. Start it with: py admin_server.py");
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to sign in.");
    window.location.assign(result.redirect);
  } catch (error) {
    errorBox.textContent = error instanceof TypeError
      ? "The local demo server is not running. Start it with: py admin_server.py"
      : error.message;
    errorBox.hidden = false;
    passwordInput.focus();
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector("span").textContent = activeLoginAction;
  }
});

function showServerOffline() {
  serverStatus.classList.add("offline");
  const statusText = serverStatus.querySelector("span:last-child");
  if (window.location.protocol === "file:") {
    statusText.textContent = "FILE PREVIEW · ";
    const link = document.createElement("a");
    link.href = "http://127.0.0.1:8000/admin/login.html";
    link.textContent = "OPEN LOCAL SERVER SIGN-IN ↗";
    statusText.append(link);
    return;
  }
  statusText.textContent = "SERVER OFFLINE · OPEN HTTP://127.0.0.1:8000";
}

if (window.location.protocol === "file:") {
  showServerOffline();
} else {
  fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
    .then((response) => {
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("The local authentication server is unavailable.");
      }
      return response.json();
    })
    .then((result) => {
      serverStatus.classList.add("online");
      serverStatus.querySelector("span:last-child").textContent = "LOCAL SERVER ONLINE · SERVER-VALIDATED SIGN-IN";
      if (result.authenticated) {
        window.location.replace(result.role === "owner" ? "/admin/owner.html" : "/admin/dashboard.html");
      }
    })
    .catch(showServerOffline);
}
