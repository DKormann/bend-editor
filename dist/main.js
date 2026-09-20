// bendHighlight.ts
var TEXT = 0;
var KEYWORD = 1;
var COMMENT = 2;
var LITERAL = 3;
var TYPE = 4;
var keywords = new Set([
  "as",
  "case",
  "def",
  "do",
  "exs",
  "for",
  "import",
  "is",
  "law",
  "match",
  "return",
  "type",
  "where"
]);
var typeWords = new Set([
  "Base",
  "Data",
  "Kind",
  "Quant",
  "Type"
]);
function isNameStart(char) {
  return /[A-Za-z_]/.test(char);
}
function isNameChar(char) {
  return /[A-Za-z0-9_.$E]/.test(char);
}
function paint(row, from, to, color) {
  for (let i = from;i < to; i += 1)
    row[i] = color;
}
function highlightBend(lines) {
  return lines.map((line) => {
    const colors = Array(line.length).fill(TEXT);
    let i = 0;
    while (i < line.length) {
      const char = line[i];
      if (char === "#") {
        paint(colors, i, line.length, COMMENT);
        break;
      }
      if (char === '"' || char === "'") {
        const quote = char;
        const start = i++;
        while (i < line.length) {
          if (line[i] === "\\") {
            i += 2;
          } else if (line[i++] === quote) {
            break;
          }
        }
        paint(colors, start, Math.min(i, line.length), LITERAL);
        continue;
      }
      if (/\d/.test(char)) {
        const start = i++;
        while (i < line.length && /[0-9A-Fa-f_xX.]/.test(line[i]))
          i += 1;
        if (line[i] === "n")
          i += 1;
        paint(colors, start, i, LITERAL);
        continue;
      }
      if (isNameStart(char)) {
        const start = i++;
        while (i < line.length && isNameChar(line[i]))
          i += 1;
        const word = line.slice(start, i);
        const color = keywords.has(word) ? KEYWORD : typeWords.has(word) || /^[A-Z]/.test(word) ? TYPE : TEXT;
        paint(colors, start, i, color);
        continue;
      }
      if (line.startsWith("@unsafe", i)) {
        paint(colors, i, i + 7, KEYWORD);
        i += 7;
        continue;
      }
      const operator = ["->", "==", "!=", "<&>", "&0", "&1", "&2"].find((token) => line.startsWith(token, i));
      if (operator) {
        paint(colors, i, i + operator.length, KEYWORD);
        i += operator.length;
        continue;
      }
      i += 1;
    }
    return colors;
  });
}

// ui.ts
var css = `

  @media (prefers-color-scheme: dark) {
    :root{
      --text-color: #e6d8c1;
      --background-color: #172033;
    }
  }

  :root{
    font-family: ui-monospace, Menlo, "SF Mono", Consolas, "Liberation Mono", monospace;
    color: var(--text-color);
    background: var(--background-color);
    --accent-color: #6e47cb;
    --hint-color: #f6f3ed;
    --text-color: #172033;
    --background-color: #e8e2cc;
    --color2: #74aa31;
    --color3: #9e4714;
    --color4: #09629a;

  }
`;
document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
var palette = {
  text: "var(--text-color)",
  background: "var(--background-color)",
  accent: "var(--accent-color)",
  hint: "var(--hint-color)",
  colors: [
    "var(--text-color)",
    "var(--accent-color)",
    "var(--color2)",
    "var(--color3)",
    "var(--color4)"
  ]
};
function elFromHTML(html) {
  let el = {
    view: html,
    replaceChildren: (...children) => {
      html.replaceChildren(...children.map((child) => typeof child === "string" ? child : child.view));
      return el;
    },
    append: (...children) => {
      children.forEach((child) => html.append(typeof child === "string" ? child : child.view));
      return el;
    },
    assignProperties: (props) => {
      Object.assign(html, props);
      return el;
    },
    style: (styles) => {
      Object.assign(html.style, styles);
      return el;
    }
  };
  return el;
}
function elFromTag(tagName) {
  const html = document.createElement(tagName);
  return elFromHTML(html);
}
var tagger = (tagName) => (...s) => elFromTag(tagName).append(...s);
var link = (s, href) => tagger("a")(s).style({ color: palette.text }).assignProperties({ href });
var p = tagger("p");
var span = tagger("span");
var div = tagger("div");
var pre = tagger("pre");
var h1 = tagger("h1");
var h2 = tagger("h2");
var h3 = tagger("h3");
var body = elFromHTML(document.body);
var cursor = div().style({
  background: palette.accent,
  width: ".5em",
  height: ".9em",
  margin: "0 .1em"
});
function navbar(items) {
  const entries = Object.entries(items);
  const bar = div().style({ display: "flex" });
  const page = div().style({
    padding: "0",
    margin: "0",
    border: `2px solid ${palette.hint}`,
    minHeight: "40em"
  });
  document.addEventListener("keydown", (e) => {
    if (e.key == "Enter" && e.metaKey)
      render(selection == 0 ? 1 : 0);
  });
  let selection = 0;
  function render(sel = 0) {
    selection = sel;
    bar.replaceChildren();
    entries.forEach(([name, item], i) => {
      const but = span(name).style({
        cursor: "pointer",
        padding: ".2em .7em",
        borderRadius: "6px 6px 0 0 "
      });
      if (i === selection) {
        page.replaceChildren(item());
        but.style({ background: palette.hint });
      }
      but.view.onclick = () => render(i);
      bar.append(but);
    });
  }
  const view = div().append(bar, page);
  const select = (name) => {
    const index = entries.findIndex(([entry]) => entry === name);
    if (index >= 0)
      render(index);
  };
  render();
  return Object.assign(view, { select });
}

