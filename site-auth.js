"use strict";

const visitorGate = document.getElementById("visitorGate");
const googleButton = document.getElementById("visitorGoogleSignIn");
const providerStatus = document.getElementById("visitorAuthStatus");
const continueButton = document.getElementById("visitorContinue");
const closeButton = document.getElementById("visitorGateClose");
const PROMPT_DEFERRED_KEY = "pp_visitor_signin_deferred_v1";

function wasDeferred() {
  try {
    return sessionStorage.getItem(PROMPT_DEFERRED_KEY) === "true";
  } catch (error) {
    console.error("Could not read the visitor sign-in preference:", error);
    return false;
  }
}

function rememberDeferred() {
  try {
    sessionStorage.setItem(PROMPT_DEFERRED_KEY, "true");
  } catch (error) {
    console.error("Could not save the visitor sign-in preference:", error);
  }
}

async function loadProviders() {
  if (window.location.protocol === "file:") return null;
  try {
    const response = await fetch("/api/customer/providers", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Could not check Google sign-in.");
    return await response.json();
  } catch (error) {
    console.error("Could not check visitor sign-in providers:", error);
    return null;
  }
}

async function hasCustomerSession() {
  if (window.location.protocol === "file:") return false;
  try {
    const response = await fetch("/api/customer/session", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Could not check the visitor session.");
    const session = await response.json();
    return session.authenticated === true;
  } catch (error) {
    console.error("Could not check the visitor session:", error);
    return false;
  }
}

function showAfterStudioIntro() {
  const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1600 : 2400;
  const show = () => {
    window.setTimeout(() => {
      if (!wasDeferred() && !visitorGate.open) visitorGate.showModal();
    }, delay);
  };
  if (document.readyState === "complete") show();
  else window.addEventListener("load", show, { once: true });
}

function continueAsGuest() {
  rememberDeferred();
  if (visitorGate.open) visitorGate.close();
}

googleButton.addEventListener("click", () => {
  if (!googleButton.disabled) window.location.assign("/auth/google/start");
});
continueButton.addEventListener("click", continueAsGuest);
closeButton.addEventListener("click", continueAsGuest);
visitorGate.addEventListener("cancel", rememberDeferred);
visitorGate.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    continueAsGuest();
  }
});

async function initializeVisitorSignIn() {
  const [providers, signedIn] = await Promise.all([
    loadProviders(),
    hasCustomerSession()
  ]);
  if (providers && providers.google === true) {
    googleButton.disabled = false;
    providerStatus.textContent = "Google sign-in is ready for verified visitor accounts.";
  } else if (providers) {
    googleButton.disabled = true;
    providerStatus.textContent = "Google sign-in needs local OAuth setup. You can continue as a guest and sign in later from Account.";
  } else if (window.location.protocol === "file:") {
    googleButton.disabled = true;
    providerStatus.textContent = "Sign-in requires the local studio server. Run py admin_server.py and open http://127.0.0.1:8000.";
  } else {
    googleButton.disabled = true;
    providerStatus.textContent = "The local sign-in service is unavailable. You can continue as a guest and try Account later.";
  }
  if (!signedIn && !wasDeferred()) showAfterStudioIntro();
}

initializeVisitorSignIn();
