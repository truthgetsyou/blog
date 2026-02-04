const CONFIG = {
  owner: "truthgetsyou",
  repo: "blog",
  branch: "main",
  contentRoot: "contents"
};

const LOCAL_EXAMPLE_NOTES = [
  "contents/welcome.md",
  "contents/journal/2026-02-01.md",
  "contents/journal/2026-02-03.md",
  "contents/journal/long-note.md",
  "contents/engineering/javascript/markdown-rendering.md",
  "contents/engineering/web/layout-notes.md",
  "contents/reading/design-and-clarity.md"
];

const sidebar = document.getElementById("sidebar");
const sidebarResizer = document.getElementById("sidebarResizer");
const sectionResizer = document.getElementById("sectionResizer");
const sidebarToggle = document.getElementById("sidebarToggle");
const treeSection = document.getElementById("treeSection");
const fileTree = document.getElementById("fileTree");
const outline = document.getElementById("outline");
const noteContent = document.getElementById("noteContent");

const state = {
  allNotes: [],
  currentNote: "",
  closedFolders: new Set()
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function uniqueSorted(paths) {
  return Array.from(new Set(paths)).sort((a, b) => a.localeCompare(b));
}

function renderInline(text) {
  let html = escapeHtml(text);
  const codeTokens = [];

  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const token = `__CODE_${codeTokens.length}__`;
    codeTokens.push(`<code>${code}</code>`);
    return token;
  });

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/__CODE_(\d+)__/g, (_, index) => codeTokens[Number(index)] || "");

  return html;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let inCodeBlock = false;
  let listType = "";
  let inBlockquote = false;

  function closeList() {
    if (listType) {
      html += `</${listType}>`;
      listType = "";
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html += "</blockquote>";
      inBlockquote = false;
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      closeBlockquote();

      if (!inCodeBlock) {
        inCodeBlock = true;
        html += "<pre><code>";
      } else {
        inCodeBlock = false;
        html += "</code></pre>";
      }
      continue;
    }

    if (inCodeBlock) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      closeBlockquote();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = headingMatch[1].length;
      html += `<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`;
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      closeList();
      if (!inBlockquote) {
        inBlockquote = true;
        html += "<blockquote>";
      }
      html += `<p>${renderInline(blockquoteMatch[1])}</p>`;
      continue;
    }
    closeBlockquote();

    const unorderedMatch = line.match(/^[-*+]\s+(.+)$/);
    if (unorderedMatch) {
      if (listType !== "ul") {
        closeList();
        listType = "ul";
        html += "<ul>";
      }
      html += `<li>${renderInline(unorderedMatch[1])}</li>`;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (listType !== "ol") {
        closeList();
        listType = "ol";
        html += "<ol>";
      }
      html += `<li>${renderInline(orderedMatch[1])}</li>`;
      continue;
    }

    closeList();
    if (/^---+$/.test(trimmed)) {
      html += "<hr>";
      continue;
    }

    html += `<p>${renderInline(trimmed)}</p>`;
  }

  closeList();
  closeBlockquote();
  if (inCodeBlock) {
    html += "</code></pre>";
  }

  return html;
}

function updateOutline() {
  outline.innerHTML = "";
  const headings = Array.from(noteContent.querySelectorAll("h2, h3"));

  if (!headings.length) {
    const msg = document.createElement("p");
    msg.className = "muted";
    msg.textContent = "No H2/H3 headings yet.";
    outline.appendChild(msg);
    return;
  }

  const slugCounts = new Map();
  const list = document.createElement("ul");
  list.className = "outline-list";

  for (const heading of headings) {
    const base = slugify(heading.textContent) || "section";
    const count = slugCounts.get(base) || 0;
    slugCounts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    heading.id = id;

    const item = document.createElement("li");
    item.className = `outline-item ${heading.tagName === "H3" ? "level-3" : "level-2"}`;

    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    item.appendChild(link);
    list.appendChild(item);
  }

  outline.appendChild(list);
}

function createTree(paths) {
  const root = { dirs: new Map(), files: [] };

  for (const fullPath of paths) {
    const relative = fullPath.slice(CONFIG.contentRoot.length + 1);
    const parts = relative.split("/");
    const fileName = parts[parts.length - 1];

    let current = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const folder = parts[index];
      if (!current.dirs.has(folder)) {
        current.dirs.set(folder, { dirs: new Map(), files: [] });
      }
      current = current.dirs.get(folder);
    }

    current.files.push({ name: fileName, path: fullPath });
  }

  return root;
}

