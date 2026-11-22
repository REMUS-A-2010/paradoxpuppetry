"use strict";

const googleButton = document.getElementById("customerGoogleSignIn");
const providerStatus = document.getElementById("providerStatus");
const serverStatus = document.getElementById("customerServerStatus");
const errorBox = document.getElementById("customerError");
const signedOutAccount = document.getElementById("signedOutAccount");
const signedInAccount = document.getElementById("signedInAccount");
const signOutButton = document.getElementById("customerSignOut");

document.getElementById("year").textContent = new Date().getFullYear();

const signInErrors = {
  "google-not-configured": "Google sign-in has not been configured on this local server.",
  "google-state": "Google sign-in expired or could not be verified. Please try again.",
  "google-cancelled": "Google sign-in was cancelled.",
  "google-failed": "Google sign-in could not be completed. Check the local server and try again."
};

const signInError = new URLSearchParams(window.location.search).get("signinError");
if (signInError && signInErrors[signInError]) {
  errorBox.textContent = signInErrors[signInError];
  errorBox.hidden = false;
}

googleButton.addEventListener("click", () => {
  if (!googleButton.disabled) window.location.assign("/auth/google/start");
});

async function loadProviders() {
  try {
    const response = await fetch("/api/customer/providers", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Could not check the sign-in providers.");
    const providers = await response.json();
    googleButton.disabled = !providers.google;
    providerStatus.textContent = providers.google
      ? `Google sign-in is available. ${providers.appleMessage}`
      : `Google sign-in needs local OAuth setup. ${providers.appleMessage}`;
  } catch {
    googleButton.disabled = true;
    providerStatus.textContent = "Optional sign-in providers are unavailable. Check that the local studio server is running.";
  }
}

async function loadCustomerSession() {
  try {
    const response = await fetch("/api/customer/session", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("The local server could not check your visitor session.");
    const session = await response.json();
    serverStatus.classList.add("online");
    serverStatus.querySelector("span:last-child").textContent = "LOCAL SERVER ONLINE · CUSTOMER ACCESS ONLY";
    if (session.authenticated) {
      document.getElementById("customerEmail").textContent = session.email;
      signedOutAccount.hidden = true;
      signedInAccount.hidden = false;
    }
  } catch (error) {
    serverStatus.classList.add("offline");
    serverStatus.querySelector("span:last-child").textContent = "SERVER OFFLINE · OPEN HTTP://127.0.0.1:8000";
    googleButton.disabled = true;
    providerStatus.textContent = error.message;
  }
}

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  errorBox.hidden = true;
  try {
    const response = await fetch("/api/customer/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not sign out.");
    window.location.replace("/account.html?signin=signed-out");
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    signOutButton.disabled = false;
  }
});

loadProviders();
loadCustomerSession();
