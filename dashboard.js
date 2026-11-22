"use strict";

const STORAGE_KEYS = {
  products: "pp_products_v2",
  categories: "pp_categories",
  productions: "pp_productions_v1",
  episodes: "pp_episodes_v1",
  characters: "pp_characters_v1",
  announcements: "pp_announcements_v1",
  leaks: "pp_leaks_v1",
  team: "pp_team_v1",
  applications: "pp_applications_v1",
  contacts: "pp_contacts_v1",
  orders: "pp_orders_v1",
  content: "pp_content_v1",
  media: "pp_media_v1",
  settings: "pp_settings_v1"
};
const FEATURE_SETTINGS_KEY = "pp_site_features_v1";
const ADMIN_SECTIONS = new Set([
  "overview", "products", "productions", "episodes", "characters",
  "announcements", "leaks", "team", "applications"
]);

const DEFAULT_DATA = {
  products: [
    { id: 1, name: "The Forgotten Chapter", category: "Digital", price: 499, stock: 10, availability: "In stock", emoji: "📕", label: "NEW", description: "An original digital story from the Paradox universe.", art: "linear-gradient(145deg,#491017,#14090b)" },
    { id: 2, name: "Crimson Oversized Tee", category: "Clothing", price: 899, stock: 10, availability: "In stock", emoji: "✦", label: "POPULAR", description: "A graphic streetwear concept inspired by the Paradox identity.", art: "linear-gradient(145deg,#292929,#101010)" },
    { id: 3, name: "Shadow Collector", category: "Collectibles", price: 1499, stock: 10, availability: "In stock", emoji: "◇", label: "EXCLUSIVE", description: "A collectible concept from our original creative universe.", art: "linear-gradient(145deg,#29202b,#110d14)" },
    { id: 4, name: "Paradox Keychain", category: "Accessories", price: 249, stock: 10, availability: "In stock", emoji: "⌘", label: "", description: "A small accessory inspired by the signature Paradox identity.", art: "linear-gradient(145deg,#4a351a,#15100a)" },
    { id: 5, name: "The Last Signal", category: "Digital", price: 599, stock: 10, availability: "In stock", emoji: "◈", label: "NEW", description: "A mysterious original digital story. A new chapter in the universe.", art: "linear-gradient(145deg,#122b3b,#090d12)" },
    { id: 6, name: "Dark Universe Hoodie", category: "Clothing", price: 1799, stock: 10, availability: "In stock", emoji: "✧", label: "FEATURED", description: "A premium-inspired hoodie concept from the apparel collection.", art: "linear-gradient(145deg,#301016,#10090a)" },
    { id: 7, name: "Mystery Box", category: "Collectibles", price: 999, stock: 10, availability: "In stock", emoji: "▣", label: "LIMITED", description: "A surprise collection of Paradox-inspired merchandise.", art: "linear-gradient(145deg,#4a151b,#15090a)" },
    { id: 8, name: "Crimson Art Print", category: "Posters", price: 399, stock: 10, availability: "In stock", emoji: "▧", label: "", description: "An artistic print concept for your collection.", art: "linear-gradient(145deg,#302020,#100c0c)" }
  ],
  categories: [
    { id: "cat-digital", name: "Digital", description: "Downloadable stories and digital creations." },
    { id: "cat-clothing", name: "Clothing", description: "Wearable pieces from the studio." },
    { id: "cat-collectibles", name: "Collectibles", description: "Objects from our creative worlds." },
    { id: "cat-accessories", name: "Accessories", description: "Small details from the Paradox universe." },
    { id: "cat-posters", name: "Posters", description: "Art prints and studio posters." }
  ],
  productions: [
    { id: "prod-last-bell", title: "After the Last Bell", status: "In development", genre: "Mystery · Drama · Animation", release: "Coming soon", description: "An original animated mystery about friendship, secrets and the moments that change everything.", cover: "" }
  ],
  episodes: [
    { id: "episode-1", production: "After the Last Bell", number: "01", title: "The Quiet Hall", status: "In development", description: "The school is empty, the lights are off, and one classroom door is still open." },
    { id: "episode-2", production: "After the Last Bell", number: "02", title: "A Note in the Desk", status: "Planned", description: "A folded note reveals a clue no one remembers leaving behind." }
  ],
  characters: [
    { id: "character-1", production: "After the Last Bell", name: "The New Student", role: "Student", description: "An observant newcomer who notices the details everyone else overlooks." },
    { id: "character-2", production: "After the Last Bell", name: "The Night Caretaker", role: "Caretaker", description: "A quiet presence with a long memory of the school after hours." }
  ],
  announcements: [
    { id: "announce-1", title: "After the Last Bell enters development", date: "Coming soon", content: "Our first original animated series is taking shape. Follow along as the story and its characters come to life." },
    { id: "announce-2", title: "A note from the studio", date: "Studio update", content: "We are building a creative home for independent storytellers, animators and artists who love making something a little different." },
    { id: "announce-3", title: "The doors are open", date: "Open call", content: "We are always happy to hear from creative people. Share your portfolio and tell us what you would love to create." }
  ],
  leaks: [
    { id: "leak-preview-1", title: "A quiet hallway after hours", production: "After the Last Bell", type: "Storyboard peek", date: "Studio preview", label: "WORK IN PROGRESS", content: "An early storyboard moment from the halls after the last bell. Lighting, framing and details are still being explored.", spoiler: "No spoilers", status: "Published", image: "/media/last-bell-hall.svg", alt: "Crimson-lit empty school hallway concept art", previewUrl: "" },
    { id: "leak-preview-2", title: "Something in the shadows", production: "After the Last Bell", type: "Visual development", date: "Early concept", label: "CONCEPT ART", content: "A first mood exploration for the series. Shapes, palette and character designs may change as production develops.", spoiler: "No spoilers", status: "Published", image: "/media/shadow-character.svg", alt: "Character silhouette study in a dark hallway", previewUrl: "" }
  ],
  team: [
    { id: "team-1", name: "Studio Founder", role: "Creative Direction", bio: "Guiding the studio's stories and creative vision." },
    { id: "team-2", name: "Story Department", role: "Writing & Story", bio: "Finding the heart of every world and character." },
    { id: "team-3", name: "Visual Development", role: "Art & Design", bio: "Building the look, mood and shape of each production." },
    { id: "team-4", name: "Sound Department", role: "Music & Sound", bio: "Creating atmosphere for every scene and story." }
  ],
  applications: [],
  contacts: [],
  orders: [
    { id: "order-demo-1", name: "Demo customer", items: "Crimson Oversized Tee × 1", total: "₹899", status: "Demo only", date: "Sample record" },
    { id: "order-demo-2", name: "Demo customer", items: "Crimson Art Print × 2", total: "₹798", status: "Demo only", date: "Sample record" }
  ],
  content: [
    { id: "content-hero", key: "heroHeadline", value: "BEYOND THE FRAME. BEYOND IMAGINATION." },
    { id: "content-copy", key: "heroCopy", value: "We build cinematic animated worlds, unforgettable characters, and stories that stay with you long after the final frame." },
    { id: "content-studio", key: "studioStory", value: "Paradox Puppetry is an independent animation studio creating original stories with heart, atmosphere, and unexpected turns. We bring artists, storytellers, and curious minds together to build worlds worth getting lost in." },
    { id: "content-about", key: "aboutStory", value: "We are an independent animation studio creating original worlds through animation, character design, and storytelling. We want every project to feel imaginative, human, and worth remembering." }
  ],
  media: [],
  settings: [
    { id: "setting-brand", label: "Studio name", value: "PARADOX PUPPETRY" },
    { id: "setting-slogan", label: "Studio slogan", value: "BEYOND THE FRAME. BEYOND IMAGINATION." },
    { id: "setting-currency", label: "Shop display currency", value: "INR" },
    { id: "setting-email", label: "Public studio email", value: "paradoxpuppetrybusiness@gmail.com" }
  ]
};

