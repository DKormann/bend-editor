import { highlightBend } from "./bendHighlight";
import { editView, type DefinitionRequest } from "./editView";
import { fetchHubFile, fetchHubIndex, formatBytes, HUB_ORIGIN, type HubPackage } from "./hub";
import { body, cursor, div, elFromTag, h1, h2, link, navbar, p, palette, pre, span } from "./ui";

type Project = { entry: string; files: Record<string, string> };
type OpenDocument =
  | { kind: "project"; path: string }
  | { kind: "hub"; hash: string; path: string };

const STORAGE_KEY = "bend-editor.project.v1";
const DEFAULT_PROJECT: Project = {
  entry: "main.bend",
  files: {
    "main.bend": "import Base\n\ndef main() -> Nat:\n  0n",
    "foo.bend": "import Base\n\ndef foo() -> Nat:\n  22n",
  },
};

function loadProject(): Project {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Project | null;
    if (value && typeof value.entry === "string" && value.files && value.entry in value.files) return value;
  } catch {}
  return { entry: DEFAULT_PROJECT.entry, files: { ...DEFAULT_PROJECT.files } };
}

function saveProject(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

function smallButton(label: string, action: () => void) {
  const button = elFromTag("button").append(label).style({
    background: "transparent",
    border: `1px solid ${palette.hint}`,
    borderRadius: "3px",
    color: palette.text,
    cursor: "pointer",
    font: "inherit",
    marginLeft: ".5em",
  });
  button.view.onclick = event => {
    event.stopPropagation();
    action();
  };
  return button;
}

let project = loadProject();
let activeDocument: OpenDocument | undefined;
let runInitiated = false;
const typeCache = new Map<string, string>();

const editor = editView(40, 80, highlightBend, lines => {
  if (activeDocument?.kind === "project") {
    project.files[activeDocument.path] = lines.join("\n");
    saveProject();
  }
  typeCache.clear();
  runInitiated = false;
});

const output = pre().style({
  boxSizing: "border-box",
  margin: "0",
  overflow: "auto",
  padding: "1em",
  whiteSpace: "pre-wrap",
});

let worker: Worker | undefined;
let runNumber = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;

function finish(text: string): void {
  if (timeout !== undefined) clearTimeout(timeout);
  timeout = undefined;
  worker?.terminate();
  worker = undefined;
  output.replaceChildren(text);
}

function run(): void {
  worker?.terminate();
  const id = ++runNumber;
  output.replaceChildren("Checking…");

  worker = new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<{ id: number; output: string }>) => {
    if (event.data.id === id) finish(event.data.output);
  };
  worker.onerror = event => finish(`Worker error: ${event.message}`);
  worker.postMessage({ kind: "run", id, entry: project.entry, files: project.files });
  timeout = setTimeout(() => finish("Execution stopped after 5 seconds."), 5000);
}

const documentName = span().style({ color: palette.colors[4], marginLeft: "1em" });
const definitionStatus = span().style({ color: palette.colors[3], marginLeft: "1em" });
const typePreview = pre().style({
  background: palette.background,
  border: `1px solid ${palette.hint}`,
  borderRadius: "4px",
  boxShadow: "0 4px 14px #0003",
  display: "none",
  margin: "0",
  maxWidth: "60ch",
  padding: ".5em .7em",
  pointerEvents: "none",
  position: "fixed",
  whiteSpace: "pre-wrap",
  zIndex: "10",
});
const head = div(
  h1(link("bend2", "https://bend-lang.org/").style({ textDecoration: "none" }), cursor)
    .style({ display: "flex", alignItems: "center" }),
  documentName,
  definitionStatus,
).style({ display: "flex", alignItems: "center" });

function openProjectFile(path: string, showEditor = true): void {
  const source = project.files[path];
  if (source === undefined) return;
  activeDocument = { kind: "project", path };
  definitionStatus.replaceChildren();
  documentName.replaceChildren(path === project.entry ? `${path} (entry)` : path);
  editor.setEditable(true);
  editor.setText(source.split("\n"));
  runInitiated = false;
  renderProjectFiles();
  if (showEditor) tabs.select("editor");
}

function validProjectPath(path: string): boolean {
  return path.endsWith(".bend") && !path.startsWith("/")
    && !path.split("/").some(part => part === "" || part === "." || part === "..");
}

function newProjectFile(): void {
  const path = prompt("New project file", "module.bend")?.trim();
  if (!path) return;
  if (!validProjectPath(path)) return alert("Use a relative path ending in .bend");
  if (project.files[path] !== undefined) return alert(`${path} already exists`);
  project.files[path] = "import Base\n";
  saveProject();
  openProjectFile(path);
}

