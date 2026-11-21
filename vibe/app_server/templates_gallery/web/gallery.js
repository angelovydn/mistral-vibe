const select = (selector, root = document) => root.querySelector(selector);
const catalog = select("#catalog");
const preview = select("#preview");
const create = select("#create");
const liveFrame = select("#live-preview");
const form = select("#project-form");
const folder = select("#folder");
const errorMessage = select("#project-error");
const submit = select("#submit");
const copyButton = select("#copy-commands");
let workspace = "";
let previewTemplate;
let createTemplate;
let previewOpener;
let createOpener;
let creating = false;

function readToken() {
  const fragment = location.hash.slice(1);
  if (fragment && fragment !== "templates") {
    history.replaceState(null, "", location.pathname);
    sessionStorage.setItem("vibeGalleryToken", fragment);
    return fragment;
  }
  return sessionStorage.getItem("vibeGalleryToken");
}

const token = readToken();

async function request(path, body) {
  const headers = { Authorization: `Bearer ${token}` };
  const options = { headers, cache: "no-store" };
  if (body) {
    headers["Content-Type"] = "application/json";
    options.method = "POST";
    options.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Vibe is unreachable. Open /templates in your Vibe workspace and try again.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("Open /templates in your Vibe workspace to reconnect this gallery.");
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Vibe could not complete this request. Try again.");
  return result;
}

const thumbnailSizes = new ResizeObserver(entries => {
  for (const entry of entries) {
    entry.target.style.setProperty("--scale", String(entry.contentRect.width / 980));
  }
});

function previewUrl(template) {
  return `/previews/${encodeURIComponent(template.id)}/index.html`;
}

function renderCard(template) {
  const card = select("#card-template").content.firstElementChild.cloneNode(true);
  card.dataset.id = template.id;
  select("h2", card).textContent = template.name;
  select("p", card).textContent = template.description;
  select("iframe", card).src = previewUrl(template);
  thumbnailSizes.observe(select(".mini-window", card));
  const previewButton = select(".preview-button", card);
  previewButton.setAttribute("aria-label", `Preview ${template.name}`);
  previewButton.addEventListener("click", () => {
    previewTemplate = template;
    previewOpener = previewButton;
    select("#preview-title").textContent = `${template.name} preview`;
    liveFrame.title = `${template.name} interactive preview`;
    liveFrame.src = previewUrl(template);
    preview.showModal();
    select(".close-preview").focus();
  });
  const createButton = select(".create-button", card);
  createButton.setAttribute("aria-label", `Use ${template.name} template`);
  createButton.addEventListener("click", () => openCreate(template, createButton));
  catalog.append(card);
}

async function loadCatalog() {
  const status = select("#catalog-status");
  try {
    const result = await request("/api/catalog");
    workspace = result.workspace;
    const workspaceName = workspace.split(/[\\/]/).filter(Boolean).at(-1) || workspace;
    const workspaceBadge = select("#workspace");
    workspaceBadge.title = workspace;
    workspaceBadge.setAttribute("aria-label", `Workspace: ${workspace}`);
    select("span", workspaceBadge).textContent = workspaceName;
    workspaceBadge.hidden = false;
    result.templates.forEach(renderCard);
    status.hidden = true;
  } catch (error) {
    status.textContent = error.message;
  }
}

function updateDestination() {
  const separator = workspace.includes("\\") ? "\\" : "/";
  const parent = workspace.endsWith(separator) ? workspace : workspace + separator;
  select("#destination").textContent = parent + folder.value;
}

function validateName(name) {
  if (!name) return "Enter a folder name.";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9 _-]{0,62}[A-Za-z0-9_-])?$/.test(name)) {
    return "Use 1–64 letters, numbers, spaces, hyphens, or underscores. Start with a letter or number and remove any trailing space.";
  }
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) return "Choose a different folder name. This name is reserved.";
  return "";
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
  folder.setAttribute("aria-invalid", String(Boolean(message)));
}

function openCreate(template, opener) {
  createTemplate = template;
  createOpener = opener;
  select("#create-title").textContent = `Use ${template.name} template`;
  select("#success").hidden = true;
  form.hidden = false;
  folder.value = `my-${template.id}`;
  updateDestination();
  showError("");
  create.showModal();
  folder.focus();
  folder.select();
}

function setCreating(pending) {
  creating = pending;
  submit.disabled = pending;
  folder.readOnly = pending;
  create.querySelectorAll(".dismiss").forEach(button => { button.disabled = pending; });
  form.setAttribute("aria-busy", String(pending));
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (creating) return;
  const name = folder.value;
  const validation = validateName(name);
  showError(validation);
  if (validation) {
    folder.focus();
    return;
  }
  setCreating(true);
  try {
    const project = await request("/api/projects", { template: createTemplate.id, name });
    form.hidden = true;
    select("#success").hidden = false;
    select("#create-title").textContent = "Project created";
    select("#created-path").textContent = project.path;
    select("#run-commands").textContent = `cd "${name}"\nnpm ci\nnpm run dev`;
    copyButton.textContent = "Copy commands";
    select("#copy-status").textContent = "";
    copyButton.focus();
  } catch (error) {
    showError(error.message);
    folder.focus();
  } finally {
    setCreating(false);
  }
});

folder.addEventListener("input", () => { showError(""); updateDestination(); });
select(".close-preview").addEventListener("click", () => preview.close());
preview.addEventListener("close", () => {
  liveFrame.removeAttribute("src");
  previewOpener.focus({ preventScroll: true });
});
select("#preview-create").addEventListener("click", event => openCreate(previewTemplate, event.currentTarget));
create.querySelectorAll(".dismiss").forEach(button => button.addEventListener("click", () => create.close()));
create.addEventListener("cancel", event => { if (creating) event.preventDefault(); });
create.addEventListener("close", () => createOpener.focus({ preventScroll: true }));

liveFrame.addEventListener("load", () => {
  liveFrame.contentDocument?.addEventListener("keydown", event => {
    if (event.key === "Escape" && !event.defaultPrevented && !liveFrame.contentDocument.querySelector("dialog[open]")) {
      event.preventDefault();
      preview.close();
    }
  });
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(select("#run-commands").textContent);
    copyButton.textContent = "Copied";
    select("#copy-status").textContent = "Commands copied.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(select("#run-commands"));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    select("#copy-status").textContent = "Commands selected. Use your copy shortcut.";
  }
});

loadCatalog();