const SCHEMAS = {
  products: {
    title: "Products", singular: "product", description: "Edit the sample shop catalogue. These products are demo listings only.", key: STORAGE_KEYS.products, filterField: "category", filterLabel: "All categories",
    fields: [
      { name: "name", label: "Product name", required: true },
      { name: "category", label: "Category", required: true, optionsFrom: "categories" },
      { name: "price", label: "Price (INR)", type: "number", min: 0, required: true },
      { name: "stock", label: "Stock quantity", type: "number", min: 0, required: true, hint: "Set to 0 to mark the product out of stock." },
      { name: "availability", label: "Availability", type: "select", options: ["In stock", "Out of stock"], default: "In stock", required: true, hint: "Out of stock prevents customers from adding this product to their bag." },
      { name: "emoji", label: "Card symbol", hint: "A simple symbol appears when no product image is uploaded." },
      { name: "label", label: "Product badge", hint: "Optional label such as NEW or LIMITED." },
      { name: "description", label: "Description", type: "textarea", full: true, required: true },
      { name: "image", label: "Product image", type: "image", full: true, hint: "Optional. HTTPS image URL or upload an image up to 1 MB." }
    ],
    columns: [{ label: "PRODUCT", primary: "name", secondary: "description" }, { label: "CATEGORY", key: "category" }, { label: "PRICE", key: "price", format: "price" }, { label: "STOCK", key: "stock", format: "stock" }, { label: "BADGE", key: "label" }]
  },
  categories: {
    title: "Categories", singular: "category", description: "Manage the category filters shown in the public shop.", key: STORAGE_KEYS.categories,
    fields: [{ name: "name", label: "Category name", required: true }, { name: "description", label: "Description", type: "textarea", full: true }],
    columns: [{ label: "CATEGORY", primary: "name", secondary: "description" }]
  },
  productions: {
    title: "Productions", singular: "production", description: "Manage series, films and their public release details.", key: STORAGE_KEYS.productions, filterField: "status",
    fields: [{ name: "title", label: "Production title", required: true }, { name: "status", label: "Status", type: "select", options: ["In development", "Production", "Coming soon", "Released", "On hold"] }, { name: "genre", label: "Genre / format" }, { name: "release", label: "Release information" }, { name: "description", label: "Synopsis", type: "textarea", full: true }, { name: "cover", label: "Cover image", type: "image", full: true, hint: "Optional. HTTPS image URL or upload an image up to 1 MB." }],
    columns: [{ label: "PRODUCTION", primary: "title", secondary: "genre" }, { label: "STATUS", key: "status", format: "status" }, { label: "RELEASE", key: "release" }]
  },
  episodes: {
    title: "Episodes", singular: "episode", description: "Organize episode titles, synopses and production status.", key: STORAGE_KEYS.episodes, filterField: "status",
    fields: [{ name: "production", label: "Production", required: true }, { name: "number", label: "Episode number" }, { name: "title", label: "Episode title", required: true }, { name: "status", label: "Status", type: "select", options: ["Planned", "In development", "In production", "Complete", "Released"] }, { name: "description", label: "Synopsis", type: "textarea", full: true }],
    columns: [{ label: "EPISODE", primary: "title", secondary: "production" }, { label: "NUMBER", key: "number" }, { label: "STATUS", key: "status", format: "status" }]
  },
  characters: {
    title: "Characters", singular: "character", description: "Manage character profiles for studio productions.", key: STORAGE_KEYS.characters,
    fields: [{ name: "production", label: "Production", required: true }, { name: "name", label: "Character name", required: true }, { name: "role", label: "Role" }, { name: "description", label: "Character notes", type: "textarea", full: true }],
    columns: [{ label: "CHARACTER", primary: "name", secondary: "production" }, { label: "ROLE", key: "role" }, { label: "PROFILE", key: "description" }]
  },
  announcements: {
    title: "Announcements", singular: "announcement", description: "Publish or update studio notes displayed on the public homepage.", key: STORAGE_KEYS.announcements,
    fields: [{ name: "title", label: "Headline", required: true }, { name: "date", label: "Date / label", required: true }, { name: "content", label: "Announcement text", type: "textarea", full: true, required: true }],
    columns: [{ label: "ANNOUNCEMENT", primary: "title", secondary: "content" }, { label: "DATE / LABEL", key: "date" }]
  },
  leaks: {
    title: "Studio leaks & previews", singular: "studio preview", description: "Share studio-approved work-in-progress art, storyboards, notes and preview links. Drafts stay off the public page.", key: STORAGE_KEYS.leaks, filterField: "status",
    fields: [
      { name: "title", label: "Preview title", required: true },
      { name: "production", label: "Related production", required: true },
      { name: "type", label: "Preview type", type: "select", options: ["Concept art", "Storyboard", "Animation test", "Character peek", "Behind the scenes", "Other preview"] },
      { name: "date", label: "Date / label", required: true },
      { name: "label", label: "Gallery badge", hint: "For example: WORK IN PROGRESS, FIRST LOOK, or CONCEPT ART." },
      { name: "content", label: "Preview notes", type: "textarea", full: true, required: true },
      { name: "image", label: "Preview image", type: "image", full: true, hint: "Optional. HTTPS image URL or upload PNG/JPEG/GIF/WebP up to 1 MB." },
      { name: "alt", label: "Image alt text", full: true },
      { name: "previewUrl", label: "Optional video / preview link", type: "url", full: true, hint: "HTTPS links only. The public page opens this link in a new tab." },
      { name: "spoiler", label: "Spoiler notice", type: "select", options: ["No spoilers", "Contains spoilers"] },
      { name: "status", label: "Visibility", type: "select", options: ["Draft", "Published"] }
    ],
    columns: [{ label: "PREVIEW", primary: "title", secondary: "production" }, { label: "TYPE", key: "type" }, { label: "VISIBILITY", key: "status", format: "status" }, { label: "DATE / LABEL", key: "date" }]
  },
  team: {
    title: "Team members", singular: "team member", description: "Edit the creative team profiles shown on the studio page.", key: STORAGE_KEYS.team,
    fields: [{ name: "name", label: "Name / department", required: true }, { name: "role", label: "Role", required: true }, { name: "bio", label: "Short introduction", type: "textarea", full: true }],
    columns: [{ label: "TEAM MEMBER", primary: "name", secondary: "bio" }, { label: "ROLE", key: "role" }]
  },
  applications: {
    title: "Recruitment applications", singular: "application", description: "Applications from this browser are demo records. Do not collect real personal data here.", key: STORAGE_KEYS.applications, filterField: "status",
    fields: [{ name: "name", label: "Applicant name", required: true }, { name: "email", label: "Email", type: "email", required: true }, { name: "position", label: "Creative position", required: true }, { name: "portfolio", label: "Portfolio URL", type: "url" }, { name: "skills", label: "Skills", type: "textarea", full: true }, { name: "experience", label: "Experience" }, { name: "availability", label: "Availability" }, { name: "introduction", label: "Introduction", type: "textarea", full: true }, { name: "status", label: "Review status", type: "select", options: ["New", "Reviewing", "Shortlisted", "Closed"] }],
    columns: [{ label: "APPLICANT", primary: "name", secondary: "email" }, { label: "POSITION", key: "position" }, { label: "STATUS", key: "status", format: "status" }, { label: "RECEIVED", key: "date" }]
  },
  contacts: {
    title: "Contact submissions", singular: "contact submission", description: "Local contact form messages only. This inbox is not connected to email.", key: STORAGE_KEYS.contacts, filterField: "status",
    fields: [{ name: "name", label: "Name", required: true }, { name: "email", label: "Email", type: "email", required: true }, { name: "subject", label: "Subject", required: true }, { name: "message", label: "Message", type: "textarea", full: true }, { name: "status", label: "Status", type: "select", options: ["New", "Read", "Replied", "Closed"] }],
    columns: [{ label: "SENDER", primary: "name", secondary: "email" }, { label: "SUBJECT", key: "subject" }, { label: "STATUS", key: "status", format: "status" }, { label: "RECEIVED", key: "date" }]
  },
  orders: {
    title: "Demo orders", singular: "demo order", description: "Fictional order examples for layout testing. No checkout or payment provider is connected.", key: STORAGE_KEYS.orders, filterField: "status",
    fields: [{ name: "name", label: "Demo customer name", required: true }, { name: "items", label: "Demo items", type: "textarea", full: true }, { name: "total", label: "Demo total" }, { name: "status", label: "Order status", type: "select", options: ["Demo only", "Sample complete", "Sample cancelled"] }, { name: "date", label: "Sample date" }],
    columns: [{ label: "DEMO ORDER", primary: "name", secondary: "items" }, { label: "TOTAL", key: "total" }, { label: "STATUS", key: "status", format: "status" }, { label: "DATE", key: "date" }]
  },
  content: {
    title: "Website content", singular: "content item", description: "Edit text shown on the public homepage. Changes appear the next time it loads.", key: STORAGE_KEYS.content,
    fields: [{ name: "key", label: "Homepage content key", type: "select", options: ["heroHeadline", "heroCopy", "studioStory", "aboutStory"], required: true, hint: "Choose the page area this text updates." }, { name: "value", label: "Text content", type: "textarea", full: true, required: true }],
    columns: [{ label: "PAGE AREA", primary: "key" }, { label: "CONTENT", key: "value" }]
  },
  media: {
    title: "Media library", singular: "media asset", description: "Upload local image assets for the demo. Images are stored in browser storage.", key: STORAGE_KEYS.media,
    fields: [{ name: "title", label: "Asset title", required: true }, { name: "alt", label: "Alt text" }, { name: "image", label: "Image file", type: "image", full: true, required: true, hint: "Upload PNG, JPEG, GIF or WebP up to 1 MB, or enter an HTTPS image URL." }],
    columns: [{ label: "ASSET", primary: "title", secondary: "alt", format: "image" }]
  },
  settings: {
    title: "Admin settings", singular: "setting", description: "Local demo settings are stored in this browser and do not configure a live service.", key: STORAGE_KEYS.settings,
    fields: [{ name: "label", label: "Setting name", required: true }, { name: "value", label: "Setting value", required: true }],
    columns: [{ label: "SETTING", primary: "label" }, { label: "VALUE", key: "value" }]
  }
};

