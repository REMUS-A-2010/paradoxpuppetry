"use strict";

const numberFormat = new Intl.NumberFormat();
const refreshButton = document.getElementById("refreshStats");
const syncStatus = document.getElementById("syncStatus");
document.getElementById("year").textContent = new Date().getFullYear();

function setMetric(id, value) {
  document.getElementById(id).textContent = Number.isSafeInteger(value) && value >= 0
    ? numberFormat.format(value)
    : "—";
}

function setPlatform(platform, metrics) {
  const state = document.getElementById(`${platform}State`);
  const count = document.getElementById(`${platform}Count`);
  const growth = document.getElementById(`${platform}Growth`);
  const message = document.getElementById(`${platform}Message`);
  const link = document.getElementById(`${platform}Link`);
  const states = {
    live: "Live",
    not_configured: "Needs setup",
    not_connected: "Not connected",
    hidden: "Hidden",
    unavailable: "Unavailable"
  };
  state.dataset.state = metrics.status;
  state.querySelector("span:last-child").textContent = states[metrics.status] || "Unavailable";
  count.textContent = Number.isSafeInteger(metrics.count) && metrics.count >= 0
    ? numberFormat.format(metrics.count)
    : "—";
  growth.textContent = Number.isSafeInteger(metrics.growth)
    ? `${metrics.growth >= 0 ? "+" : ""}${numberFormat.format(metrics.growth)} ${metrics.growthLabel || "since previous snapshot"}`
    : (metrics.growthLabel || "Growth baseline pending");
  message.textContent = metrics.message || "No live metric is available.";
  if (typeof metrics.url === "string" && /^https:\/\/[^\s"'<>]+$/i.test(metrics.url)) {
    link.href = metrics.url;
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  }
}

function renderVisitChart(history) {
  const chart = document.getElementById("visitChart");
  chart.replaceChildren();
  const values = Array.isArray(history) ? history : [];
  const max = Math.max(1, ...values.map((entry) => Number(entry.pageViews) || 0));
  values.forEach((entry) => {
    const views = Number.isSafeInteger(entry.pageViews) ? Math.max(0, entry.pageViews) : 0;
    const day = document.createElement("div");
    day.className = "chart-day";
    day.title = `${entry.date}: ${numberFormat.format(views)} page views`;
    const bar = document.createElement("span");
    bar.className = "chart-bar";
    bar.style.height = `${Math.max(3, (views / max) * 100)}%`;
    bar.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = String(entry.date || "").slice(5);
    day.append(bar, label);
    chart.append(day);
  });
  const total = values.reduce((sum, entry) => sum + (Number(entry.pageViews) || 0), 0);
  document.getElementById("chartTotal").textContent = `${numberFormat.format(total)} views`;
}

async function loadCommunityStats() {
  refreshButton.disabled = true;
  if (window.location.protocol === "file:") {
    syncStatus.textContent = "Live community metrics require the local server. Run py admin_server.py and open http://127.0.0.1:8000.";
    refreshButton.disabled = false;
    return;
  }
  syncStatus.textContent = "Refreshing community counts…";
  try {
    if (window.ppVisitTracked) await window.ppVisitTracked;
    const response = await fetch("/api/community/stats", {
      credentials: "same-origin",
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Community counts could not be loaded.");
    const local = result.local;
    if (!local || !result.social) throw new Error("The local server returned incomplete community metrics.");
    setMetric("pageViewsToday", local.pageViewsToday);
    setMetric("uniqueVisitorsToday", local.uniqueVisitorsToday);
    setMetric("uniqueVisitors30Days", local.uniqueVisitors30Days);
    setMetric("pageViewsAllTime", local.pageViewsAllTime);
    setMetric("activeWebsiteMembers", local.activeWebsiteMembers);
    renderVisitChart(local.history);
    ["youtube", "discord", "instagram"].forEach((platform) => {
      const metrics = result.social[platform];
      if (metrics && typeof metrics === "object") setPlatform(platform, metrics);
    });
    const checkedAt = result.social.checkedAt ? new Date(result.social.checkedAt) : null;
    syncStatus.textContent = checkedAt && !Number.isNaN(checkedAt.getTime())
      ? `Local analytics updated · ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(checkedAt)} UTC`
      : "Counts updated from available local and public sources.";
  } catch (error) {
    console.error("Could not load Community & Growth metrics:", error);
    syncStatus.textContent = error.message || "The local metrics service is unavailable.";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadCommunityStats);
loadCommunityStats();
if (window.location.protocol !== "file:") window.setInterval(loadCommunityStats, 60_000);