// editView.ts
function editView(rows, cols, highlighter, onChange) {
  const cursor2 = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } };
  function setCursor(pos) {
    cursor2.start = { ...pos };
    cursor2.end = { ...pos };
  }
  let lines = [""];
  let editable = true;
  function moveCursorX(delta) {
    if (delta < 0) {
      if (cursor2.start.col > 0)
        return setCursor({ line: cursor2.start.line, col: Math.max(0, cursor2.start.col + delta) });
      if (cursor2.start.line == 0)
        return;
      return setCursor({ line: cursor2.start.line - 1, col: lines[cursor2.start.line - 1].length });
    }
    if (cursor2.start.col == lines[cursor2.start.line].length) {
      if (cursor2.start.line == lines.length - 1)
        return;
      return setCursor({ line: cursor2.start.line + 1, col: 0 });
    }
    setCursor({ line: cursor2.start.line, col: Math.min(cursor2.start.col + delta, lines[cursor2.start.line].length) });
  }
  function moveCursorY(delta) {
    setCursor({ line: Math.max(0, Math.min(lines.length - 1, cursor2.start.line + delta)), col: cursor2.start.col });
  }
  function deleteText(n = 1) {
    insertText([""]);
    if (cursor2.start.col > 0) {
      lines[cursor2.start.line] = lines[cursor2.start.line].slice(0, cursor2.start.col - n) + lines[cursor2.start.line].slice(cursor2.start.col);
      setCursor({ line: cursor2.start.line, col: cursor2.start.col - n });
    } else {
      if (cursor2.start.line > 0) {
        const prevLineLength = lines[cursor2.start.line - 1].length;
        lines[cursor2.start.line - 1] += lines[cursor2.start.line];
        lines.splice(cursor2.start.line, 1);
        setCursor({ line: cursor2.start.line - 1, col: prevLineLength });
      }
    }
    onTextChange();
  }
  function insertText(t) {
    if (t.length == 0)
      throw Error("no empty insert");
    t[0] = lines[cursor2.start.line].slice(0, cursor2.start.col) + t[0];
    let cur = { line: cursor2.start.line + t.length - 1, col: t[t.length - 1].length };
    t[t.length - 1] = t[t.length - 1] + lines[cursor2.start.line].slice(cursor2.start.col);
    lines = [
      ...lines.slice(0, cursor2.start.line),
      ...t,
      ...lines.slice(cursor2.start.line + 1)
    ];
    setCursor(cur);
    onTextChange();
  }
  document.addEventListener("keydown", (e) => {
    if (!editable)
      return;
    if (e.key.length == 1)
      insertText([e.key]);
    if (e.key == "Enter" && !e.metaKey) {
      insertText(["", ""]);
    }
    if (e.key == "Backspace") {
      deleteText(e.metaKey ? cursor2.start.col : 1);
      onTextChange();
    }
    if (e.key.startsWith("Arrow")) {
      if (e.metaKey)
        e.preventDefault();
      if (e.key == "ArrowLeft")
        moveCursorX(e.metaKey ? -Math.max(1, lines[cursor2.start.line].length) : -1);
      if (e.key == "ArrowRight")
        moveCursorX(e.metaKey ? lines[cursor2.start.line].length : 1);
      if (e.key == "ArrowUp")
        moveCursorY(e.metaKey ? cursor2.start.line : -1);
      if (e.key == "ArrowDown")
        moveCursorY(e.metaKey ? cursor2.start.line : 1);
      render();
    }
  });
  let main = pre().style({
    margin: "0",
    width: `${cols}ch`,
    height: `${rows}em`,
    padding: "1em",
    overflow: "auto"
  });
  main.view.onclick = (e) => {
    if (e.target === main.view)
      setCursor({ line: lines.length - 1, col: lines[lines.length - 1].length });
    render();
  };
  let colorMap = [];
  function onTextChange() {
    if (highlighter)
      colorMap = highlighter(lines);
    render();
    onChange?.([...lines]);
  }
  function render() {
    let lineEls = lines.map((line, no) => {
      let chars = line.split("").concat([" "]).map((char, col) => {
        let cidx = colorMap[no]?.[col] ?? 0;
        let color = palette.colors[cidx % palette.colors.length];
        let el = span(char).style({ color });
        el.view.onclick = () => {
          setCursor({ line: no, col });
          render();
        };
        if (cursor2.start.line == no && Math.min(line.length, cursor2.start.col) == col)
          el.style({ background: palette.accent, width: "1ch" });
        return el;
      });
      let lineEl = div(span(no.toString().padStart(3, " ") + " ").style({ color: palette.hint }), ...chars);
      lineEl.view.onclick = (e) => {
        if (e.target === lineEl.view)
          setCursor({ line: no, col: line.length });
        render();
      };
      return lineEl;
    });
    main.replaceChildren(...lineEls);
  }
  insertText(["import Base", "", "def main() -> Nat:", "  0n"]);
  return {
    view: main,
    setText: (text) => {
      lines = [...text];
      setCursor({ line: 0, col: 0 });
      if (highlighter)
        colorMap = highlighter(lines);
      render();
    },
    getText: () => [...lines],
    setEditable: (value) => {
      editable = value;
      main.style({ opacity: value ? "1" : ".85" });
    }
  };
}