let activeSection = "overview";
let currentRole = "admin";
let editingId = null;
let toastTimer;
const sidebar = document.getElementById("sidebar");
const sidebarScrim = document.getElementById("sidebarScrim");
const recordModal = document.getElementById("recordModal");
const recordForm = document.getElementById("recordForm");
const recordFields = document.getElementById("recordFields");
const tableSearch = document.getElementById("tableSearch");
const tableFilter = document.getElementById("tableFilter");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function getProductStock(product) {
  if (product?.stock === undefined) return 10;
  const stock = Number(product.stock);
  return Number.isSafeInteger(stock) && stock >= 0 ? stock : 0;
}

function getProductAvailability(product) {
  return String(product?.availability || "").toLowerCase() === "out of stock" || getProductStock(product) === 0
    ? "Out of stock"
    : "In stock";
}

function readRecords(section) {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEYS[section]) || "null");
    if (!Array.isArray(value)) return [];
    return section === "products"
      ? value.map((product) => ({
        ...product,
        stock: getProductStock(product),
        availability: getProductAvailability(product)
      }))
      : value;
  } catch (error) {
    console.error(`Could not read ${section} demo records:`, error);
    notify(`Could not read ${section}. Check this browser's saved demo data.`);
    return [];
  }
}

function writeRecords(section, records) {
  try {
    localStorage.setItem(STORAGE_KEYS[section], JSON.stringify(records));
    return true;
  } catch (error) {
    console.error(`Could not save ${section} demo records:`, error);
    notify("Could not save changes. This browser may be out of storage space.");
    return false;
  }
}