function renderTree(paths) {
  fileTree.innerHTML = "";
  const tree = createTree(paths);

  function renderNode(node, mountPoint, parentPath = "") {
    const folderNames = Array.from(node.dirs.keys()).sort((a, b) => a.localeCompare(b));
    for (const folderName of folderNames) {
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      const details = document.createElement("details");
      details.className = "tree-folder";
      details.open = !state.closedFolders.has(folderPath);

      const summary = document.createElement("summary");
      const chevron = document.createElement("i");
      chevron.className = "bi bi-chevron-right tree-chevron";
      summary.appendChild(chevron);
      summary.appendChild(document.createTextNode(folderName));
      details.appendChild(summary);
      details.addEventListener("toggle", () => {
        if (details.open) {
          state.closedFolders.delete(folderPath);
        } else {
          state.closedFolders.add(folderPath);
        }
      });

      const children = document.createElement("div");
      children.className = "tree-children";
      renderNode(node.dirs.get(folderName), children, folderPath);
      details.appendChild(children);

      mountPoint.appendChild(details);
    }

    const sortedFiles = node.files.sort((a, b) => a.name.localeCompare(b.name));
    for (const file of sortedFiles) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tree-file";
      button.dataset.path = file.path;
      const fileIcon = document.createElement("i");
      fileIcon.className = "bi bi-file-earmark-text";
      button.appendChild(fileIcon);
      button.appendChild(document.createTextNode(file.name.replace(/\.md$/i, "")));
      if (file.path === state.currentNote) {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        openNote(file.path);
      });

      mountPoint.appendChild(button);
    }
  }

  const root = document.createElement("details");
  root.className = "tree-folder tree-root";
  root.open = true;

  const rootSummary = document.createElement("summary");
  const rootChevron = document.createElement("i");
  rootChevron.className = "bi bi-chevron-right tree-chevron";
  rootSummary.appendChild(rootChevron);
  rootSummary.appendChild(document.createTextNode("Jay's blog"));
  root.appendChild(rootSummary);

  const rootChildren = document.createElement("div");
  rootChildren.className = "tree-children";
  renderNode(tree, rootChildren);
  root.appendChild(rootChildren);

  fileTree.appendChild(root);
}

function getBasePath() {
  if (window.location.pathname.endsWith("/")) {
    return window.location.pathname;
  }
  return window.location.pathname.replace(/[^/]+$/, "");
}

function getNoteUrl(path) {
  return `${window.location.origin}${getBasePath()}${path}`;
}

function setSidebarWidth(width, persist = true) {
  const max = Math.floor(window.innerWidth * 0.7);
  const next = clamp(width, 220, max);
  document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
  if (persist) {
    localStorage.setItem("sidebarWidth", String(next));
  }
  return next;
}

function getTreeHeightBounds() {
  const sidebarHeight = sidebar.getBoundingClientRect().height;
  const resizerHeight = sectionResizer.getBoundingClientRect().height;
  const min = 110;
  const max = Math.max(min, sidebarHeight - resizerHeight - 120);
  return { min, max };
}

function setTreeSectionHeight(height, persist = true, bounds = null) {
  const currentBounds = bounds || getTreeHeightBounds();
  const next = clamp(height, currentBounds.min, currentBounds.max);
  treeSection.style.height = `${next}px`;
  if (persist) {
    localStorage.setItem("treeHeight", String(next));
  }
  return next;
}

function setSidebarHidden(hidden) {
  document.body.classList.toggle("sidebar-hidden", hidden);
  sidebarToggle.setAttribute("aria-expanded", String(!hidden));
  sidebarToggle.setAttribute("aria-label", hidden ? "Show sidebar" : "Hide sidebar");
  sidebarToggle.title = hidden ? "Show sidebar" : "Hide sidebar";
  localStorage.setItem("sidebarHidden", hidden ? "1" : "0");
}

function updateNoteInUrl(path) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("note", path);
  window.history.replaceState({}, "", nextUrl);
}

async function openNote(path) {
  state.currentNote = path;
  updateNoteInUrl(path);
  renderTree(state.allNotes);
  noteContent.innerHTML = '<p class="muted">Loading note...</p>';
  outline.innerHTML = "";

  const noteUrl = getNoteUrl(path);
  const response = await fetch(noteUrl);
  if (!response.ok) {
    noteContent.innerHTML = "<p>Could not load that note.</p>";
    return;
  }

  const markdown = await response.text();
  noteContent.innerHTML = renderMarkdown(markdown);
  updateOutline();
}