// hub.ts
var HUB_ORIGIN = "https://hub.bend-lang.com";
var HASH = /^0x[0-9a-f]{32}$/;
async function fetchHubIndex() {
  const response = await fetch(`${HUB_ORIGIN}/index.json`);
  if (!response.ok)
    throw new Error(`Bend Hub answered ${response.status}`);
  const packages = await response.json();
  return packages.filter((pkg) => HASH.test(pkg.hash) && pkg.files !== null);
}
async function fetchHubFile(hash, path) {
  if (!HASH.test(hash) || path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error("Invalid Bend Hub file path");
  }
  const response = await fetch(`${HUB_ORIGIN}/${hash}/${path}`);
  if (!response.ok)
    throw new Error(`Bend Hub answered ${response.status}`);
  return response.text();
}
function formatBytes(bytes) {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// main.ts
var STORAGE_KEY = "bend-editor.project.v1";
var DEFAULT_PROJECT = {
  entry: "main.bend",
  files: {
    "main.bend": `import Base

def main() -> Nat:
  0n`,
    "foo.bend": `import Base

def foo() -> Nat:
  22n`
  }
};
function loadProject() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (value && typeof value.entry === "string" && value.files && value.entry in value.files)
      return value;
  } catch {}
  return { entry: DEFAULT_PROJECT.entry, files: { ...DEFAULT_PROJECT.files } };
}
function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}
function smallButton(label, action) {
  const button = elFromTag("button").append(label).style({
    background: "transparent",
    border: `1px solid ${palette.hint}`,
    borderRadius: "3px",
    color: palette.text,
    cursor: "pointer",
    font: "inherit",
    marginLeft: ".5em"
  });
  button.view.onclick = (event) => {
    event.stopPropagation();
    action();
  };
  return button;
}
var project = loadProject();
var activeDocument;
var runInitiated = false;
var editor = editView(40, 80, highlightBend, (lines) => {
  if (activeDocument?.kind === "project") {
    project.files[activeDocument.path] = lines.join(`
`);
    saveProject();
  }
  runInitiated = false;
});
var output = pre().style({
  boxSizing: "border-box",
  margin: "0",
  overflow: "auto",
  padding: "1em",
  whiteSpace: "pre-wrap"
});
var worker;
var runNumber = 0;
var timeout;
function finish(text) {
  if (timeout !== undefined)
    clearTimeout(timeout);
  timeout = undefined;
  worker?.terminate();
  worker = undefined;
  output.replaceChildren(text);
}
function run() {
  worker?.terminate();
  const id = ++runNumber;
  output.replaceChildren("Checking…");
  worker = new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (event) => {
    if (event.data.id === id)
      finish(event.data.output);
  };
  worker.onerror = (event) => finish(`Worker error: ${event.message}`);
  worker.postMessage({ id, entry: project.entry, files: project.files });
  timeout = setTimeout(() => finish("Execution stopped after 5 seconds."), 5000);
}
var documentName = span().style({ color: palette.colors[4], marginLeft: "1em" });
var head = div(h1(link("bend2", "https://bend-lang.org/").style({ textDecoration: "none" }), cursor).style({ display: "flex", alignItems: "center" }), documentName).style({ display: "flex", alignItems: "center" });
function openProjectFile(path, showEditor = true) {
  const source = project.files[path];
  if (source === undefined)
    return;
  activeDocument = { kind: "project", path };
  documentName.replaceChildren(path === project.entry ? `${path} (entry)` : path);
  editor.setEditable(true);
  editor.setText(source.split(`
`));
  runInitiated = false;
  renderProjectFiles();
  if (showEditor)
    tabs.select("editor");
}
function validProjectPath(path) {
  return path.endsWith(".bend") && !path.startsWith("/") && !path.split("/").some((part) => part === "" || part === "." || part === "..");
}
function newProjectFile() {
  const path = prompt("New project file", "module.bend")?.trim();
  if (!path)
    return;
  if (!validProjectPath(path))
    return alert("Use a relative path ending in .bend");
  if (project.files[path] !== undefined)
    return alert(`${path} already exists`);
  project.files[path] = `import Base
`;
  saveProject();
  openProjectFile(path);
}
function importHubFile(pkg, path) {
  if (!path.endsWith(".bend"))
    return;
  const target = project.entry;
  const lines = project.files[target].split(`
`);
  const stem = path.split("/").at(-1).replace(/\.bend$/, "").replace(/[^A-Za-z0-9_]/g, "_");
  let alias = stem.charAt(0).toUpperCase() + stem.slice(1) || "Package";
  if (!/^[A-Za-z_]/.test(alias))
    alias = "P_" + alias;
  if (lines.some((line) => new RegExp(`\\sas\\s+${alias}\\s*(?:#.*)?$`).test(line))) {
    alias += "_" + pkg.hash.slice(2, 6);
  }
  const statement = `import ${pkg.hash}/${path} as ${alias}`;
  if (!lines.includes(statement)) {
    let at = 0;
    while (at < lines.length && (/^\s*(?:#.*)?$/.test(lines[at]) || /^\s*import\s/.test(lines[at])))
      at += 1;
    lines.splice(at, 0, statement);
    project.files[target] = lines.join(`
`);
    saveProject();
  }
  openProjectFile(target);
}
var projectFiles = div();
function renderProjectFiles() {
  projectFiles.replaceChildren(...Object.keys(project.files).sort().map((path) => {
    const selected = activeDocument?.kind === "project" && activeDocument.path === path;
    const row = div((path === project.entry ? "◆ " : "  ") + path).style({
      background: selected ? palette.hint : "transparent",
      cursor: "pointer",
      padding: ".15em .4em"
    });
    row.view.onclick = () => openProjectFile(path);
    return row;
  }));
}
var hubPackages;
var hubError = "";
var expandedPackage;
var hubResults = div();
var hubSearch = elFromTag("input").assignProperties({
  placeholder: "search descriptions, files or hashes",
  spellcheck: false
}).style({
  background: "transparent",
  border: `1px solid ${palette.hint}`,
  boxSizing: "border-box",
  color: palette.text,
  font: "inherit",
  margin: ".5em 0",
  padding: ".4em",
  width: "100%"
});
hubSearch.view.oninput = () => renderHubPackages();
function renderHubPackages() {
  if (hubError) {
    hubResults.replaceChildren(hubError);
    return;
  }
  if (hubPackages === undefined) {
    hubResults.replaceChildren("Loading Bend Hub…");
    return;
  }
  const query = hubSearch.view.value.trim().toLowerCase();
  const packages = hubPackages.filter((pkg) => !query || pkg.hash.includes(query) || pkg.desc.toLowerCase().includes(query) || Object.keys(pkg.files).some((path) => path.toLowerCase().includes(query))).slice(0, 30);
  hubResults.replaceChildren(...packages.map((pkg) => {
    const open = expandedPackage === pkg.hash;
    const title = div(span((open ? "▾ " : "▸ ") + (pkg.desc || pkg.hash)), span(` ${Object.keys(pkg.files).length} files · ${formatBytes(pkg.bytes)}`).style({ color: palette.colors[4], fontSize: ".85em" })).style({ cursor: "pointer", padding: ".3em 0" });
    title.view.onclick = () => {
      expandedPackage = open ? undefined : pkg.hash;
      renderHubPackages();
    };
    if (!open)
      return div(title);
    const fileRows = Object.entries(pkg.files).map(([path, bytes]) => {
      const row = div(span(`${path}  ${formatBytes(bytes)}`), smallButton("view", () => void openHubFile(pkg, path)), ...path.endsWith(".bend") ? [smallButton("import", () => importHubFile(pkg, path))] : []).style({ padding: ".15em 0 .15em 1.5em" });
      return row;
    });
    return div(title, ...fileRows, div(link("open package on hub", `${HUB_ORIGIN}/${pkg.hash}`)).style({ paddingLeft: "1.5em" }));
  }));
}
async function loadHub() {
  if (hubPackages !== undefined)
    return;
  renderHubPackages();
  try {
    hubPackages = await fetchHubIndex();
  } catch (error) {
    hubError = String(error);
  }
  renderHubPackages();
}
async function openHubFile(pkg, path) {
  documentName.replaceChildren(`${pkg.hash.slice(0, 10)}…/${path} (read only)`);
  editor.setEditable(false);
  editor.setText(["Loading from Bend Hub…"]);
  activeDocument = { kind: "hub", hash: pkg.hash, path };
  tabs.select("editor");
  try {
    const source = await fetchHubFile(pkg.hash, path);
    if (activeDocument.kind === "hub" && activeDocument.hash === pkg.hash && activeDocument.path === path) {
      editor.setText(source.split(`
`));
    }
  } catch (error) {
    editor.setText([String(error)]);
  }
}
var explorer = div(h2("Project", smallButton("+ file", newProjectFile)), projectFiles, h2("Bend Hub"), hubSearch, hubResults).style({ padding: "1em" });
var tabs = navbar({
  explorer: () => {
    renderProjectFiles();
    loadHub();
    return explorer;
  },
  editor: () => editor.view,
  output: () => {
    if (!runInitiated) {
      output.replaceChildren(p("Checking…"));
      runInitiated = true;
      run();
    }
    return output;
  },
  about: () => div(p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."), p("say hi: ", link("contact", "https://x.com/dogecahedron"))).style({ padding: "1em" })
});
openProjectFile(project.entry, false);
body.append(head, tabs);

//# debugId=BA13D2F85A58510C64756E2164756E21
//# sourceMappingURL=main.js.map