function seedDemoData() {
  try {
    Object.entries(DEFAULT_DATA).forEach(([section, records]) => {
      if (localStorage.getItem(STORAGE_KEYS[section]) === null) {
        writeRecords(section, records);
      }
    });
    const settings = readRecords("settings");
    const legacyEmail = settings.find((setting) => setting.label === "Public studio email" && setting.value === "hello@paradoxpuppetry.com");
    if (legacyEmail) {
      legacyEmail.value = "paradoxpuppetrybusiness@gmail.com";
      writeRecords("settings", settings);
    }
  } catch (error) {
    console.error("Could not initialize local demo storage:", error);
    notify("Browser storage is unavailable. Admin demo changes cannot be saved.");
  }
}

function notify(message) {
  const toast = document.getElementById("dashboardToast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function canAccessSection(section) {
  return currentRole === "owner" || ADMIN_SECTIONS.has(section);
}

async function adminAccessRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error("The local server returned an invalid response.");
  }
  if (!response.ok) throw new Error(result.error || "Could not update admin access.");
  return result;
}

async function loadAdminAccounts() {
  const list = document.getElementById("adminAccountsList");
  list.textContent = "Loading approved accounts…";
  try {
    const result = await adminAccessRequest("/api/admin/accounts");
    if (!Array.isArray(result.accounts)) throw new Error("The local server returned an invalid account list.");
    list.innerHTML = result.accounts.length
      ? `<div class="admin-account-header"><span>USERNAME</span><span>GRANTED</span><span>ACTION</span></div>${result.accounts.map((account) => (
        `<div class="admin-account-row"><strong>${escapeHTML(account.username)}</strong><span>${escapeHTML(account.createdAt || "—")}</span><button class="row-action delete" type="button" data-revoke-admin="${escapeHTML(account.username)}">REVOKE</button></div>`
      )).join("")}`
      : '<p class="admin-account-empty">No admins are approved. Grant access to someone you trust.</p>';
    return true;
  } catch (error) {
    list.textContent = error.message;
    return false;
  }
}

async function grantAdminAccess(event) {
  event.preventDefault();
  const form = document.getElementById("adminAccessForm");
  const errorBox = document.getElementById("adminAccessError");
  const button = document.getElementById("grantAdminButton");
  errorBox.hidden = true;
  button.disabled = true;
  try {
    const formData = new FormData(form);
    await adminAccessRequest("/api/admin/accounts", {
      method: "POST",
      body: JSON.stringify({
        username: String(formData.get("username") || "").trim(),
        password: String(formData.get("password") || "")
      })
    });
    form.reset();
    const refreshed = await loadAdminAccounts();
    notify(refreshed
      ? "Admin access granted. The new account can now sign in."
      : "Admin access was granted, but the list could not refresh. Use Refresh to try again.");
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
    notify(error.message);
  } finally {
    button.disabled = false;
  }
}

async function revokeAdminAccess(event) {
  const button = event.target.closest("[data-revoke-admin]");
  if (!button) return;
  const username = button.dataset.revokeAdmin;
  if (!window.confirm(`Revoke admin access for "${username}"? Their active local sessions will end immediately.`)) return;
  button.disabled = true;
  try {
    await adminAccessRequest("/api/admin/accounts", {
      method: "DELETE",
      body: JSON.stringify({ username })
    });
    const refreshed = await loadAdminAccounts();
    notify(refreshed
      ? `Admin access revoked for ${username}.`
      : `Admin access revoked for ${username}, but the list could not refresh. Use Refresh to try again.`);
  } catch (error) {
    button.disabled = false;
    notify(error.message);
  }
}