function importHubFile(pkg: HubPackage, path: string): void {
  if (!path.endsWith(".bend")) return;
  const target = project.entry;
  const lines = project.files[target]!.split("\n");
  const stem = path.split("/").at(-1)!.replace(/\.bend$/, "").replace(/[^A-Za-z0-9_]/g, "_");
  let alias = stem.charAt(0).toUpperCase() + stem.slice(1) || "Package";
  if (!/^[A-Za-z_]/.test(alias)) alias = "P_" + alias;
  if (lines.some(line => new RegExp(`\\sas\\s+${alias}\\s*(?:#.*)?$`).test(line))) {
    alias += "_" + pkg.hash.slice(2, 6);
  }
  const statement = `import ${pkg.hash}/${path} as ${alias}`;
  if (!lines.includes(statement)) {
    let at = 0;
    while (at < lines.length && (/^\s*(?:#.*)?$/.test(lines[at]!) || /^\s*import\s/.test(lines[at]!))) at += 1;
    lines.splice(at, 0, statement);
    project.files[target] = lines.join("\n");
    saveProject();
  }
  openProjectFile(target);
}

const projectFiles = div();
function renderProjectFiles(): void {
  projectFiles.replaceChildren(
    ...Object.keys(project.files).sort().map(path => {
      const selected = activeDocument?.kind === "project" && activeDocument.path === path;
      const row = div((path === project.entry ? "◆ " : "  ") + path).style({
        background: selected ? palette.hint : "transparent",
        cursor: "pointer",
        padding: ".15em .4em",
      });
      row.view.onclick = () => openProjectFile(path);
      return row;
    }),
  );
}

let hubPackages: HubPackage[] | undefined;
let hubError = "";
let expandedPackage: string | undefined;
const hubResults = div();
const hubSearch = elFromTag("input").assignProperties({
  placeholder: "search descriptions, files or hashes",
  spellcheck: false,
}).style({
  background: "transparent",
  border: `1px solid ${palette.hint}`,
  boxSizing: "border-box",
  color: palette.text,
  font: "inherit",
  margin: ".5em 0",
  padding: ".4em",
  width: "100%",
});
hubSearch.view.oninput = () => renderHubPackages();

function renderHubPackages(): void {
  if (hubError) {
    hubResults.replaceChildren(hubError);
    return;
  }
  if (hubPackages === undefined) {
    hubResults.replaceChildren("Loading Bend Hub…");
    return;
  }

  const query = hubSearch.view.value.trim().toLowerCase();
  const packages = hubPackages.filter(pkg => !query ||
    pkg.hash.includes(query) || pkg.desc.toLowerCase().includes(query)
    || Object.keys(pkg.files).some(path => path.toLowerCase().includes(query))).slice(0, 30);

  hubResults.replaceChildren(...packages.map(pkg => {
    const open = expandedPackage === pkg.hash;
    const title = div(
      span((open ? "▾ " : "▸ ") + (pkg.desc || pkg.hash)),
      span(` ${Object.keys(pkg.files).length} files · ${formatBytes(pkg.bytes)}`)
        .style({ color: palette.colors[4], fontSize: ".85em" }),
    ).style({ cursor: "pointer", padding: ".3em 0" });
    title.view.onclick = () => {
      expandedPackage = open ? undefined : pkg.hash;
      renderHubPackages();
    };
    if (!open) return div(title);

    const fileRows = Object.entries(pkg.files).map(([path, bytes]) => {
      const row = div(
        span(`${path}  ${formatBytes(bytes)}`),
        smallButton("view", () => void openHubFile(pkg, path)),
        ...(path.endsWith(".bend") ? [smallButton("import", () => importHubFile(pkg, path))] : []),
      ).style({ padding: ".15em 0 .15em 1.5em" });
      return row;
    });
    return div(title, ...fileRows, div(link("open package on hub", `${HUB_ORIGIN}/${pkg.hash}`))
      .style({ paddingLeft: "1.5em" }));
  }));
}

async function loadHub(): Promise<void> {
  if (hubPackages !== undefined) return;
  renderHubPackages();
  try {
    hubPackages = await fetchHubIndex();
  } catch (error) {
    hubError = String(error);
  }
  renderHubPackages();
}

async function openHubFile(pkg: HubPackage, path: string): Promise<void> {
  await showHubFile(pkg.hash, path);
}

async function showHubFile(hash: string, path: string, line = 0, col = 0): Promise<void> {
  definitionStatus.replaceChildren();
  documentName.replaceChildren(`${hash.slice(0, 10)}…/${path} (read only)`);
  editor.setEditable(false);
  editor.setText(["Loading from Bend Hub…"]);
  activeDocument = { kind: "hub", hash, path };
  tabs.select("editor");
  try {
    const source = await fetchHubFile(hash, path);
    if (activeDocument.kind === "hub" && activeDocument.hash === hash && activeDocument.path === path) {
      editor.setText(source.split("\n"));
      editor.goTo(line, col);
    }
  } catch (error) {
    editor.setText([String(error)]);
  }
}

function relativePath(from: string, target: string): string | undefined {
  const parts = from.split("/").slice(0, -1).concat(target.split("/"));
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return undefined;
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join("/");
}

function definitionIn(source: string, symbol: string): { line: number; col: number } | undefined {
  if (!symbol) return { line: 0, col: 0 };
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const top = new RegExp(`^\\s*(?:@unsafe\\s+)?(?:def|law|type)\\s+${escaped}(?=\\s|\\(|<|:)`);
  const constructor = new RegExp(`^\\s+${escaped}(?=\\s*(?:<[^>]*>)?\\{)`);
  const lines = source.split("\n");
  for (let line = 0; line < lines.length; line += 1) {
    if (top.test(lines[line]!) || constructor.test(lines[line]!)) {
      return { line, col: Math.max(0, lines[line]!.indexOf(symbol)) };
    }
  }
  return undefined;
}

let typeWorker: Worker | undefined;
let typeSequence = 0;
let typeTimer: ReturnType<typeof setTimeout> | undefined;
const pendingTypes = new Map<number, { key: string; target: HTMLElement }>();

function typeKey(document: OpenDocument, token: string): string {
  return document.kind === "project"
    ? `project:${document.path}:${token}`
    : `hub:${document.hash}/${document.path}:${token}`;
}

function showTypePreview(text: string, target: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  typePreview.replaceChildren(text).style({
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.bottom + 6}px`,
  });
  const preview = typePreview.view.getBoundingClientRect();
  if (preview.right > innerWidth - 8) {
    typePreview.style({ left: `${Math.max(8, innerWidth - preview.width - 8)}px` });
  }
}

function hideTypePreview(): void {
  if (typeTimer !== undefined) clearTimeout(typeTimer);
  typeTimer = undefined;
  typeSequence += 1;
  typePreview.style({ display: "none" });
}

function requestTypePreview(request: DefinitionRequest, target: HTMLElement): void {
  if (typeTimer !== undefined) clearTimeout(typeTimer);
  const document = activeDocument;
  if (document === undefined) return;
  const key = typeKey(document, request.token);
  const cached = typeCache.get(key);
  if (cached !== undefined) {
    showTypePreview(cached, target);
    return;
  }

  const id = ++typeSequence;
  typeTimer = setTimeout(() => {
    typeWorker ??= new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
    typeWorker.onmessage = (event: MessageEvent<{ kind: string; id: number; type?: string }>) => {
      if (event.data.kind !== "type") return;
      const pending = pendingTypes.get(event.data.id);
      pendingTypes.delete(event.data.id);
      if (pending === undefined || event.data.type === undefined) return;
      typeCache.set(pending.key, event.data.type);
      if (event.data.id === typeSequence) showTypePreview(event.data.type, pending.target);
    };
    pendingTypes.set(id, { key, target });
    typeWorker.postMessage({
      kind: "type",
      id,
      files: project.files,
      document,
      token: request.token,
    });
  }, 180);
}

async function jumpToDefinition(request: DefinitionRequest): Promise<void> {
  const current = activeDocument;
  if (current === undefined) return;
  const source = editor.getText().join("\n");
  const [prefix, ...rest] = request.token.split(".");
  const imports = [...source.matchAll(/^\s*import\s+(\S+)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/gm)];
  const imported = imports.find(match => match[2] === prefix);
  let symbol = request.token;
  let target: OpenDocument = current;
  let targetSource = source;

  if (imported !== undefined) {
    const specifier = imported[1]!;
    symbol = rest.join(".");
    const remote = /^(0x[0-9a-f]{32})\/(.+)$/.exec(specifier);
    if (remote) {
      target = { kind: "hub", hash: remote[1]!, path: remote[2]! };
      targetSource = await fetchHubFile(remote[1]!, remote[2]!);
    } else if (current.kind === "hub") {
      const path = relativePath(current.path, specifier);
      if (path === undefined) return;
      target = { kind: "hub", hash: current.hash, path };
      targetSource = await fetchHubFile(current.hash, path);
    } else {
      const path = relativePath(current.path, specifier);
      if (path === undefined || project.files[path] === undefined) return;
      target = { kind: "project", path };
      targetSource = project.files[path]!;
    }
  }

  const found = definitionIn(targetSource, symbol);
  if (found === undefined) {
    definitionStatus.replaceChildren(`definition not found: ${request.token}`);
    return;
  }
  if (target.kind === "project") {
    openProjectFile(target.path);
    editor.goTo(found.line, found.col);
  } else {
    await showHubFile(target.hash, target.path, found.line, found.col);
  }
}

const explorer = div(
  h2("Project", smallButton("+ file", newProjectFile)),
  projectFiles,
  h2("Bend Hub"),
  hubSearch,
  hubResults,
).style({ padding: "1em" });

const tabs = navbar({
  explorer: () => {
    renderProjectFiles();
    void loadHub();
    return explorer;
  },
  editor: () => editor.view,
  output: () => {
    if (!runInitiated){
      output.replaceChildren(p("Checking…"));
      runInitiated = true;
      run();
    }
    return output;
  },
  about: () => div(
    p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."),
    p("say hi: ", link("contact", "https://x.com/dogecahedron")),
  ).style({ padding: "1em" }),
});

editor.setDefinitionHandler(request => {
  void jumpToDefinition(request).catch(error => {
    definitionStatus.replaceChildren(String(error));
  });
});
editor.setTypeHandler(requestTypePreview, hideTypePreview);
openProjectFile(project.entry, false);
body.append(head, tabs, typePreview);
