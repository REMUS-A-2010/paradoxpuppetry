"use strict";

window.ppVisitTracked = (async () => {
  if (window.location.protocol === "file:") return false;
  let visitorId;
  try {
    visitorId = localStorage.getItem("pp_community_visitor_id");
    if (!visitorId) {
      visitorId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("pp_community_visitor_id", visitorId);
    }
  } catch (error) {
    console.error("Could not prepare anonymous local visit analytics:", error);
    return false;
  }

  try {
    const response = await fetch("/api/community/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ visitorId })
    });
    if (!response.ok) throw new Error("The local server could not record this visit.");
    return true;
  } catch (error) {
    console.error("Could not record this local website visit:", error);
    return false;
  }
})();