function applyRoleAccess(role) {
  currentRole = role;
  const isOwner = role === "owner";
  document.body.dataset.access = "ready";
  document.getElementById("dashboardRoleLabel").textContent = isOwner ? "OWNER PANEL" : "ADMIN DASHBOARD";
  document.getElementById("dashboardKicker").textContent = isOwner
    ? "PARADOX PUPPETRY / OWNER"
    : "PARADOX PUPPETRY / ADMIN";
  const roleBadge = document.getElementById("roleBadge");
  roleBadge.textContent = isOwner ? "OWNER · FULL ACCESS" : "ADMIN · LIMITED ACCESS";
  roleBadge.hidden = false;
  document.getElementById("accountAvatar").textContent = isOwner ? "O" : "A";
  document.getElementById("accountAvatar").setAttribute("aria-label", isOwner ? "Owner account" : "Admin account");
  document.getElementById("welcomeRole").textContent = isOwner ? "Owner." : "Admin.";
  document.getElementById("welcomeCopy").textContent = isOwner
    ? "Your owner workspace includes full access to the local demo dashboard."
    : "Your admin workspace includes the everyday studio content and application tools.";
  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.hidden = !canAccessSection(item.dataset.section);
  });
  document.querySelectorAll("[data-goto]").forEach((button) => {
    button.hidden = !canAccessSection(button.dataset.goto);
  });
}

function setSection(section) {
  const adminAccess = section === "admin-access";
  if (section !== "overview" && !SCHEMAS[section] && !adminAccess) return;
  if (!canAccessSection(section)) {
    notify("That section is only available in the owner panel.");
    return;
  }
  activeSection = section;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.remove("active"));
  const overview = section === "overview";
  const featureControls = document.getElementById("featureControls");
  featureControls.hidden = section !== "settings" && section !== "leaks";
  if (!featureControls.hidden) renderFeatureSettings(section);
  document.getElementById(
    overview ? "view-overview" : adminAccess ? "view-admin-access" : "view-management"
  ).classList.add("active");
  document.getElementById("pageTitle").textContent = overview
    ? (currentRole === "owner" ? "Owner Panel" : "Admin Dashboard")
    : adminAccess ? "Admin access" : SCHEMAS[section].title;
  if (adminAccess) {
    loadAdminAccounts().then((loaded) => {
      if (!loaded) notify(document.getElementById("adminAccountsList").textContent);
    });
  }
  if (!overview && !adminAccess) {
    const schema = SCHEMAS[section];
    document.getElementById("listTitle").textContent = schema.title;
    document.getElementById("listDescription").textContent = schema.description;
    document.getElementById("listEyebrow").textContent = `STUDIO CONTENT / ${schema.title.toUpperCase()}`;
    document.getElementById("addRecordButton").innerHTML = `<span>＋</span> ADD ${escapeHTML(schema.singular.toUpperCase())}`;
    tableSearch.value = "";
    renderTable();
  }
  if (overview) renderOverview();
  closeSidebar();
}

function getFeatureSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(FEATURE_SETTINGS_KEY) || "null");
    return {
      leaksEnabled: settings?.leaksEnabled === true,
      recruitmentEnabled: settings?.recruitmentEnabled === true
    };
  } catch (error) {
    console.error("Could not read website feature settings:", error);
    notify("Could not read feature visibility settings from this browser.");
    return { leaksEnabled: false, recruitmentEnabled: false };
  }
}

function renderFeatureSettings(section = activeSection) {
  const settings = getFeatureSettings();
  const isSettings = section === "settings";
  document.getElementById("featureControlTitle").textContent = isSettings ? "OPTIONAL SECTIONS" : "STUDIO LEAKS";
  document.getElementById("featureControlDescription").textContent = isSettings
    ? "Choose which optional sections appear on the public site. Hidden sections keep their saved content in this local demo."
    : "Choose whether Studio Leaks appear on the public site. Hiding the section keeps its saved leak records in this local demo.";
  document.getElementById("recruitmentVisibilityControl").hidden = currentRole !== "owner" || !isSettings;
  document.getElementById("leaksVisibilityToggle").checked = settings.leaksEnabled;
  document.getElementById("leaksVisibilityLabel").textContent = settings.leaksEnabled ? "Visible on public site" : "Hidden from public site";
  document.getElementById("recruitmentVisibilityToggle").checked = settings.recruitmentEnabled;
  document.getElementById("recruitmentVisibilityLabel").textContent = settings.recruitmentEnabled ? "Visible on public site" : "Hidden from public site";
}

function saveFeatureSettings(event) {
  const isRecruitmentToggle = event.currentTarget.id === "recruitmentVisibilityToggle";
  if ((currentRole !== "owner" && currentRole !== "admin") || (isRecruitmentToggle && currentRole !== "owner")) {
    notify("You do not have permission to change this public section.");
    renderFeatureSettings();
    return;
  }
  const toggle = document.getElementById("leaksVisibilityToggle");
  const recruitmentToggle = document.getElementById("recruitmentVisibilityToggle");
  const enabled = toggle.checked;
  const recruitmentEnabled = currentRole === "owner"
    ? recruitmentToggle.checked
    : getFeatureSettings().recruitmentEnabled;
  try {
    localStorage.setItem(FEATURE_SETTINGS_KEY, JSON.stringify({ leaksEnabled: enabled, recruitmentEnabled }));
    document.getElementById("leaksVisibilityLabel").textContent = enabled ? "Visible on public site" : "Hidden from public site";
    if (currentRole === "owner") {
      document.getElementById("recruitmentVisibilityLabel").textContent = recruitmentEnabled ? "Visible on public site" : "Hidden from public site";
    }
    notify(isRecruitmentToggle
      ? "Creative open call visibility saved. Reload the public site to see the change."
      : "Studio Leaks visibility saved. Reload the public site to see the change.");
  } catch (error) {
    console.error("Could not save website feature settings:", error);
    notify("Could not save this setting in browser storage.");
    renderFeatureSettings();
  }
}

