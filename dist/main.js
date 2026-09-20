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
var table = tagger("table");
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
      render(selection == 1 ? 2 : 1);
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
function niceTable(items) {
  return div(table(...items.map((row, i) => {
    return elFromTag("tr").append(...row.map((cell) => elFromTag(i == 0 ? "th" : "td").append(cell).style({
      border: `1px solid ${palette.hint}`,
      padding: ".2em .5em"
    })));
  })).style({
    borderCollapse: "collapse",
    width: "100%",
    textAlign: "left",
    border: `2px solid ${palette.hint}`,
    overflow: "hidden"
  })).style({
    border: `1px solid ${palette.hint}`,
    borderRadius: "6px",
    overflow: "hidden"
  });
}

// editView.ts
function editView(rows, cols, highlighter, onChange) {
  const cursor2 = {
    start: { line: 0, col: 0 },
    end: { line: 0, col: 0 }
  };
  let lines = [""];
  let editable = true;
  let dragging = false;
  let definitionHandler;
  let typeHandler;
  let typeLeaveHandler;
  const samePos = (a, b) => a.line === b.line && a.col === b.col;
  const before = (a, b) => a.line < b.line || a.line === b.line && a.col < b.col;
  function clamp(value) {
    const line = Math.max(0, Math.min(lines.length - 1, value.line));
    return { line, col: Math.max(0, Math.min(lines[line].length, value.col)) };
  }
  function setCursor(value) {
    const at = clamp(value);
    cursor2.start = { ...at };
    cursor2.end = { ...at };
  }
  function moveCursor(value, extend = false) {
    const at = clamp(value);
    if (!extend)
      cursor2.start = { ...at };
    cursor2.end = { ...at };
  }
  function selection() {
    return before(cursor2.end, cursor2.start) ? { from: cursor2.end, to: cursor2.start } : { from: cursor2.start, to: cursor2.end };
  }
  function hasSelection() {
    return !samePos(cursor2.start, cursor2.end);
  }
  function selectedText() {
    if (!hasSelection())
      return "";
    const { from, to } = selection();
    if (from.line === to.line)
      return lines[from.line].slice(from.col, to.col);
    return [
      lines[from.line].slice(from.col),
      ...lines.slice(from.line + 1, to.line),
      lines[to.line].slice(0, to.col)
    ].join(`
`);
  }
  function isSelected(line, col) {
    if (!hasSelection())
      return false;
    const { from, to } = selection();
    if (line < from.line || line > to.line)
      return false;
    if (from.line === to.line)
      return col >= from.col && col < to.col;
    if (line === from.line)
      return col >= from.col;
    if (line === to.line)
      return col < to.col;
    return true;
  }
  function deleteSelection() {
    if (!hasSelection())
      return false;
    const { from, to } = selection();
    const joined = lines[from.line].slice(0, from.col) + lines[to.line].slice(to.col);
    lines.splice(from.line, to.line - from.line + 1, joined);
    setCursor(from);
    return true;
  }
  function definitionAt(value) {
    const line = lines[value.line] ?? "";
    const isName = (char) => /[A-Za-z0-9_.$]/.test(char);
    let start = Math.min(value.col, Math.max(0, line.length - 1));
    if (!isName(line[start] ?? ""))
      return;
    let end = start + 1;
    while (start > 0 && isName(line[start - 1]))
      start -= 1;
    while (end < line.length && isName(line[end]))
      end += 1;
    return { line: value.line, col: start, token: line.slice(start, end) };
  }
  function requestDefinition(value) {
    const request = definitionAt(value);
    if (request)
      definitionHandler?.(request);
  }
  function insertText(input) {
    if (input.length === 0)
      return;
    const text = [...input];
    deleteSelection();
    const at = cursor2.end;
    text[0] = lines[at.line].slice(0, at.col) + text[0];
    const next = { line: at.line + text.length - 1, col: text[text.length - 1].length };
    text[text.length - 1] += lines[at.line].slice(at.col);
    lines.splice(at.line, 1, ...text);
    setCursor(next);
    onTextChange();
  }
  function deleteBackward(toLineStart = false) {
    if (deleteSelection())
      return onTextChange();
    const at = cursor2.end;
    if (at.col > 0) {
      const count = toLineStart ? at.col : 1;
      lines[at.line] = lines[at.line].slice(0, at.col - count) + lines[at.line].slice(at.col);
      setCursor({ line: at.line, col: at.col - count });
    } else if (at.line > 0) {
      const col = lines[at.line - 1].length;
      lines[at.line - 1] += lines[at.line];
      lines.splice(at.line, 1);
      setCursor({ line: at.line - 1, col });
    } else
      return;
    onTextChange();
  }
  function deleteForward() {
    if (deleteSelection())
      return onTextChange();
    const at = cursor2.end;
    if (at.col < lines[at.line].length) {
      lines[at.line] = lines[at.line].slice(0, at.col) + lines[at.line].slice(at.col + 1);
    } else if (at.line < lines.length - 1) {
      lines[at.line] += lines[at.line + 1];
      lines.splice(at.line + 1, 1);
    } else
      return;
    onTextChange();
  }
  function horizontal(value, delta) {
    if (delta < 0) {
      if (value.col > 0)
        return { line: value.line, col: value.col - 1 };
      if (value.line > 0)
        return { line: value.line - 1, col: lines[value.line - 1].length };
      return value;
    }
    if (value.col < lines[value.line].length)
      return { line: value.line, col: value.col + 1 };
    if (value.line < lines.length - 1)
      return { line: value.line + 1, col: 0 };
    return value;
  }
  function toggleComments() {
    const range = selection();
    const first = hasSelection() ? range.from.line : cursor2.end.line;
    let last = hasSelection() ? range.to.line : cursor2.end.line;
    if (hasSelection() && range.to.col === 0 && last > first)
      last -= 1;
    const affected = Array.from({ length: last - first + 1 }, (_, index) => first + index).filter((line) => lines[line].trim().length > 0);
    if (affected.length === 0)
      return;
    const uncomment = affected.every((line) => /^\s*#/.test(lines[line]));
    const changes = new Map;
    for (const line of affected) {
      const source = lines[line];
      const indent = source.match(/^\s*/)?.[0].length ?? 0;
      if (uncomment) {
        const remove = source[indent + 1] === " " ? 2 : 1;
        lines[line] = source.slice(0, indent) + source.slice(indent + remove);
        changes.set(line, { at: indent, added: 0, removed: remove });
      } else {
        lines[line] = source.slice(0, indent) + "# " + source.slice(indent);
        changes.set(line, { at: indent, added: 2, removed: 0 });
      }
    }
    const adjust = (value) => {
      const change = changes.get(value.line);
      if (change === undefined || value.col <= change.at)
        return { ...value };
      if (change.added > 0)
        return { line: value.line, col: value.col + change.added };
      return {
        line: value.line,
        col: value.col <= change.at + change.removed ? change.at : value.col - change.removed
      };
    };
    cursor2.start = adjust(cursor2.start);
    cursor2.end = adjust(cursor2.end);
    onTextChange();
  }
  document.addEventListener("keydown", (event) => {
    if (document.activeElement !== main.view)
      return;
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === "F12") {
      event.preventDefault();
      requestDefinition(cursor2.end);
      return;
    }
    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      cursor2.start = { line: 0, col: 0 };
      cursor2.end = { line: lines.length - 1, col: lines.at(-1).length };
      return render();
    }
    if (mod && event.key === "/") {
      event.preventDefault();
      if (editable)
        toggleComments();
      return;
    }
    if (!editable)
      return;
    if (event.key.length === 1 && !mod) {
      event.preventDefault();
      return insertText([event.key]);
    }
    if (event.key === "Enter" && !event.metaKey) {
      event.preventDefault();
      return insertText(["", ""]);
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      return deleteBackward(mod);
    }
    if (event.key === "Delete") {
      event.preventDefault();
      return deleteForward();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (hasSelection() && !event.shiftKey && !mod) {
        return setCursor(event.key === "ArrowLeft" ? selection().from : selection().to), render();
      }
      const target = mod ? { line: cursor2.end.line, col: event.key === "ArrowLeft" ? 0 : lines[cursor2.end.line].length } : horizontal(cursor2.end, event.key === "ArrowLeft" ? -1 : 1);
      moveCursor(target, event.shiftKey);
      return render();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? -1 : 1;
      const target = mod ? { line: delta < 0 ? 0 : lines.length - 1, col: cursor2.end.col } : { line: cursor2.end.line + delta, col: cursor2.end.col };
      moveCursor(target, event.shiftKey);
      return render();
    }
  });
  document.addEventListener("copy", (event) => {
    if (document.activeElement !== main.view || !hasSelection())
      return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", selectedText());
  });
  document.addEventListener("cut", (event) => {
    if (document.activeElement !== main.view || !editable || !hasSelection())
      return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", selectedText());
    deleteSelection();
    onTextChange();
  });
  document.addEventListener("paste", (event) => {
    if (document.activeElement !== main.view || !editable)
      return;
    const text = event.clipboardData?.getData("text/plain");
    if (text === undefined)
      return;
    event.preventDefault();
    insertText(text.replace(/\r\n?/g, `
`).split(`
`));
  });
  document.addEventListener("mouseup", () => {
    dragging = false;
  });
  const main = pre().style({
    margin: "0",
    width: `${cols}ch`,
    height: `${rows}em`,
    padding: "1em",
    overflow: "auto",
    outline: "none",
    userSelect: "none"
  });
  main.view.tabIndex = 0;
  function pointerPosition(target) {
    const element = target;
    if (element === main.view) {
      return { line: lines.length - 1, col: lines.at(-1).length };
    }
    const line = Number(element?.dataset.line);
    const col = Number(element?.dataset.col);
    return Number.isInteger(line) && Number.isInteger(col) ? { line, col } : undefined;
  }
  main.view.onmousedown = (event) => {
    if (event.target !== main.view)
      return;
    event.preventDefault();
    main.view.focus();
    const at = pointerPosition(event.target);
    if (event.shiftKey)
      moveCursor(at, true);
    else
      setCursor(at);
    dragging = true;
    render();
  };
  main.view.onmousemove = (event) => {
    if (!dragging)
      return;
    const at = pointerPosition(event.target);
    if (at) {
      moveCursor(at, true);
      render();
    }
  };
  let colorMap = [];
  function onTextChange() {
    if (highlighter)
      colorMap = highlighter(lines);
    render();
    onChange?.([...lines]);
  }
  function render() {
    const lineEls = lines.map((line, no) => {
      const chars = line.split("").concat([" "]).map((char, col) => {
        const cidx = colorMap[no]?.[col] ?? 0;
        const el = span(char).style({ color: palette.colors[cidx % palette.colors.length] });
        el.view.dataset.line = String(no);
        el.view.dataset.col = String(col);
        el.view.onmousedown = (event) => {
          event.preventDefault();
          main.view.focus();
          if (event.metaKey || event.ctrlKey) {
            setCursor({ line: no, col });
            requestDefinition({ line: no, col });
          } else {
            if (event.shiftKey)
              moveCursor({ line: no, col }, true);
            else
              setCursor({ line: no, col });
            dragging = true;
          }
          render();
        };
        el.view.onmouseenter = () => {
          if (dragging)
            return;
          const request = definitionAt({ line: no, col });
          if (request)
            typeHandler?.(request, el.view);
        };
        el.view.onmouseleave = () => typeLeaveHandler?.();
        if (isSelected(no, col)) {
          el.style({ background: palette.hint });
        } else if (!hasSelection() && samePos(cursor2.end, { line: no, col })) {
          el.style({ background: palette.accent, width: "1ch" });
        }
        return el;
      });
      const number = span(no.toString().padStart(3, " ") + " ").style({ color: palette.hint });
      const lineEl = div(number, ...chars);
      lineEl.view.dataset.line = String(no);
      lineEl.view.dataset.col = String(line.length);
      lineEl.view.onmousedown = (event) => {
        if (event.target !== lineEl.view)
          return;
        event.preventDefault();
        main.view.focus();
        const at = { line: no, col: line.length };
        if (event.shiftKey)
          moveCursor(at, true);
        else
          setCursor(at);
        dragging = true;
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
      lines = text.length === 0 ? [""] : [...text];
      setCursor({ line: 0, col: 0 });
      if (highlighter)
        colorMap = highlighter(lines);
      render();
    },
    getText: () => [...lines],
    setEditable: (value) => {
      editable = value;
      main.style({ opacity: value ? "1" : ".85" });
    },
    setDefinitionHandler: (handler) => {
      definitionHandler = handler;
    },
    setTypeHandler: (handler, leave) => {
      typeHandler = handler;
      typeLeaveHandler = leave;
    },
    goTo: (line, col) => {
      setCursor({ line, col });
      render();
      requestAnimationFrame(() => main.view.children.item(cursor2.end.line)?.scrollIntoView({ block: "center" }));
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
import ./foo.bend as foo

def main() -> Nat:
  foo.foo`,
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
var typeCache = new Map;
var editor = editView(40, 80, highlightBend, (lines) => {
  if (activeDocument?.kind === "project") {
    project.files[activeDocument.path] = lines.join(`
`);
    saveProject();
  }
  typeCache.clear();
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
  worker.postMessage({ kind: "run", id, entry: project.entry, files: project.files });
  timeout = setTimeout(() => finish("Execution stopped after 5 seconds."), 5000);
}
var documentName = span().style({ color: palette.colors[4], marginLeft: "1em" });
var definitionStatus = span().style({ color: palette.colors[3], marginLeft: "1em" });
var typePreview = pre().style({
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
  zIndex: "10"
});
var head = div(h1(link("bend2", "https://bend-lang.org/").style({ textDecoration: "none" }), cursor).style({ display: "flex", alignItems: "center" }), documentName, definitionStatus).style({ display: "flex", alignItems: "center" });
function openProjectFile(path, showEditor = true) {
  const source = project.files[path];
  if (source === undefined)
    return;
  activeDocument = { kind: "project", path };
  definitionStatus.replaceChildren();
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
  await showHubFile(pkg.hash, path);
}
async function showHubFile(hash, path, line = 0, col = 0) {
  definitionStatus.replaceChildren();
  documentName.replaceChildren(`${hash.slice(0, 10)}…/${path} (read only)`);
  editor.setEditable(false);
  editor.setText(["Loading from Bend Hub…"]);
  activeDocument = { kind: "hub", hash, path };
  tabs.select("editor");
  try {
    const source = await fetchHubFile(hash, path);
    if (activeDocument.kind === "hub" && activeDocument.hash === hash && activeDocument.path === path) {
      editor.setText(source.split(`
`));
      editor.goTo(line, col);
    }
  } catch (error) {
    editor.setText([String(error)]);
  }
}
function relativePath(from, target) {
  const parts = from.split("/").slice(0, -1).concat(target.split("/"));
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".")
      continue;
    if (part === "..") {
      if (out.length === 0)
        return;
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out.join("/");
}
function definitionIn(source, symbol) {
  if (!symbol)
    return { line: 0, col: 0 };
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const top = new RegExp(`^\\s*(?:@unsafe\\s+)?(?:def|law|type)\\s+${escaped}(?=\\s|\\(|<|:)`);
  const constructor = new RegExp(`^\\s+${escaped}(?=\\s*(?:<[^>]*>)?\\{)`);
  const lines = source.split(`
`);
  for (let line = 0;line < lines.length; line += 1) {
    if (top.test(lines[line]) || constructor.test(lines[line])) {
      return { line, col: Math.max(0, lines[line].indexOf(symbol)) };
    }
  }
  return;
}
var typeWorker;
var typeSequence = 0;
var typeTimer;
var pendingTypes = new Map;
function typeKey(document2, token) {
  return document2.kind === "project" ? `project:${document2.path}:${token}` : `hub:${document2.hash}/${document2.path}:${token}`;
}
function showTypePreview(text, target) {
  const rect = target.getBoundingClientRect();
  typePreview.replaceChildren(text).style({
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.bottom + 6}px`
  });
  const preview = typePreview.view.getBoundingClientRect();
  if (preview.right > innerWidth - 8) {
    typePreview.style({ left: `${Math.max(8, innerWidth - preview.width - 8)}px` });
  }
}
function hideTypePreview() {
  if (typeTimer !== undefined)
    clearTimeout(typeTimer);
  typeTimer = undefined;
  typeSequence += 1;
  typePreview.style({ display: "none" });
}
function requestTypePreview(request, target) {
  if (typeTimer !== undefined)
    clearTimeout(typeTimer);
  const document2 = activeDocument;
  if (document2 === undefined)
    return;
  const key = typeKey(document2, request.token);
  const cached = typeCache.get(key);
  if (cached !== undefined) {
    showTypePreview(cached, target);
    return;
  }
  const id = ++typeSequence;
  typeTimer = setTimeout(() => {
    typeWorker ??= new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
    typeWorker.onmessage = (event) => {
      if (event.data.kind !== "type")
        return;
      const pending = pendingTypes.get(event.data.id);
      pendingTypes.delete(event.data.id);
      if (pending === undefined || event.data.type === undefined)
        return;
      typeCache.set(pending.key, event.data.type);
      if (event.data.id === typeSequence)
        showTypePreview(event.data.type, pending.target);
    };
    pendingTypes.set(id, { key, target });
    typeWorker.postMessage({
      kind: "type",
      id,
      files: project.files,
      document: document2,
      token: request.token
    });
  }, 180);
}
async function jumpToDefinition(request) {
  const current = activeDocument;
  if (current === undefined)
    return;
  const source = editor.getText().join(`
`);
  const [prefix, ...rest] = request.token.split(".");
  const imports = [...source.matchAll(/^\s*import\s+(\S+)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/gm)];
  const imported = imports.find((match) => match[2] === prefix);
  let symbol = request.token;
  let target = current;
  let targetSource = source;
  if (imported !== undefined) {
    const specifier = imported[1];
    symbol = rest.join(".");
    const remote = /^(0x[0-9a-f]{32})\/(.+)$/.exec(specifier);
    if (remote) {
      target = { kind: "hub", hash: remote[1], path: remote[2] };
      targetSource = await fetchHubFile(remote[1], remote[2]);
    } else if (current.kind === "hub") {
      const path = relativePath(current.path, specifier);
      if (path === undefined)
        return;
      target = { kind: "hub", hash: current.hash, path };
      targetSource = await fetchHubFile(current.hash, path);
    } else {
      const path = relativePath(current.path, specifier);
      if (path === undefined || project.files[path] === undefined)
        return;
      target = { kind: "project", path };
      targetSource = project.files[path];
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
  about: () => div(p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."), p("say hi: ", link("contact", "https://x.com/dogecahedron")), p("source: ", link("github", "https://github.com/DKormann/bend-editor")), h3("shortcuts"), niceTable([
    ["Shortcut", "Action"],
    ["Cmd + Enter", "toggle editor / output"],
    ["Cmd + Click", "jump to definition"],
    ["Cmd + /", "toggle comment"]
  ])).style({ padding: "1em" })
});
editor.setDefinitionHandler((request) => {
  jumpToDefinition(request).catch((error) => {
    definitionStatus.replaceChildren(String(error));
  });
});
editor.setTypeHandler(requestTypePreview, hideTypePreview);
openProjectFile(project.entry, false);
body.append(head, tabs, typePreview);

//# debugId=C04C62AB1D38370B64756E2164756E21
//# sourceMappingURL=main.js.map