async function loadNotesFromGitHub() {
  const branches = uniqueSorted([CONFIG.branch, "master"]);

  for (const branch of branches) {
    const treeUrl =
      `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${branch}?recursive=1`;
    try {
      const response = await fetch(treeUrl);
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const notes = data.tree
        .filter((item) => {
          return (
            item.type === "blob" &&
            item.path.startsWith(`${CONFIG.contentRoot}/`) &&
            item.path.endsWith(".md")
          );
        })
        .map((item) => item.path);

      if (notes.length) {
        return uniqueSorted(notes);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return [];
}

async function loadLocalFallbackNotes() {
  const requested = new URLSearchParams(window.location.search).get("note");
  const candidates = uniqueSorted([
    requested || "",
    ...LOCAL_EXAMPLE_NOTES,
    `${CONFIG.contentRoot}/index.md`
  ]).filter(Boolean);

  const found = [];
  for (const path of candidates) {
    try {
      const response = await fetch(getNoteUrl(path));
      if (response.ok) {
        found.push(path);
      }
    } catch (error) {
      console.error(error);
    }
  }
  return found;
}

function bindSidebarResizer() {
  sidebarResizer.addEventListener("mousedown", (event) => {
    if (document.body.classList.contains("sidebar-hidden")) {
      return;
    }
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebar.getBoundingClientRect().width;
    let latestWidth = startWidth;

    function onMouseMove(moveEvent) {
      const delta = moveEvent.clientX - startX;
      latestWidth = setSidebarWidth(startWidth + delta, false);
    }

    function onMouseUp() {
      setSidebarWidth(latestWidth, true);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function bindSectionResizer() {
  sectionResizer.addEventListener("mousedown", (event) => {
    if (document.body.classList.contains("sidebar-hidden")) {
      return;
    }
    event.preventDefault();

    const startY = event.clientY;
    const bounds = getTreeHeightBounds();
    const startHeight = treeSection.getBoundingClientRect().height;
    let latestHeight = startHeight;

    function onMouseMove(moveEvent) {
      const delta = moveEvent.clientY - startY;
      latestHeight = setTreeSectionHeight(startHeight + delta, false, bounds);
    }

    function onMouseUp() {
      setTreeSectionHeight(latestHeight, true, bounds);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function setupLayoutFromStorage() {
  const savedWidth = Number(localStorage.getItem("sidebarWidth"));
  if (savedWidth) {
    setSidebarWidth(savedWidth, false);
  }

  const savedTreeHeight = Number(localStorage.getItem("treeHeight"));
  if (savedTreeHeight) {
    setTreeSectionHeight(savedTreeHeight, false);
  }

  const hidden = localStorage.getItem("sidebarHidden") === "1";
  setSidebarHidden(hidden);
}

function setupToggle() {
  sidebarToggle.addEventListener("click", () => {
    const hidden = document.body.classList.contains("sidebar-hidden");
    setSidebarHidden(!hidden);
  });
}

function getRequestedNote(paths) {
  const requested = new URLSearchParams(window.location.search).get("note");
  if (requested && paths.includes(requested)) {
    return requested;
  }
  return paths[0];
}

function handleResize() {
  const currentWidth = Number(
    getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").replace("px", "")
  );
  if (currentWidth) {
    setSidebarWidth(currentWidth, false);
  }

  const currentTreeHeight = Number(treeSection.style.height.replace("px", ""));
  if (currentTreeHeight) {
    setTreeSectionHeight(currentTreeHeight, false);
  }
}

async function init() {
  setupLayoutFromStorage();
  setupToggle();
  bindSidebarResizer();
  bindSectionResizer();
  window.addEventListener("resize", handleResize);

  fileTree.innerHTML = '<p class="muted">Loading notes...</p>';
  noteContent.innerHTML = '<p class="muted">Loading...</p>';

  state.allNotes = await loadNotesFromGitHub();
  if (!state.allNotes.length) {
    state.allNotes = await loadLocalFallbackNotes();
  }

  if (!state.allNotes.length) {
    fileTree.innerHTML = `<p class="muted">No markdown notes found in ${CONFIG.contentRoot}/.</p>`;
    noteContent.innerHTML = `<p>Add your first note in <code>${CONFIG.contentRoot}/</code> to get started.</p>`;
    outline.innerHTML = "";
    return;
  }

  const firstNote = getRequestedNote(state.allNotes);
  await openNote(firstNote);

  const savedTreeHeight = Number(localStorage.getItem("treeHeight"));
  if (!savedTreeHeight) {
    setTreeSectionHeight(sidebar.getBoundingClientRect().height * 0.56);
  }
}

init();