function renderOverview() {
  const statDefinitions = [
    ["PRODUCTS", "products", "Shop listings in this browser", "◇"],
    ["PRODUCTIONS", "productions", "Stories in the workspace", "▶"],
    ["APPLICATIONS", "applications", "Local creative submissions", "↗"],
    ["CONTACT MESSAGES", "contacts", "Local inbox records", "✉"],
    ["STUDIO LEAKS", "leaks", "Published sneak peeks", "◉"]
  ].filter(([, section]) => currentRole === "owner" || section !== "contacts");
  document.getElementById("statsGrid").innerHTML = statDefinitions.map(([label, section, note, icon]) => (
    `<article class="stat-card"><div class="stat-card-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${readRecords(section).length}</div><div class="stat-note">${note}</div></article>`
  )).join("");
  const recent = [
    ...readRecords("applications").map((record) => ({ ...record, kind: "Application", primary: record.name, secondary: record.position })),
    ...(currentRole === "owner" ? readRecords("contacts").map((record) => ({ ...record, kind: "Contact message", primary: record.name, secondary: record.subject })) : [])
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 4);
  const recentElement = document.getElementById("recentSubmissions");
  recentElement.innerHTML = recent.length ? recent.map((record) => (
    `<div class="recent-item"><div><strong>${escapeHTML(record.primary || record.kind)}</strong><small>${escapeHTML(record.kind)} · ${escapeHTML(record.secondary || "No details")}</small></div><span class="status-pill">${escapeHTML(record.status || "New")}</span></div>`
  )).join("") : '<p class="recent-empty">There are no local form submissions yet.</p>';
}

function renderTable() {
  const schema = SCHEMAS[activeSection];
  if (!schema || !canAccessSection(activeSection)) return;
  const allRecords = readRecords(activeSection);
  const query = tableSearch.value.trim().toLowerCase();
  const filterValue = tableFilter.value;
  const records = allRecords.filter((record) => {
    const matchesText = !query || Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(query));
    const matchesFilter = !filterValue || String(record[schema.filterField] || "") === filterValue;
    return matchesText && matchesFilter;
  });
  document.getElementById("tableHead").innerHTML = `<tr>${schema.columns.map((column) => `<th>${escapeHTML(column.label)}</th>`).join("")}<th><span class="sr-only">ACTIONS</span></th></tr>`;
  document.getElementById("tableBody").innerHTML = records.map((record) => {
    const cells = schema.columns.map((column) => {
      if (column.format === "image" || column.key === "image") {
        return `<td>${safeImage(record.image) ? `<img class="table-thumb" src="${escapeHTML(record.image)}" alt="${escapeHTML(record.alt || record.title || "")}">` : '<span class="cell-secondary">No image</span>'}</td>`;
      }
      if (column.primary) {
        const primary = column.format === "image" && safeImage(record.image)
          ? `<img class="table-thumb" src="${escapeHTML(record.image)}" alt="">`
          : `<div class="cell-primary">${escapeHTML(record[column.primary] || "—")}</div>`;
        return `<td>${primary}${column.secondary ? `<div class="cell-secondary">${escapeHTML(record[column.secondary] || "")}</div>` : ""}</td>`;
      }
      let value = record[column.key];
      if (column.format === "price" && value !== undefined && value !== "") {
        value = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
      }
      if (column.format === "stock") {
        const stock = getProductStock(record);
        const outOfStock = getProductAvailability(record) === "Out of stock";
        const stockClass = outOfStock ? "out-of-stock" : "in-stock";
        const stockLabel = outOfStock ? "OUT OF STOCK" : `${stock} IN STOCK`;
        return `<td><span class="status-pill ${stockClass}">${stockLabel}</span></td>`;
      }
      if (column.format === "status" && value) {
        const statusClass = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `<td><span class="status-pill ${escapeHTML(statusClass)}">${escapeHTML(value)}</span></td>`;
      }
      return `<td><div class="cell-secondary">${escapeHTML(value || "—")}</div></td>`;
    }).join("");
    return `<tr>${cells}<td><div class="row-actions"><button class="row-action" data-action="edit" data-id="${escapeHTML(record.id)}">EDIT</button><button class="row-action delete" data-action="delete" data-id="${escapeHTML(record.id)}">DELETE</button></div></td></tr>`;
  }).join("");
  document.getElementById("recordCount").textContent = `${records.length} ${records.length === 1 ? "record" : "records"}`;
  const empty = document.getElementById("tableEmpty");
  empty.hidden = records.length > 0;
  document.querySelector(".table-scroll").hidden = records.length === 0;
  updateTableFilters(allRecords, schema);
}

function updateTableFilters(records, schema) {
  if (!schema.filterField) {
    tableFilter.hidden = true;
    tableFilter.innerHTML = '<option value="">All records</option>';
    return;
  }
  const previous = tableFilter.value;
  const values = [...new Set(records.map((record) => record[schema.filterField]).filter(Boolean))].sort();
  tableFilter.hidden = false;
  tableFilter.innerHTML = `<option value="">${escapeHTML(schema.filterLabel || "All statuses")}</option>${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}`;
  if (values.includes(previous)) tableFilter.value = previous;
}

function openRecordModal(record) {
  if (!canAccessSection(activeSection)) {
    notify("That section is only available in the owner panel.");
    return;
  }
  const schema = SCHEMAS[activeSection];
  editingId = record?.id ?? null;
  document.getElementById("modalTitle").textContent = editingId === null
    ? `Add ${schema.singular}` : `Edit ${schema.singular}`;
  document.getElementById("formError").hidden = true;
  recordFields.innerHTML = schema.fields.map((field) => {
    const value = record?.[field.name] ?? field.default ?? "";
    const fullClass = field.full ? " full" : "";
    const required = field.required ? " required" : "";
    const requiredLabel = field.required ? ' <span aria-hidden="true">*</span>' : "";
    let control;
    if (field.type === "textarea") {
      control = `<textarea id="field-${field.name}" name="${field.name}"${required} maxlength="5000">${escapeHTML(value)}</textarea>`;
    } else if (field.type === "image") {
      control = `<input class="image-url-input" id="field-${field.name}" name="${field.name}" type="text" value="${escapeHTML(value)}" placeholder="https://…"><input class="image-file-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Upload ${escapeHTML(field.label)}"><img class="image-preview" alt="Selected image preview" ${safeImage(value) ? `src="${escapeHTML(value)}"` : "hidden"}>`;
    } else if (field.type === "select" || field.optionsFrom) {
      const options = field.optionsFrom === "categories"
        ? readRecords("categories").map((category) => category.name).filter(Boolean)
        : field.options || [];
      const optionMarkup = options.map((option) => `<option value="${escapeHTML(option)}"${String(option) === String(value) ? " selected" : ""}>${escapeHTML(option)}</option>`).join("");
      control = `<select id="field-${field.name}" name="${field.name}"${required}><option value="">Choose…</option>${optionMarkup}${value && !options.includes(value) ? `<option value="${escapeHTML(value)}" selected>${escapeHTML(value)}</option>` : ""}</select>`;
    } else {
      const type = field.type || "text";
      const min = field.min !== undefined ? ` min="${field.min}"` : "";
      control = `<input id="field-${field.name}" name="${field.name}" type="${type}" value="${escapeHTML(value)}"${required}${min}${type === "number" ? ' step="1"' : ""} maxlength="500">`;
    }
    return `<div class="form-field${fullClass}"><label for="field-${field.name}">${escapeHTML(field.label)}${requiredLabel}</label>${control}${field.hint ? `<small class="field-hint">${escapeHTML(field.hint)}</small>` : ""}</div>`;
  }).join("");
  bindImageUploads();
  recordModal.hidden = false;
  document.body.style.overflow = "hidden";
  recordModal.querySelector("input,textarea,select")?.focus();
}

function bindImageUploads() {
  recordFields.querySelectorAll(".image-file-input").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
        input.value = "";
        document.getElementById("formError").textContent = "Choose a PNG, JPEG, GIF, or WebP image.";
        document.getElementById("formError").hidden = false;
        return;
      }
      if (file.size > 1_000_000) {
        input.value = "";
        document.getElementById("formError").textContent = "Images must be 1 MB or smaller for this local demo.";
        document.getElementById("formError").hidden = false;
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const valueInput = input.parentElement.querySelector(".image-url-input");
        const preview = input.parentElement.querySelector(".image-preview");
        valueInput.value = String(reader.result);
        preview.src = String(reader.result);
        preview.hidden = false;
        document.getElementById("formError").hidden = true;
      });
      reader.addEventListener("error", () => {
        document.getElementById("formError").textContent = "This image could not be read.";
        document.getElementById("formError").hidden = false;
      });
      reader.readAsDataURL(file);
    });
  });
  recordFields.querySelectorAll(".image-url-input").forEach((input) => {
    input.addEventListener("input", () => {
      const preview = input.parentElement.querySelector(".image-preview");
      if (!preview) return;
      if (safeImage(input.value)) {
        preview.src = input.value;
        preview.hidden = false;
      } else {
        preview.removeAttribute("src");
        preview.hidden = true;
      }
    });
  });
}

function closeRecordModal() {
  recordModal.hidden = true;
  recordForm.reset();
  recordFields.replaceChildren();
  document.body.style.overflow = "";
  editingId = null;
}

function saveRecord(event) {
  event.preventDefault();
  if (!canAccessSection(activeSection)) {
    closeRecordModal();
    notify("That section is only available in the owner panel.");
    return;
  }
  const schema = SCHEMAS[activeSection];
  const data = Object.fromEntries(new FormData(recordForm).entries());
  const previous = readRecords(activeSection).find((record) => String(record.id) === String(editingId));
  const missingField = schema.fields.find((field) => field.required && !String(data[field.name] || "").trim());
  if (missingField) {
    const error = document.getElementById("formError");
    error.textContent = `${missingField.label} is required.`;
    error.hidden = false;
    return;
  }
  const invalidImage = schema.fields.find((field) => field.type === "image" && data[field.name] && !safeImage(data[field.name]));
  if (invalidImage) {
    const error = document.getElementById("formError");
    error.textContent = `${invalidImage.label} must be an HTTPS image URL or a supported uploaded image.`;
    error.hidden = false;
    return;
  }
  const invalidPreviewLink = activeSection === "leaks" && data.previewUrl && !/^https:\/\/[^\s"'<>]+$/i.test(data.previewUrl.trim());
  if (invalidPreviewLink) {
    const error = document.getElementById("formError");
    error.textContent = "Preview links must use HTTPS.";
    error.hidden = false;
    return;
  }
  if (activeSection === "content") {
    const duplicate = readRecords(activeSection).some((record) => record.key === data.key && String(record.id) !== String(editingId));
    if (duplicate) {
      const error = document.getElementById("formError");
      error.textContent = "There is already a content record for that homepage area. Edit the existing item instead.";
      error.hidden = false;
      return;
    }
  }
  if (activeSection === "products") {
    const stock = Number(data.stock);
    const availability = data.availability === "Out of stock" ? "Out of stock" : "In stock";
    if (!Number.isSafeInteger(stock) || stock < 0) {
      const error = document.getElementById("formError");
      error.textContent = "Stock quantity must be a whole number of 0 or more.";
      error.hidden = false;
      return;
    }
    if (availability === "In stock" && stock === 0) {
      const error = document.getElementById("formError");
      error.textContent = "Choose Out of stock or enter a stock quantity greater than 0.";
      error.hidden = false;
      return;
    }
    data.price = Number(data.price);
    data.stock = stock;
    data.availability = availability;
  }
  const record = { ...(previous || {}), ...data, id: previous ? previous.id : `${activeSection}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  if (activeSection === "applications" || activeSection === "contacts") {
    record.status = data.status || previous?.status || "New";
    record.date = previous?.date || new Date().toISOString();
  }
  if (activeSection === "media") record.uploaded = previous?.uploaded || new Date().toISOString();
  if (activeSection === "products" && !record.emoji) record.emoji = "✦";
  if (activeSection === "products" && !record.art) record.art = "linear-gradient(145deg,#321014,#101010)";
  const records = readRecords(activeSection);
  const updated = editingId === null ? [record, ...records] : records.map((item) => String(item.id) === String(editingId) ? record : item);
  if (!writeRecords(activeSection, updated)) return;
  closeRecordModal();
  renderTable();
  renderOverview();
  if (activeSection === "products") {
    notify("Product saved. Stock updates appear in open public shop tabs; reload if needed.");
  } else if (activeSection === "categories") {
    notify("Category saved. Refresh the public page to see shop updates.");
  } else if (activeSection === "content" || activeSection === "announcements" || activeSection === "team") {
    notify(`${schema.singular} saved. Public-page updates appear on its next load.`);
  } else {
    notify(`${schema.singular} saved in this browser.`);
  }
}

function handleTableAction(event) {
  if (!canAccessSection(activeSection)) return;
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const records = readRecords(activeSection);
  const record = records.find((item) => String(item.id) === button.dataset.id);
  if (!record) {
    notify("That record is no longer available.");
    renderTable();
    return;
  }
  if (button.dataset.action === "edit") {
    openRecordModal(record);
    return;
  }
  const schema = SCHEMAS[activeSection];
  const displayName = record.name || record.title || record.label || schema.singular;
  if (!window.confirm(`Delete "${displayName}" from this local demo? This cannot be undone.`)) return;
  if (!writeRecords(activeSection, records.filter((item) => String(item.id) !== String(record.id)))) return;
  renderTable();
  renderOverview();
  notify(`${schema.singular} deleted from this browser.`);
}

function safeImage(value) {
  const src = String(value || "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(src)
    || /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(src)
    || /^\/media\/[a-z0-9_-]+\.svg$/i.test(src);
}

function showSidebar() {
  const isOpen = sidebar.classList.toggle("open");
  sidebarScrim.classList.toggle("open", isOpen);
  const menuButton = document.getElementById("mobileMenu");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close dashboard menu" : "Open dashboard menu");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarScrim.classList.remove("open");
  const menuButton = document.getElementById("mobileMenu");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open dashboard menu");
}

async function logout() {
  const button = document.getElementById("logoutButton");
  button.disabled = true;
  try {
    const response = await fetch("/api/admin/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}"
    });
    if (!response.ok) throw new Error("Could not end the local demo session.");
    window.location.replace("/admin/login.html");
  } catch (error) {
    notify(error.message);
    button.disabled = false;
  }
}

async function startDashboard() {
  let session;
  try {
    const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("Could not verify the local demo session.");
    session = await response.json();
    if (!session.authenticated || !["admin", "owner"].includes(session.role)) {
      window.location.replace("/admin/login.html");
      return;
    }
    const ownerRoute = window.location.pathname === "/admin/owner.html";
    if ((session.role === "owner" && !ownerRoute) || (session.role === "admin" && ownerRoute)) {
      window.location.replace(session.role === "owner" ? "/admin/owner.html" : "/admin/dashboard.html");
      return;
    }
  } catch (error) {
    console.error("Could not verify admin demo session:", error);
    window.location.replace("/admin/login.html");
    return;
  }
  applyRoleAccess(session.role);
  seedDemoData();
  renderOverview();
  setSection("overview");
  document.getElementById("sidebarNav").scrollTop = 0;
}

document.getElementById("sidebarNav").addEventListener("click", (event) => {
  const item = event.target.closest("[data-section]");
  if (item) setSection(item.dataset.section);
});
document.querySelectorAll("[data-goto]").forEach((button) => {
  button.addEventListener("click", () => setSection(button.dataset.goto));
});
document.getElementById("addRecordButton").addEventListener("click", () => openRecordModal());
document.getElementById("tableBody").addEventListener("click", handleTableAction);
tableSearch.addEventListener("input", renderTable);
tableFilter.addEventListener("change", renderTable);
recordForm.addEventListener("submit", saveRecord);
document.getElementById("closeModal").addEventListener("click", closeRecordModal);
document.getElementById("cancelModal").addEventListener("click", closeRecordModal);
recordModal.addEventListener("click", (event) => {
  if (event.target === recordModal) closeRecordModal();
});
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("adminAccessForm").addEventListener("submit", grantAdminAccess);
document.getElementById("adminAccountsList").addEventListener("click", revokeAdminAccess);
document.getElementById("refreshAdminAccounts").addEventListener("click", () => {
  loadAdminAccounts().then((loaded) => {
    if (!loaded) notify(document.getElementById("adminAccountsList").textContent);
  });
});
document.getElementById("leaksVisibilityToggle").addEventListener("change", saveFeatureSettings);
document.getElementById("recruitmentVisibilityToggle").addEventListener("change", saveFeatureSettings);
document.getElementById("mobileMenu").addEventListener("click", showSidebar);
sidebarScrim.addEventListener("click", closeSidebar);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !recordModal.hidden) closeRecordModal();
  if (event.key === "Escape") closeSidebar();
});

startDashboard();
